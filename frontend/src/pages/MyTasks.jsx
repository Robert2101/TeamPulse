import { useEffect, useState } from "react";
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
            try {
                const res = await api.get('/tasks/mine');
                setMyTasks(res.data);
            } catch (err) {
                console.error("Failed to load your tasks", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMyTasks();
    }, []);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                    <CheckCircle className="text-gray-700" /> My Tasks
                </h2>
                <p className="mt-2 text-gray-500">All tasks assigned to you across your active workspaces.</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-8 shadow-xl min-h-[50vh]">
                {loading ? (
                    <div className="animate-pulse text-gray-400">Loading your tasks...</div>
                ) : myTasks.length === 0 ? (
                    <div className="text-gray-400 py-10 text-center border-2 border-dashed border-gray-200 rounded-xl">
                        You have no tasks assigned to you. Enjoy your free time!
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {myTasks.map((task) => (
                            <div
                                key={task._id}
                               
                                className="rounded-xl border border-gray-200 bg-gray-50 p-5 shadow-sm transition-all hover:border-gray-300"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${task.priority === 'Urgent' ? 'bg-red-500/10 text-red-500' :
                                            'bg-gray-100 text-gray-700 border border-gray-200'
                                        }`}>
                                        {task.priority}
                                    </span>
                                    <span className="text-xs font-semibold text-gray-400 bg-white px-2 py-1 rounded">{task.taskStatus}</span>
                                </div>
                                <h4 className="font-bold text-gray-900">{task.taskName}</h4>
                                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{task.taskDescription}</p>

                                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                        <Clock size={14} /> Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No date"}
                                    </div>
                                    <Link to={`/project/${task.projectReference}`} className="text-xs text-gray-700 hover:text-gray-900">
                                        Go to Project &rarr;
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};