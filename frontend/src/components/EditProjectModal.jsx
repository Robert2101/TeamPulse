import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, Loader2, Trash2, Save, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";

export const EditProjectModal = ({ api, project, onProjectUpdated }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const { removeProject, updateProjectInStore } = useStore();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        projectName: project.projectName || "",
        projectDescription: project.projectDescription || "",
        projectStatus: project.projectStatus || "Active",
        priority: project.priority || "Medium",
        budget: project.budget || 0,
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.put(`/projects/${project._id}`, formData);
            onProjectUpdated(res.data.project);
            updateProjectInStore(res.data.project);
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to update project:", error);
            alert("Failed to update project details.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setDeleteLoading(true);
        try {
            await api.delete(`/projects/${project._id}`);
            removeProject(project._id);
            setIsOpen(false);
            navigate("/projects"); // Kick them back to the directory after deletion
        } catch (error) {
            console.error("Failed to delete project:", error);
            alert("Failed to delete project.");
            setDeleteLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                    <Settings size={16} /> Project Settings
                </motion.button>
            </DialogTrigger>

            <DialogContent className="border-zinc-800 bg-zinc-950/95 p-0 shadow-2xl backdrop-blur-2xl sm:max-w-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 p-6">
                    <DialogTitle className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                        <Settings size={20} className="text-zinc-400" /> Configure Project
                    </DialogTitle>
                </div>

                <div className="p-6 overflow-y-auto max-h-[70vh]">
                    <form id="edit-project-form" onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="projectName" className="text-zinc-400">Project Name</Label>
                            <Input
                                id="projectName"
                                required
                                className="border-zinc-800 bg-zinc-900 text-zinc-100 focus-visible:ring-indigo-500"
                                value={formData.projectName}
                                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="projectDescription" className="text-zinc-400">Description</Label>
                            <Textarea
                                id="projectDescription"
                                required
                                className="min-h-[100px] border-zinc-800 bg-zinc-900 text-zinc-100 focus-visible:ring-indigo-500"
                                value={formData.projectDescription}
                                onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="projectStatus" className="text-zinc-400">Status</Label>
                                <select
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={formData.projectStatus}
                                    onChange={(e) => setFormData({ ...formData, projectStatus: e.target.value })}
                                >
                                    <option value="Planning">Planning</option>
                                    <option value="Active">Active</option>
                                    <option value="On Hold">On Hold</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="priority" className="text-zinc-400">Priority</Label>
                                <select
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                    <option value="Critical">Critical</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="budget" className="text-zinc-400">Budget ($)</Label>
                            <Input
                                id="budget"
                                type="number"
                                className="border-zinc-800 bg-zinc-900 text-zinc-100 focus-visible:ring-indigo-500"
                                value={formData.budget}
                                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                            />
                        </div>
                    </form>

                    {/* DANGER ZONE */}
                    <div className="mt-10 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-red-400">
                            <AlertTriangle size={16} /> Danger Zone
                        </h4>
                        <p className="mt-1 text-xs text-zinc-500">
                            Permanently delete this project, all its tasks, and comments. This action cannot be undone.
                        </p>

                        {confirmDelete ? (
                            <div className="mt-3 flex items-center gap-3">
                                <button onClick={handleDelete} disabled={deleteLoading} className="flex items-center gap-2 rounded bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50">
                                    {deleteLoading ? <Loader2 size={14} className="animate-spin" /> : "Yes, Delete Project"}
                                </button>
                                <button onClick={() => setConfirmDelete(false)} disabled={deleteLoading} className="text-xs text-zinc-400 hover:text-zinc-200">
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => setConfirmDelete(true)} className="mt-3 flex items-center gap-2 rounded bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                                <Trash2 size={14} /> Delete Project
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-zinc-800 p-6 bg-zinc-950">
                    <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">
                        Cancel
                    </button>
                    <button form="edit-project-form" type="submit" disabled={loading} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-indigo-500 disabled:opacity-50">
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <><Save size={16} /> Save Changes</>}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
};