import { useState } from "react";
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
                <button
                   
                   
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500"
                >
                    <Plus size={18} />
                    New Project
                </button>
            </DialogTrigger>

            <DialogContent className="border-gray-200 bg-gray-50/90 p-0 shadow-2xl backdrop-blur-2xl sm:max-w-125">
                <div className="flex items-center justify-between border-b border-gray-200 p-6">
                    <DialogTitle className="text-xl font-bold text-gray-900">Launch New Project</DialogTitle>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="projectName" className="text-gray-500">Project Name</Label>
                        <Input
                            id="projectName"
                            required
                            className="border-gray-200 bg-white text-gray-900 focus-visible:ring-indigo-500"
                            placeholder="e.g., Alpha Version Release"
                            value={formData.projectName}
                            onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="projectDescription" className="text-gray-500">Description</Label>
                        <Textarea
                            id="projectDescription"
                            required
                            className="min-h-25 border-gray-200 bg-white text-gray-900 focus-visible:ring-indigo-500"
                            placeholder="What is the main goal of this project?"
                            value={formData.projectDescription}
                            onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="budget" className="text-gray-500">Budget ($)</Label>
                            <Input
                                id="budget"
                                type="number"
                                required
                                className="border-gray-200 bg-white text-gray-900 focus-visible:ring-indigo-500"
                                placeholder="5000"
                                value={formData.budget}
                                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="priority" className="text-gray-500">Priority</Label>
                            <select
                                className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                            >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-6">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-indigo-500 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : "Create Project"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};