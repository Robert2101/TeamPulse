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
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
            {/* Click outside to close (Optional but good UX) */}
            <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

            <motion.div
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 300, mass: 1.5 }}
                className="relative flex h-full w-full max-w-6xl flex-col overflow-hidden border-l border-zinc-800 bg-[#0a0a0a] shadow-2xl sm:rounded-l-3xl"
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
                    <div className="w-[35%] border-r border-zinc-800/50 bg-[#0f0f11] p-8 overflow-y-auto space-y-8 custom-scrollbar">
                        <TaskDescription task={task} />
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
                        <TaskAttachments
                            task={task}
                            socket={socket}
                            user={user}
                            isAdmin={isAdmin}
                        />
                    </div>

                    {/* Right: Real-time Comments */}
                    <div className="w-[65%] bg-[#0a0a0a] flex flex-col">
                        <TaskChat
                            task={task}
                            project={project}
                            socket={socket}
                            user={user}
                        />
                    </div>

                </div>
            </motion.div>
        </div>
    );
};