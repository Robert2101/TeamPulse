import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const CreateTaskModal = ({ api, project, onTaskCreated }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        taskName: "",
        taskDescription: "",
        priority: "Medium",
        dueDate: "",
        assignee: "", 
        projectReference: project?._id
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post("/tasks", formData);
            onTaskCreated(res.data.task);
            setIsOpen(false);
            setFormData({ ...formData, taskName: "", taskDescription: "", dueDate: "", priority: "Medium", assignee: "" });
        } catch (error) {
            console.error("Failed to create task:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500"
                >
                    <Plus size={18} />
                    Add Task
                </motion.button>
            </DialogTrigger>

            <DialogContent className="border-zinc-800 bg-zinc-950/90 p-0 shadow-2xl backdrop-blur-2xl sm:max-w-125">
                <div className="flex items-center justify-between border-b border-zinc-800 p-6">
                    <DialogTitle className="text-xl font-bold text-zinc-100">New Task</DialogTitle>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="taskName" className="text-zinc-400">Task Name</Label>
                        <Input
                            id="taskName"
                            required
                            className="border-zinc-800 bg-zinc-900 text-zinc-100 focus-visible:ring-indigo-500"
                            placeholder="e.g., Design Database Schema"
                            value={formData.taskName}
                            onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="taskDescription" className="text-zinc-400">Description</Label>
                        <Textarea
                            id="taskDescription"
                            className="min-h-25 border-zinc-800 bg-zinc-900 text-zinc-100 focus-visible:ring-indigo-500"
                            placeholder="Task details..."
                            value={formData.taskDescription}
                            onChange={(e) => setFormData({ ...formData, taskDescription: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="assignee" className="text-zinc-400">Assign To</Label>
                        <select
                            id="assignee"
                            className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={formData.assignee}
                            onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                        >
                            <option value="">Unassigned</option>

                            {project?.assignedTeamMembers?.map((member) => (
                                <option key={member._id || member} value={member._id || member}>
                                    {member.fullName || member.emailAddress || "Team Member"}
                                </option>
                            ))}

                            {project?.projectManager && (
                                <option value={project.projectManager._id || project.projectManager}>
                                    {project.projectManager.fullName ? `${project.projectManager.fullName} (Manager)` : "Project Manager"}
                                </option>
                            )}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="dueDate" className="text-zinc-400">Due Date</Label>
                            <Input
                                id="dueDate"
                                type="date"
                                className="border-zinc-800 bg-zinc-900 text-zinc-100 focus-visible:ring-indigo-500 scheme-dark"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="priority" className="text-zinc-400">Priority</Label>
                            <select
                                id="priority"
                                className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                            >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Urgent">Urgent</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3 border-t border-zinc-800 pt-6">
                        <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">Cancel</button>
                        <button type="submit" disabled={loading} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                            {loading ? <Loader2 className="animate-spin" size={18} /> : "Create Task"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};