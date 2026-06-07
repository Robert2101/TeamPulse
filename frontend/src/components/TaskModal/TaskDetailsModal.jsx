import { useStore } from "../../store/useStore";
import { TaskHeader } from "./TaskHeader";
import { TaskDescription } from "./TaskDescription";
import { TaskAttachments } from "./TaskAttachments";
import { TaskChat } from "./TaskChat";

export const TaskDetailsModal = ({ task, project, onClose, socket }) => {
    const { user } = useStore();

    // --- RBAC PERMISSIONS ---
    const isAdmin = user?.role?.roleName === 'Admin';
    const isProjectManager = project?.projectManager?._id?.toString() === user?._id?.toString() || project?.projectManager?.toString() === user?._id?.toString();
    const canAssignMembers = isAdmin || isProjectManager;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-200/80 backdrop-blur-sm">
            {/* Click outside to close (Optional but good UX) */}
            <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

            <div
               
               
               
               
                className="relative flex h-full w-full max-w-6xl flex-col overflow-hidden border-l border-gray-200 bg-white shadow-2xl sm:rounded-l-3xl"
                onClick={(e) => e.stopPropagation()} // Prevent click-outside when clicking inside panel
            >
                {/* Header Section */}
                <TaskHeader
                    task={task}
                    project={project}
                    canAssignMembers={canAssignMembers}
                    onClose={onClose}
                />

                {/* Body Split */}
                <div className="flex flex-1 overflow-hidden">

                    {/* Left: Task Details + Attachments */}
                    <div className="w-[35%] border-r border-gray-200 bg-gray-50 p-8 overflow-y-auto space-y-8 custom-scrollbar">
                        <TaskDescription task={task} />
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                        <TaskAttachments
                            task={task}
                            socket={socket}
                            user={user}
                            isAdmin={isAdmin}
                        />
                    </div>

                    {/* Right: Real-time Comments */}
                    <div className="w-[65%] bg-white flex flex-col">
                        <TaskChat
                            task={task}
                            project={project}
                            socket={socket}
                            user={user}
                        />
                    </div>

                </div>
            </div>
        </div>
    );
};