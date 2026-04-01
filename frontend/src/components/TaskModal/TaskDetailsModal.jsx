import { motion } from "framer-motion";
import { useStore } from "../../store/useStore";
import { TaskHeader } from "./TaskHeader";
import { TaskDescription } from "./TaskDescription";
import { TaskAttachments } from "./TaskAttachments";
import { TaskChat } from "./TaskChat";

export const TaskDetailsModal = ({ task, project, onClose, socket }) => {
    const { user } = useStore();

    // --- RBAC PERMISSIONS ---
    const isAdmin = user?.role?.roleName === 'Admin';
    const isProjectManager = project?.projectManager?._id === user?._id || project?.projectManager === user?._id;
    const canAssignMembers = isAdmin || isProjectManager;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
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
                    <div className="w-1/2 border-r border-zinc-800 p-6 overflow-y-auto">
                        <TaskDescription task={task} />
                        <TaskAttachments
                            task={task}
                            socket={socket}
                            user={user}
                            isAdmin={isAdmin}
                        />
                    </div>

                    {/* Right: Real-time Comments */}
                    <TaskChat
                        task={task}
                        project={project}
                        socket={socket}
                        user={user}
                    />

                </div>
            </motion.div>
        </div>
    );
};