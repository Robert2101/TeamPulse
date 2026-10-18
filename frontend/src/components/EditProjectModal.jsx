import { useState } from "react";
import { Settings, Loader2, Trash2, AlertTriangle, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { btn, field, label } from "../lib/styles";
import { errorMessage } from "../lib/format";
import { toast } from "../lib/toast";

const toDateInput = (value) => (value ? new Date(value).toISOString().split("T")[0] : "");

const fromProject = (project) => ({
    projectName: project.projectName || "",
    projectDescription: project.projectDescription || "",
    projectStatus: project.projectStatus || "Active",
    priority: project.priority || "Medium",
    budget: project.budget ?? 0,
    startDate: toDateInput(project.startDate),
    endDate: toDateInput(project.endDate),
});

export const EditProjectModal = ({ api, project, onProjectUpdated }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState("");
    const { removeProject, updateProjectInStore } = useStore();
    const navigate = useNavigate();

    const [formData, setFormData] = useState(() => fromProject(project));
    const update = (key) => (e) => setFormData({ ...formData, [key]: e.target.value });
    const datesInvalid = formData.startDate && formData.endDate && formData.endDate < formData.startDate;

    const handleOpenChange = (open) => {
        setIsOpen(open);
        // Re-sync with the latest project every time the dialog opens so edits never start from stale data.
        if (open) setFormData(fromProject(project));
        if (!open) { setConfirmDelete(false); setError(""); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (datesInvalid) return;
        setLoading(true);
        setError("");
        try {
            const res = await api.put(`/projects/${project._id}`, formData);
            onProjectUpdated(res.data.project);
            updateProjectInStore(res.data.project);
            setIsOpen(false);
            toast.success("Project updated");
        } catch (err) {
            setError(errorMessage(err, "Couldn't save the project. Please try again."));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setDeleteLoading(true);
        setError("");
        try {
            await api.delete(`/projects/${project._id}`);
            removeProject(project._id);
            setIsOpen(false);
            toast.success("Project deleted", project.projectName);
            navigate("/projects"); // Kick them back to the directory after deletion
        } catch (err) {
            setError(errorMessage(err, "Couldn't delete the project. Please try again."));
            setDeleteLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <button className={btn.secondary} aria-label="Project settings">
                    <Settings size={16} aria-hidden="true" /> <span className="hidden sm:inline">Settings</span>
                </button>
            </DialogTrigger>

            <DialogContent className="gap-0 p-0 sm:max-w-xl">
                <div className="border-b border-gray-200 p-6 pr-14">
                    <DialogTitle className="text-lg font-semibold text-gray-900">Project settings</DialogTitle>
                    <DialogDescription className="mt-1 text-sm text-gray-600">Changes are visible to everyone on the project.</DialogDescription>
                </div>

                <div className="p-6">
                    {error && (
                        <div role="alert" className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> {error}
                        </div>
                    )}
                    <form id="edit-project-form" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="edit-projectName" className={label}>Project name</label>
                            <input id="edit-projectName" required maxLength={120} className={field} value={formData.projectName} onChange={update("projectName")} />
                        </div>

                        <div>
                            <label htmlFor="edit-projectDescription" className={label}>Description</label>
                            <textarea id="edit-projectDescription" required rows={3} className={`${field} h-auto min-h-24 py-2`} value={formData.projectDescription} onChange={update("projectDescription")} />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="edit-projectStatus" className={label}>Status</label>
                                <select id="edit-projectStatus" className={field} value={formData.projectStatus} onChange={update("projectStatus")}>
                                    <option value="Planning">Planning</option>
                                    <option value="Active">Active</option>
                                    <option value="On Hold">On Hold</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="edit-priority" className={label}>Priority</label>
                                <select id="edit-priority" className={field} value={formData.priority} onChange={update("priority")}>
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                    <option value="Critical">Critical</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div>
                                <label htmlFor="edit-budget" className={label}>Budget (USD)</label>
                                <input id="edit-budget" type="number" min={0} inputMode="numeric" className={`${field} tabular`} value={formData.budget} onChange={update("budget")} />
                            </div>
                            <div>
                                <label htmlFor="edit-startDate" className={label}>Start date</label>
                                <input id="edit-startDate" type="date" className={field} value={formData.startDate} onChange={update("startDate")} />
                            </div>
                            <div>
                                <label htmlFor="edit-endDate" className={label}>End date</label>
                                <input id="edit-endDate" type="date" min={formData.startDate || undefined} aria-invalid={datesInvalid || undefined} className={field} value={formData.endDate} onChange={update("endDate")} />
                            </div>
                        </div>
                        {datesInvalid && <p className="text-xs text-red-700">End date must be on or after the start date.</p>}
                    </form>

                    {/* DANGER ZONE */}
                    <div className="mt-8 rounded-xl border border-red-200 bg-red-50/50 p-4">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-red-800">
                            <AlertTriangle size={16} aria-hidden="true" /> Delete project
                        </h3>
                        <p className="mt-1 text-sm text-gray-700">
                            Permanently deletes this project with all of its tasks and comments. This can't be undone.
                        </p>

                        {confirmDelete ? (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <button onClick={handleDelete} disabled={deleteLoading} className={btn.danger}>
                                    {deleteLoading ? <><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Deleting…</> : "Yes, delete project"}
                                </button>
                                <button onClick={() => setConfirmDelete(false)} disabled={deleteLoading} className={btn.ghost}>
                                    Keep project
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => setConfirmDelete(true)} className={`${btn.dangerSoft} mt-3`}>
                                <Trash2 size={14} aria-hidden="true" /> Delete project…
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-gray-200 bg-gray-50 p-4 sm:flex-row sm:justify-end sm:px-6">
                    <button type="button" onClick={() => handleOpenChange(false)} className={btn.ghost}>
                        Cancel
                    </button>
                    <button form="edit-project-form" type="submit" disabled={loading || datesInvalid} className={btn.primary}>
                        {loading ? <><Loader2 className="animate-spin" size={16} aria-hidden="true" /> Saving…</> : "Save changes"}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
