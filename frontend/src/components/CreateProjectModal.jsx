import { useState } from "react";
import { Plus, Loader2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useStore } from "../store/useStore";
import { btn, field, label } from "../lib/styles";
import { errorMessage } from "../lib/format";
import { toast } from "../lib/toast";

const EMPTY = { projectName: "", projectDescription: "", priority: "Medium", budget: "", projectType: "Software", startDate: "", endDate: "" };

export const CreateProjectModal = ({ api }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const { addProject, user } = useStore();

    const [formData, setFormData] = useState(EMPTY);
    const update = (key) => (e) => setFormData({ ...formData, [key]: e.target.value });
    const datesInvalid = formData.startDate && formData.endDate && formData.endDate < formData.startDate;

    const handleOpenChange = (open) => {
        setIsOpen(open);
        if (!open) setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (datesInvalid) return;
        setLoading(true);
        setError("");
        try {
            const res = await api.post("/projects", { ...formData, projectName: formData.projectName.trim() });
            const project = res.data.project;
            // The create endpoint returns raw ids; hydrate the manager so the card shows a name right away.
            if (project && typeof project.projectManager !== "object") {
                project.projectManager = { _id: user._id, fullName: user.fullName, profilePicture: user.profilePicture };
            }
            addProject(project);
            setIsOpen(false);
            setFormData(EMPTY);
            toast.success("Project created", project.projectName);
        } catch (err) {
            setError(errorMessage(err, "Couldn't create the project. Please try again."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <button className={btn.primary}>
                    <Plus size={18} aria-hidden="true" />
                    New project
                </button>
            </DialogTrigger>

            <DialogContent className="gap-0 p-0 sm:max-w-lg">
                <div className="border-b border-gray-200 p-6 pr-14">
                    <DialogTitle className="text-lg font-semibold text-gray-900">New project</DialogTitle>
                    <DialogDescription className="mt-1 text-sm text-gray-600">You'll be the project manager. Add team members after it's created.</DialogDescription>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 p-6">
                    {error && (
                        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> {error}
                        </div>
                    )}
                    <div>
                        <label htmlFor="projectName" className={label}>Project name</label>
                        <input id="projectName" required maxLength={120} className={field} placeholder="e.g. Alpha release" value={formData.projectName} onChange={update("projectName")} />
                    </div>

                    <div>
                        <label htmlFor="projectDescription" className={label}>Description</label>
                        <textarea
                            id="projectDescription"
                            required
                            rows={3}
                            maxLength={2000}
                            className={`${field} h-auto min-h-24 py-2`}
                            placeholder="What is the main goal of this project?"
                            value={formData.projectDescription}
                            onChange={update("projectDescription")}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="budget" className={label}>Budget (USD)</label>
                            <input id="budget" type="number" min={0} step="1" inputMode="numeric" required className={`${field} tabular`} placeholder="5000" value={formData.budget} onChange={update("budget")} />
                        </div>
                        <div>
                            <label htmlFor="priority" className={label}>Priority</label>
                            <select id="priority" className={field} value={formData.priority} onChange={update("priority")}>
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Critical">Critical</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="startDate" className={label}>Start date</label>
                            <input id="startDate" type="date" className={field} value={formData.startDate} onChange={update("startDate")} />
                        </div>
                        <div>
                            <label htmlFor="endDate" className={label}>End date</label>
                            <input
                                id="endDate"
                                type="date"
                                min={formData.startDate || undefined}
                                aria-invalid={datesInvalid || undefined}
                                aria-describedby={datesInvalid ? "endDate-error" : undefined}
                                className={field}
                                value={formData.endDate}
                                onChange={update("endDate")}
                            />
                            {datesInvalid && <p id="endDate-error" className="mt-1.5 text-xs text-red-700">End date must be on or after the start date.</p>}
                        </div>
                    </div>

                    <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
                        <button type="button" onClick={() => handleOpenChange(false)} className={btn.ghost}>Cancel</button>
                        <button type="submit" disabled={loading || datesInvalid} className={btn.primary}>
                            {loading ? <><Loader2 className="animate-spin" size={16} aria-hidden="true" /> Creating…</> : "Create project"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
