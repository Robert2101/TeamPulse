import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, CheckCircle, AlertCircle, Flame, Target, Briefcase, Clock, ChevronRight } from "lucide-react";
import api from "../lib/axios";
import { useStore } from "../store/useStore";
import { Link } from "react-router-dom";

export const Reports = () => {
    const { projects, user } = useStore();
    const isAdmin = user?.role?.roleName === 'Admin';

    // Global Stats (For Admin)
    const [globalStats, setGlobalStats] = useState({ todo: 0, inProgress: 0, review: 0, done: 0, total: 0, urgent: 0 });

    // Personal Stats (For Members)
    const [myTasks, setMyTasks] = useState([]);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (projects.length === 0) return setLoading(false);
            try {
                const taskPromises = projects.map(p => api.get(`/tasks/project/${p._id}`));
                const results = await Promise.all(taskPromises);
                const allTasks = results.flatMap(r => r.data);

                if (isAdmin) {
                    // ADMIN COMMAND CENTER LOGIC
                    setGlobalStats({
                        todo: allTasks.filter(t => t.taskStatus === "To-Do").length,
                        inProgress: allTasks.filter(t => t.taskStatus === "In-Progress").length,
                        review: allTasks.filter(t => t.taskStatus === "Review").length,
                        done: allTasks.filter(t => t.taskStatus === "Done").length,
                        urgent: allTasks.filter(t => t.priority === "Urgent" && t.taskStatus !== "Done").length,
                        total: allTasks.length
                    });
                } else {
                    // PERSONAL WORKSPACE LOGIC
                    const myPersonalTasks = allTasks.filter(t => t.assignee?._id === user?._id);
                    setMyTasks(myPersonalTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)));
                }

            } catch (err) {
                console.error("Failed to load dashboard data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [projects, isAdmin, user]);

    const getPercentage = (val) => globalStats.total === 0 ? 0 : Math.round((val / globalStats.total) * 100);

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-3 text-zinc-500">
                    <Target size={32} className="animate-spin-slow" />
                    <p>Loading your workspace...</p>
                </div>
            </div>
        );
    }

    // ==========================================
    // 👑 GOD MODE: ADMIN COMMAND CENTER
    // ==========================================
    if (isAdmin) {
        return (
            <div className="max-w-7xl mx-auto space-y-8 pb-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800 pb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                <BarChart3 size={18} />
                            </span>
                            <h2 className="text-3xl font-bold tracking-tight text-white">System Overview</h2>
                        </div>
                        <p className="text-zinc-400">Global organization analytics, active projects, and system health.</p>
                    </div>
                </div>

                {/* Admin KPI Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-md">
                        <div className="flex justify-between items-start">
                            <span className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Total Projects</span>
                            <div className="rounded-md bg-blue-500/10 p-2 text-blue-400"><Briefcase size={18} /></div>
                        </div>
                        <span className="text-4xl font-black mt-4 block text-white">{projects.length}</span>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-md">
                        <div className="flex justify-between items-start">
                            <span className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Global Tasks</span>
                            <div className="rounded-md bg-indigo-500/10 p-2 text-indigo-400"><Target size={18} /></div>
                        </div>
                        <span className="text-4xl font-black mt-4 block text-white">{globalStats.total}</span>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-md">
                        <div className="flex justify-between items-start">
                            <span className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Completed</span>
                            <div className="rounded-md bg-emerald-500/10 p-2 text-emerald-400"><CheckCircle size={18} /></div>
                        </div>
                        <span className="text-4xl font-black mt-4 block text-white">{globalStats.done}</span>
                    </div>
                    <div className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-zinc-950 to-red-950/20 p-6 shadow-md">
                        <div className="flex justify-between items-start">
                            <span className="text-sm font-semibold text-red-400/80 uppercase tracking-wider">Global Blockers</span>
                            <div className="rounded-md bg-red-500/20 p-2 text-red-500"><Flame size={18} /></div>
                        </div>
                        <span className="text-4xl font-black mt-4 block text-red-400">{globalStats.urgent}</span>
                    </div>
                </div>

                {/* Admin Data Table: High-Density Project View */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 shadow-xl overflow-hidden">
                    <div className="border-b border-zinc-800 bg-zinc-900/50 p-5">
                        <h3 className="text-lg font-bold text-zinc-100">Active Project Directory</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-zinc-400">
                            <thead className="bg-zinc-900/30 text-xs uppercase text-zinc-500">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Project Name</th>
                                    <th className="px-6 py-4 font-semibold">Manager</th>
                                    <th className="px-6 py-4 font-semibold">Status</th>
                                    <th className="px-6 py-4 font-semibold">Priority</th>
                                    <th className="px-6 py-4 font-semibold text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {projects.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center py-8">No projects in the system.</td></tr>
                                ) : projects.map(p => (
                                    <tr key={p._id} className="hover:bg-zinc-900/20 transition-colors">
                                        <td className="px-6 py-4 font-medium text-zinc-200">{p.projectName}</td>
                                        <td className="px-6 py-4">{p.projectManager?.fullName || "Unassigned"}</td>
                                        <td className="px-6 py-4">
                                            <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase font-bold ${p.projectStatus === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                }`}>{p.projectStatus}</span>
                                        </td>
                                        <td className="px-6 py-4">{p.priority}</td>
                                        <td className="px-6 py-4 text-right">
                                            <Link to={`/project/${p._id}`} className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center justify-end gap-1">
                                                Inspect <ChevronRight size={14} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // 🧑‍💻 PERSONAL DESK: TEAM MEMBER / PM VIEW
    // ==========================================

    const myTodo = myTasks.filter(t => t.taskStatus !== "Done");
    const myDone = myTasks.filter(t => t.taskStatus === "Done");
    const myUrgent = myTodo.filter(t => t.priority === "Urgent" || t.priority === "High");

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800 pb-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">My Workspace</h2>
                    <p className="mt-2 text-zinc-400">Welcome back, {user?.fullName.split(' ')[0]}. Here is what needs your attention.</p>
                </div>
            </div>

            {/* Personal KPI Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-md border-t-4 border-t-indigo-500">
                    <span className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">My Pending Tasks</span>
                    <span className="text-4xl font-black mt-2 block text-white">{myTodo.length}</span>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-md border-t-4 border-t-emerald-500">
                    <span className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">My Completed Tasks</span>
                    <span className="text-4xl font-black mt-2 block text-white">{myDone.length}</span>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-md border-t-4 border-t-orange-500">
                    <span className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Urgent / High Priority</span>
                    <span className="text-4xl font-black mt-2 block text-orange-400">{myUrgent.length}</span>
                </div>
            </div>

            {/* Priority Queue (Action Required) */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 shadow-xl overflow-hidden">
                <div className="border-b border-zinc-800 bg-zinc-900/50 p-5 flex items-center gap-2">
                    <AlertCircle size={18} className="text-orange-400" />
                    <h3 className="text-lg font-bold text-zinc-100">My Priority Queue</h3>
                </div>
                <div className="p-2">
                    {myTodo.length === 0 ? (
                        <div className="p-10 text-center text-zinc-500">You're all caught up! No pending tasks.</div>
                    ) : (
                        <div className="flex flex-col gap-2 p-4">
                            {myTodo.slice(0, 5).map(task => (
                                <Link key={task._id} to={`/project/${task.projectReference?._id || task.projectReference}`} className="group flex items-center justify-between rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4 hover:border-indigo-500/30 hover:bg-zinc-900 transition-all">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${task.priority === 'Urgent' ? 'bg-red-500/10 text-red-500' : 'bg-zinc-800 text-zinc-400'
                                                }`}>{task.priority}</span>
                                            <h4 className="font-semibold text-zinc-200 group-hover:text-indigo-400 transition-colors">{task.taskName}</h4>
                                        </div>
                                        <span className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                                            <Clock size={12} /> Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date set'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-medium text-zinc-400 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">{task.taskStatus}</span>
                                        <ChevronRight size={16} className="text-zinc-600 group-hover:text-indigo-400" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};