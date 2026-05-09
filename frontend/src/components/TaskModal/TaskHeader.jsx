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
        <div className="flex items-center justify-between border-b border-gray-200/80 bg-white px-8 py-6 shadow-sm">
            <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">{task.taskName}</h2>
                <div className="mt-3 flex flex-wrap items-center gap-6 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 font-medium border border-gray-200">
                        <Clock size={14} className="text-gray-700" /> Due: <span className="text-gray-800">{new Date(task.dueDate).toLocaleDateString()}</span>
                    </span>

                    <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 font-medium border border-gray-200">
                        <User size={14} className="text-gray-700" />
                        {canAssignMembers ? (
                            <select
                                className="bg-transparent text-gray-700 font-bold focus:outline-none hover:text-gray-900 cursor-pointer"

                                value={task.assignee?._id || task.assignee || ""}
                                onChange={(e) => handleAssigneeChange(e.target.value)}
                            >
                                <option value="" className="bg-white text-gray-700">Unassigned</option>
                                {project?.assignedTeamMembers?.map((member) => (
                                    <option key={member._id || member} value={member._id || member} className="bg-white text-gray-700">
                                        {member.fullName || member.emailAddress || "Team Member"}
                                    </option>
                                ))}
                                {project?.projectManager && (
                                    <option value={project.projectManager._id || project.projectManager} className="bg-white text-gray-700">
                                        {project.projectManager.fullName ? `${project.projectManager.fullName} (Manager)` : "Project Manager"}
                                    </option>
                                )}
                            </select>
                        ) : (
                            <span className="text-gray-700 font-medium">{task.assignee?.fullName || "Unassigned"}</span>
                        )}
                    </span>
                </div>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                <X size={20} />
            </button>
        </div>
    );
};