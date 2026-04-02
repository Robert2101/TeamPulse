import { Clock, User, X } from "lucide-react";
import api from "../../lib/axios";

export const TaskHeader = ({ task, project, canAssignMembers, onClose }) => {

    const handleAssigneeChange = async (newAssigneeId) => {
        try {
            await api.patch(`/tasks/${task._id}`, { assignee: newAssigneeId || null });
        } catch (error) {
            console.error("Failed to reassign task:", error);
            alert("Failed to update assignee.");
        }
    };

    return (
        <div className="flex items-center justify-between border-b border-zinc-800/80 bg-[#0f0f11] px-8 py-6 shadow-sm">
            <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">{task.taskName}</h2>
                <div className="mt-3 flex flex-wrap items-center gap-6 text-xs text-zinc-400">
                    <span className="flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1 font-medium border border-zinc-800">
                        <Clock size={14} className="text-emerald-400" /> Due: <span className="text-zinc-200">{new Date(task.dueDate).toLocaleDateString()}</span>
                    </span>

                    <span className="flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1 font-medium border border-zinc-800">
                        <User size={14} className="text-indigo-400" />
                        {canAssignMembers ? (
                            <select
                                className="bg-transparent text-indigo-400 font-bold focus:outline-none hover:text-indigo-300 cursor-pointer"

                                value={task.assignee?._id || task.assignee || ""}
                                onChange={(e) => handleAssigneeChange(e.target.value)}
                            >
                                <option value="" className="bg-zinc-900 text-zinc-300">Unassigned</option>
                                {project?.assignedTeamMembers?.map((member) => (
                                    <option key={member._id || member} value={member._id || member} className="bg-zinc-900 text-zinc-300">
                                        {member.fullName || member.emailAddress || "Team Member"}
                                    </option>
                                ))}
                                {project?.projectManager && (
                                    <option value={project.projectManager._id || project.projectManager} className="bg-zinc-900 text-zinc-300">
                                        {project.projectManager.fullName ? `${project.projectManager.fullName} (Manager)` : "Project Manager"}
                                    </option>
                                )}
                            </select>
                        ) : (
                            <span className="text-zinc-300 font-medium">{task.assignee?.fullName || "Unassigned"}</span>
                        )}
                    </span>
                </div>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors">
                <X size={20} />
            </button>
        </div>
    );
};