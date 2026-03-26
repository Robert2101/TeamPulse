import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Clock } from "lucide-react";
import api from "../lib/axios";
import { useStore } from "../store/useStore";
import { Link } from "react-router-dom";

export const MyTasks = () => {
    const { projects, user } = useStore();
    const [myTasks, setMyTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMyTasks = async () => {
            if (projects.length === 0) return setLoading(false);
            try {
                // Fetch all tasks from all active projects
                const taskPromises = projects.map(p => api.get(`/tasks/project/${p._id}`));
                const results = await Promise.all(taskPromises);
                const allTasks = results.flatMap(r => r.data);

                // Filter to only show tasks assigned to the logged-in user
                const userTasks = allTasks.filter(t => t.assignee?._id === user?._id);
                setMyTasks(userTasks);
            } catch (err) {
                console.error("Failed to load your tasks", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMyTasks();
    }, [projects, user]);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    <CheckCircle className="text-indigo-400" /> My Tasks
                </h2>
                <p className="mt-2 text-zinc-400">All tasks assigned to you across your active workspaces.</p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-8 shadow-xl min-h-[50vh]">
                {loading ? (
                    <div className="animate-pulse text-zinc-500">Loading your tasks...</div>
                ) : myTasks.length === 0 ? (
                    <div className="text-zinc-500 py-10 text-center border-2 border-dashed border-zinc-800 rounded-xl">
                        You have no tasks assigned to you. Enjoy your free time!
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {myTasks.map((task) => (
                            <motion.div
                                key={task._id}
                                whileHover={{ y: -2 }}
                                className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 shadow-sm transition-all hover:border-indigo-500/50"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${task.priority === 'Urgent' ? 'bg-red-500/10 text-red-500' :
                                            task.priority === 'High' ? 'bg-orange-500/10 text-orange-400' :
                                                task.priority === 'Medium' ? 'bg-blue-500/10 text-blue-400' : 'bg-zinc-800 text-zinc-400'
                                        }`}>
                                        {task.priority}
                                    </span>
                                    <span className="text-xs font-semibold text-zinc-500 bg-zinc-900 px-2 py-1 rounded">{task.taskStatus}</span>
                                </div>
                                <h4 className="font-bold text-zinc-100">{task.taskName}</h4>
                                <p className="text-sm text-zinc-400 mt-2 line-clamp-2">{task.taskDescription}</p>

                                <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center">
                                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                                        <Clock size={14} /> Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No date"}
                                    </div>
                                    <Link to={`/project/${task.projectReference}`} className="text-xs text-indigo-400 hover:text-indigo-300">
                                        Go to Project &rarr;
                                    </Link>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};