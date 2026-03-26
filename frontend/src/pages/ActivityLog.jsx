import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Clock, PlusCircle, Edit2, Trash2, MessageSquare, CheckSquare, FolderKanban, Filter } from "lucide-react";
import api from "../lib/axios";
import { useStore } from "../store/useStore";

export const ActivityLog = () => {
    const { projects } = useStore();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedProject, setSelectedProject] = useState(projects[0]?._id || "");
    const [filter, setFilter] = useState("All"); // All, Task, Comment, Project

    useEffect(() => {
        if (!selectedProject) return;
        const fetchLogs = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/activities/${selectedProject}`);
                setLogs(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [selectedProject]);

    // Format relative time (e.g., "2 hours ago")
    const getRelativeTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return "Just now";
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 172800) return "Yesterday";
        return date.toLocaleDateString();
    };

    // Determine the icon and color based on the action and entity
    const getActionDetails = (action, entityType) => {
        const actionLower = action.toLowerCase();

        let color = "text-zinc-400 bg-zinc-800 border-zinc-700";
        if (actionLower.includes('create') || actionLower.includes('add')) color = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
        if (actionLower.includes('edit') || actionLower.includes('update')) color = "text-blue-400 bg-blue-500/10 border-blue-500/20";
        if (actionLower.includes('delete') || actionLower.includes('remove')) color = "text-red-400 bg-red-500/10 border-red-500/20";

        let Icon = Activity;
        if (entityType === "Task") Icon = CheckSquare;
        if (entityType === "Comment") Icon = MessageSquare;
        if (entityType === "Project") Icon = FolderKanban;

        return { color, Icon };
    };

    // Generate a human-readable sentence using the metadata
    const generateLogSentence = (log) => {
        const userName = <span className="font-bold text-zinc-200">{log.user?.fullName || "System"}</span>;
        const targetName = log.metadata?.taskName || log.metadata?.projectName || "an item";

        const actionLower = log.action.toLowerCase();
        let actionWord = <span className="text-zinc-400">{log.action}</span>;

        if (actionLower.includes('delete')) actionWord = <span className="font-medium text-red-400">deleted</span>;
        else if (actionLower.includes('create')) actionWord = <span className="font-medium text-emerald-400">created</span>;
        else if (actionLower.includes('update')) actionWord = <span className="font-medium text-blue-400">{log.action.toLowerCase()}</span>;

        if (log.entityType === "Comment") {
            return <div className="text-sm">{userName} {actionWord} a comment on a task.</div>;
        }

        return <div className="text-sm">{userName} {actionWord} {log.entityType.toLowerCase()} <span className="font-medium text-zinc-300">"{targetName}"</span>.</div>;
    };

    const filteredLogs = filter === "All" ? logs : logs.filter(log => log.entityType === filter);

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800 pb-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Activity className="text-indigo-400" /> Audit Log
                    </h2>
                    <p className="mt-2 text-zinc-400">Enterprise tracking for accountability and security.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1">
                        <Filter size={16} className="text-zinc-500" />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="bg-transparent text-sm text-zinc-300 focus:outline-none cursor-pointer py-1"
                        >
                            <option value="All">All Events</option>
                            <option value="Project">Projects Only</option>
                            <option value="Task">Tasks Only</option>
                            <option value="Comment">Comments Only</option>
                        </select>
                    </div>

                    <select
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none cursor-pointer"
                    >
                        {projects.length === 0 && <option value="">No Projects Available</option>}
                        {projects.map(p => (
                            <option key={p._id} value={p._id}>{p.projectName}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-8 shadow-xl">
                {loading ? (
                    <div className="flex flex-col space-y-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex items-center gap-4 animate-pulse">
                                <div className="h-10 w-10 rounded-full bg-zinc-800 shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-1/3 bg-zinc-800 rounded" />
                                    <div className="h-3 w-1/4 bg-zinc-800 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-950/50">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 mb-4">
                            <Activity className="text-zinc-600" />
                        </div>
                        <h3 className="text-zinc-300 font-medium">No activity found</h3>
                        <p className="text-zinc-500 text-sm mt-1">Try selecting a different project or clearing your filters.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <AnimatePresence>
                            {filteredLogs.map((log, index) => {
                                const { color, Icon } = getActionDetails(log.action, log.entityType);

                                return (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        key={log._id}
                                        className="group relative flex items-start gap-4"
                                    >
                                        {/* Timeline Line */}
                                        {index !== filteredLogs.length - 1 && (
                                            <div className="absolute top-10 bottom-[-24px] left-5 w-px bg-zinc-800" />
                                        )}

                                        {/* Avatar / Icon */}
                                        <div className="relative z-10 shrink-0">
                                            {log.user?.profilePicture ? (
                                                <img src={log.user.profilePicture} alt="User" className="h-10 w-10 rounded-full ring-4 ring-zinc-950 object-cover" />
                                            ) : (
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 ring-4 ring-zinc-950 font-bold text-zinc-400">
                                                    {log.user?.fullName?.charAt(0) || "?"}
                                                </div>
                                            )}

                                            {/* Tiny Entity Badge overlapping the avatar */}
                                            <div className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-zinc-950 ${color}`}>
                                                <Icon size={10} />
                                            </div>
                                        </div>

                                        {/* Log Content Card */}
                                        <div className="flex-1 flex flex-col justify-center pt-1.5">
                                            <div className="flex items-center justify-between gap-4">
                                                {generateLogSentence(log)}
                                                <span className="shrink-0 text-xs font-medium text-zinc-500 flex items-center gap-1.5">
                                                    {getRelativeTime(log.createdAt)}
                                                </span>
                                            </div>

                                            {/* Sub-meta details on hover for ultra pros */}
                                            <div className="mt-1 h-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:h-auto group-hover:opacity-100">
                                                <div className="text-[10px] text-zinc-600 flex items-center gap-3">
                                                    <span>Entity ID: {log.entityId}</span>
                                                    <span>User ID: {log.user?._id}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
};