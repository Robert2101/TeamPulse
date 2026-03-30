import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock } from "lucide-react";

import api from "../lib/axios";
import { useSocket } from "../hooks/useSocket";
import { CreateTaskModal } from "../components/CreateTaskModal";
import { TaskDetailsModal } from "../components/TaskModal/TaskDetailsModal";
import { ManageTeamModal } from "../components/ManageTeamModal";
import { EditProjectModal } from "../components/EditProjectModal";
import { AssetsHub } from "./AssetsHub";
import { useStore } from "../store/useStore";

const COLUMNS = ["To-Do", "In-Progress", "Review", "Done"];

export const ProjectBoard = () => {
    const { id } = useParams();
    const { user } = useStore();

    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [activeTab, setActiveTab] = useState("kanban"); // "kanban" | "assets"

    useEffect(() => {
        const fetchBoardData = async () => {
            try {
                const [projRes, tasksRes] = await Promise.all([
                    api.get(`/projects/${id}`),
                    api.get(`/tasks/project/${id}`)
                ]);
                setProject(projRes.data);
                setTasks(tasksRes.data);
            } catch (error) {
                console.error("Error fetching board data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchBoardData();
    }, [id]);

    const socket = useSocket(id);

    useEffect(() => {
        if (!socket) return;

        socket.on("task-updated", (updatedTask) => {
            setTasks(prevTasks =>
                prevTasks.map(t => t._id === updatedTask._id ? updatedTask : t)
            );
            setSelectedTask(prev => prev?._id === updatedTask._id ? updatedTask : prev);
        });

        socket.on("task-created", (newTask) => {
            setTasks(prevTasks => [newTask, ...prevTasks]);
        });

        return () => {
            socket.off("task-updated");
            socket.off("task-created");
        };
    }, [socket]);

    const handleDragStart = (e, taskId) => {
        e.dataTransfer.setData("taskId", taskId);
        e.currentTarget.style.opacity = "0.5";
    };

    const handleDragEnd = (e) => {
        e.currentTarget.style.opacity = "1";
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = async (e, newStatus) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData("taskId");

        const taskToMove = tasks.find(t => t._id === taskId);
        if (!taskToMove || taskToMove.taskStatus === newStatus) return;

        setTasks(prevTasks =>
            prevTasks.map(t => t._id === taskId ? { ...t, taskStatus: newStatus } : t)
        );

        try {
            await api.patch(`/tasks/${taskId}`, { taskStatus: newStatus });
        } catch (error) {
            console.error("Failed to update task:", error);
            const res = await api.get(`/tasks/project/${id}`);
            setTasks(res.data);
        }
    };

    if (loading) {
        return <div className="flex h-full items-center justify-center text-zinc-400 animate-pulse">Loading Workspace...</div>;
    }

    if (!project) return <div className="p-8 text-red-400">Project not found or access denied.</div>;

    // --- FRONTEND RBAC SECURITY CHECKS ---
    const isAdmin = user?.role?.roleName === 'Admin';
    const isProjectManager =
        project?.projectManager?._id?.toString() === user?._id?.toString() ||
        project?.projectManager?.toString() === user?._id?.toString();

    // strict RBAC rules mapped to actual backend logic
    const canManageTeam = isAdmin || isProjectManager;
    const canCreateTask = isAdmin || isProjectManager || user?.role?.manageTasks;
    const canEditProject = isAdmin || isProjectManager; 

    return (
        <div className="flex h-full flex-col relative">
            {/* Board Header */}
            <div className="mb-8 flex items-center justify-between border-b border-zinc-800 pb-6">
                <div>
                    <Link to="/dashboard" className="mb-2 flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                        <ArrowLeft size={16} /> Back to Dashboard
                    </Link>
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-bold tracking-tight text-zinc-100">{project.projectName}</h2>
                        {/* Status Badge */}
                        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider mt-1 ${project.projectStatus === 'Completed' ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' :
                                project.projectStatus === 'On Hold' ? 'border-orange-500/30 bg-orange-500/10 text-orange-400' :
                                    'border-green-500/30 bg-green-500/10 text-green-400'
                            }`}>
                            {project.projectStatus || 'Active'}
                        </span>
                    </div>
                    <p className="text-zinc-400 mt-1">{project.projectDescription}</p>
                </div>

                {/* --- CONDITIONAL RENDERING CONTROL PANEL --- */}
                <div className="flex items-center gap-3">
                    {/* Only Admins & PMs get the Settings Gear */}
                    {canEditProject && (
                        <EditProjectModal api={api} project={project} onProjectUpdated={setProject} />
                    )}

                    {canManageTeam && (
                        <ManageTeamModal project={project} onTeamUpdated={setProject} />
                    )}

                    {canCreateTask && activeTab === "kanban" && (
                        <CreateTaskModal
                            api={api}
                            project={project}
                            onTaskCreated={(newTask) => setTasks([newTask, ...tasks])}
                        />
                    )}
                </div>
            </div>

            {/* Tab Bar */}
            <div className="mb-6 flex gap-1 border-b border-zinc-800">
                {["kanban", "assets"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                            activeTab === tab
                                ? "border-indigo-500 text-indigo-400"
                                : "border-transparent text-zinc-500 hover:text-zinc-300"
                        }`}
                    >
                        {tab === "kanban" ? "Kanban" : "Assets"}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === "assets" ? (
                <AssetsHub project={project} socket={socket} />
            ) : (
                <div className="flex flex-1 gap-6 overflow-x-auto pb-4">
                {COLUMNS.map((status) => {
                    const columnTasks = tasks.filter(task => task.taskStatus === status);

                    return (
                        <div
                            key={status}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, status)}
                            className="flex h-full min-w-[320px] max-w-[320px] flex-col rounded-2xl bg-zinc-900/30 p-4 border border-zinc-800 transition-colors hover:bg-zinc-900/50"
                        >
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="font-semibold text-zinc-300">{status}</h3>
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-zinc-400">
                                    {columnTasks.length}
                                </span>
                            </div>

                            <div className="flex flex-1 flex-col gap-3 overflow-y-auto min-h-[150px]">
                                {columnTasks.map((task) => (
                                    <motion.div
                                        layoutId={task._id}
                                        key={task._id}
                                        draggable="true"
                                        onDragStart={(e) => handleDragStart(e, task._id)}
                                        onDragEnd={handleDragEnd}
                                        onClick={() => setSelectedTask(task)}
                                        className="group cursor-grab active:cursor-grabbing rounded-xl border border-zinc-800 bg-zinc-950 p-4 shadow-sm transition-all hover:border-indigo-500/50 hover:shadow-indigo-500/10"
                                    >
                                        <div className="mb-2 flex items-center justify-between">
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${task.priority === 'Urgent' ? 'bg-red-500/10 text-red-500' :
                                                task.priority === 'High' ? 'bg-orange-500/10 text-orange-400' :
                                                    task.priority === 'Medium' ? 'bg-blue-500/10 text-blue-400' :
                                                        'bg-zinc-800 text-zinc-400'
                                                }`}>
                                                {task.priority}
                                            </span>
                                        </div>
                                        <h4 className="font-medium text-zinc-100">{task.taskName}</h4>
                                        {task.dueDate && (
                                            <div className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500">
                                                <Clock size={14} />
                                                {new Date(task.dueDate).toLocaleDateString()}
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                                {columnTasks.length === 0 && (
                                    <div className="rounded-xl border border-dashed border-zinc-800 p-4 text-center text-sm text-zinc-600 pointer-events-none">
                                        Drop tasks here
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                </div>
            )}

            <AnimatePresence>
                {selectedTask && (
                    <TaskDetailsModal
                        task={selectedTask}
                        project={project}
                        onClose={() => setSelectedTask(null)}
                        socket={socket}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};