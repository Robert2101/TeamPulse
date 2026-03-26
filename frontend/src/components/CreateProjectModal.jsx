import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "../store/useStore";

export const CreateProjectModal = ({ api }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const addProject = useStore((state) => state.addProject);

    const [formData, setFormData] = useState({
        projectName: "",
        projectDescription: "",
        priority: "Medium",
        budget: "",
        projectType: "Software",
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post("/projects", formData);

            addProject(res.data.project);

            setIsOpen(false); 
            setFormData({ projectName: "", projectDescription: "", priority: "Medium", budget: "", projectType: "Software" });
        } catch (error) {
            console.error("Failed to create project:", error);
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
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500"
                >
                    <Plus size={18} />
                    New Project
                </motion.button>
            </DialogTrigger>

            <DialogContent className="border-zinc-800 bg-zinc-950/90 p-0 shadow-2xl backdrop-blur-2xl sm:max-w-125">
                <div className="flex items-center justify-between border-b border-zinc-800 p-6">
                    <DialogTitle className="text-xl font-bold text-zinc-100">Launch New Project</DialogTitle>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="projectName" className="text-zinc-400">Project Name</Label>
                        <Input
                            id="projectName"
                            required
                            className="border-zinc-800 bg-zinc-900 text-zinc-100 focus-visible:ring-indigo-500"
                            placeholder="e.g., Alpha Version Release"
                            value={formData.projectName}
                            onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="projectDescription" className="text-zinc-400">Description</Label>
                        <Textarea
                            id="projectDescription"
                            required
                            className="min-h-25 border-zinc-800 bg-zinc-900 text-zinc-100 focus-visible:ring-indigo-500"
                            placeholder="What is the main goal of this project?"
                            value={formData.projectDescription}
                            onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="budget" className="text-zinc-400">Budget ($)</Label>
                            <Input
                                id="budget"
                                type="number"
                                required
                                className="border-zinc-800 bg-zinc-900 text-zinc-100 focus-visible:ring-indigo-500"
                                placeholder="5000"
                                value={formData.budget}
                                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                            />
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
                            </select>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3 border-t border-zinc-800 pt-6">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : "Create Project"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};