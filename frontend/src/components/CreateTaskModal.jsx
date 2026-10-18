import { useState } from "react";
import { Plus, Loader2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { btn, field, label } from "../lib/styles";
import { errorMessage } from "../lib/format";

export const CreateTaskModal = ({ api, project, onTaskCreated }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        taskName: "",
        taskDescription: "",
        priority: "Medium",
        dueDate: "",
        assignee: "",
        projectReference: project?._id
    });
    const update = (key) => (e) => setFormData({ ...formData, [key]: e.target.value });

    const handleOpenChange = (open) => {
        setIsOpen(open);
        if (!open) setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await api.post("/tasks", { ...formData, taskName: formData.taskName.trim(), projectReference: project?._id });
            onTaskCreated(res.data.task);
            setIsOpen(false);
            setFormData({ ...formData, taskName: "", taskDescription: "", dueDate: "", priority: "Medium", assignee: "" });
        } catch (err) {
            setError(errorMessage(err, "Couldn't create the task. Please try again."));
        } finally {
            setLoading(false);
        }
    };

    const pm = project?.projectManager;
    const members = (project?.assignedTeamMembers || []).filter((m) => (m._id || m) !== (pm?._id || pm));

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <button className={btn.primary}>
                    <Plus size={18} aria-hidden="true" />
                    Add task
                </button>
            </DialogTrigger>

            <DialogContent className="gap-0 p-0 sm:max-w-lg">
                <div className="border-b border-gray-200 p-6 pr-14">
                    <DialogTitle className="text-lg font-semibold text-gray-900">New task</DialogTitle>
                    <DialogDescription className="mt-1 text-sm text-gray-600">New tasks start in To-Do.</DialogDescription>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 p-6">
                    {error && (
                        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> {error}
                        </div>
                    )}
                    <div>
                        <label htmlFor="taskName" className={label}>Task name</label>
                        <input id="taskName" required maxLength={200} className={field} placeholder="e.g. Design database schema" value={formData.taskName} onChange={update("taskName")} />
                    </div>

                    <div>
                        <label htmlFor="taskDescription" className={label}>Description <span className="font-normal text-gray-500">(optional)</span></label>
                        <textarea id="taskDescription" rows={3} className={`${field} h-auto min-h-24 py-2`} placeholder="Add context, links or acceptance criteria" value={formData.taskDescription} onChange={update("taskDescription")} />
                    </div>

                    <div>
                        <label htmlFor="assignee" className={label}>Assign to</label>
                        <select id="assignee" className={field} value={formData.assignee} onChange={update("assignee")}>
                            <option value="">Unassigned</option>
                            {members.map((member) => (
                                <option key={member._id || member} value={member._id || member}>
                                    {member.fullName || member.emailAddress || "Team member"}
                                </option>
                            ))}
                            {pm && (
                                <option value={pm._id || pm}>
                                    {pm.fullName ? `${pm.fullName} (Manager)` : "Project manager"}
                                </option>
                            )}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="dueDate" className={label}>Due date</label>
                            <input id="dueDate" type="date" className={field} value={formData.dueDate} onChange={update("dueDate")} />
                        </div>
                        <div>
                            <label htmlFor="priority" className={label}>Priority</label>
                            <select id="priority" className={field} value={formData.priority} onChange={update("priority")}>
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Urgent">Urgent</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
                        <button type="button" onClick={() => handleOpenChange(false)} className={btn.ghost}>Cancel</button>
                        <button type="submit" disabled={loading} className={btn.primary}>
                            {loading ? <><Loader2 className="animate-spin" size={16} aria-hidden="true" /> Creating…</> : "Create task"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
