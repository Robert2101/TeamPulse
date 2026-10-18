import { useEffect, useState } from "react";
import { Activity, MessageSquare, CheckSquare, FolderKanban, RotateCw } from "lucide-react";
import api from "../lib/axios";
import { useStore } from "../store/useStore";
import { Avatar } from "../components/ui/avatar";
import { relativeTime, errorMessage } from "../lib/format";
import { btn, card, field } from "../lib/styles";
import { cn } from "../lib/utils";

const ENTITY_ICON = { Task: CheckSquare, Comment: MessageSquare, Project: FolderKanban };

export const ActivityLog = () => {
    const { projects, projectsLoaded, user } = useStore();
    const isAdmin = user?.role?.roleName === 'Admin';
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [selectedProject, setSelectedProject] = useState(projects[0]?._id || "");
    const [filter, setFilter] = useState("All"); // All, Task, Comment, Project

    useEffect(() => {
        if (!selectedProject && projects.length > 0) {
            setSelectedProject(projects[0]._id);
        }
    }, [projects, selectedProject]);

    useEffect(() => {
        if (!selectedProject) return;
        let cancelled = false;
        const fetchLogs = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await api.get(`/activities/${selectedProject}`);
                if (!cancelled) setLogs(res.data);
            } catch (err) {
                console.error(err);
                if (!cancelled) setError(err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchLogs();
        return () => { cancelled = true; };
    }, [selectedProject, reloadKey]);

    // Generate a human-readable sentence using the metadata
    const generateLogSentence = (log) => {
        const userName = <span className="font-semibold text-gray-900">{log.user?.fullName || "System"}</span>;
        const targetName = log.metadata?.taskName || log.metadata?.projectName || "an item";

        const actionLower = (log.action || '').toLowerCase();
        let actionWord = <span className="text-gray-700">{log.action?.toLowerCase()}</span>;
        if (actionLower.includes('delete')) actionWord = <span className="font-medium text-red-700">deleted</span>;
        else if (actionLower.includes('create')) actionWord = <span className="text-gray-700">created</span>;

        if (log.entityType === "Comment") {
            return <p className="text-sm text-gray-700">{userName} {actionWord} a comment on a task.</p>;
        }

        return (
            <p className="min-w-0 text-sm text-gray-700 wrap-anywhere">
                {userName} {actionWord} {log.entityType ? log.entityType.toLowerCase() : "item"}{" "}
                <span className="font-medium text-gray-900">"{targetName}"</span>
            </p>
        );
    };

    const filteredLogs = filter === "All" ? logs : logs.filter(log => log.entityType === filter);

    return (
        <div className="mx-auto max-w-5xl space-y-6 pb-12">
            <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">Audit log</h1>
                    <p className="mt-2 text-gray-600">Who changed what, and when, in each project.</p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:w-auto">
                    <div>
                        <label htmlFor="audit-project" className="mb-1 block text-xs font-medium text-gray-600">Project</label>
                        <select
                            id="audit-project"
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                            disabled={projects.length === 0}
                            className={cn(field, "md:w-64")}
                        >
                            {projects.length === 0 && <option value="">No projects available</option>}
                            {projects.map(p => (
                                <option key={p._id} value={p._id}>{p.projectName}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="audit-filter" className="mb-1 block text-xs font-medium text-gray-600">Show</label>
                        <select id="audit-filter" value={filter} onChange={(e) => setFilter(e.target.value)} className={cn(field, "md:w-44")}>
                            <option value="All">All events</option>
                            <option value="Project">Projects only</option>
                            <option value="Task">Tasks only</option>
                            <option value="Comment">Comments only</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className={cn(card, "p-5 sm:p-8")}>
                {loading || (!projectsLoaded && !error) ? (
                    <div className="flex flex-col space-y-6" role="status" aria-label="Loading activity">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex animate-pulse items-center gap-4">
                                <div className="h-10 w-10 shrink-0 rounded-full bg-gray-200" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-1/3 rounded bg-gray-200" />
                                    <div className="h-3 w-1/4 rounded bg-gray-100" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center py-12 text-center">
                        <p className="font-medium text-gray-900">Couldn't load activity</p>
                        <p className="mt-1 text-sm text-gray-600">{errorMessage(error)}</p>
                        <button onClick={() => setReloadKey(k => k + 1)} className={`${btn.secondary} mt-4`}><RotateCw size={14} aria-hidden="true" /> Try again</button>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center">
                        <Activity className="mb-3 text-gray-400" aria-hidden="true" />
                        <h2 className="font-medium text-gray-900">No activity yet</h2>
                        <p className="mt-1 max-w-sm text-sm text-gray-600">
                            {projects.length === 0 ? "Create a project and its history will appear here." : "Try another project or show all event types."}
                        </p>
                    </div>
                ) : (
                    <ol className="space-y-6">
                        {filteredLogs.map((log, index) => {
                            const Icon = ENTITY_ICON[log.entityType] || Activity;
                            const isDelete = (log.action || "").toLowerCase().includes("delete");
                            return (
                                <li key={log._id} className="group relative flex items-start gap-4">
                                    {/* Timeline Line */}
                                    {index !== filteredLogs.length - 1 && (
                                        <div className="absolute -bottom-6 left-5 top-11 w-px bg-gray-200" aria-hidden="true" />
                                    )}

                                    {/* Avatar with entity badge */}
                                    <div className="relative z-10 shrink-0">
                                        <Avatar name={log.user?.fullName || "System"} src={log.user?.profilePicture} size="lg" ring />
                                        <span className={cn(
                                            "absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-white",
                                            isDelete ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                                        )} aria-hidden="true">
                                            <Icon size={11} />
                                        </span>
                                    </div>

                                    <div className="flex min-w-0 flex-1 flex-col pt-2">
                                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                                            {generateLogSentence(log)}
                                            <time
                                                dateTime={log.createdAt}
                                                title={new Date(log.createdAt).toLocaleString()}
                                                className="tabular shrink-0 text-xs text-gray-600"
                                            >
                                                {relativeTime(log.createdAt)}
                                            </time>
                                        </div>

                                        {/* Raw IDs for admins on hover */}
                                        {isAdmin && (
                                            <div className="hidden pt-1 font-mono text-[11px] text-gray-500 group-hover:flex group-hover:flex-wrap group-hover:gap-x-3">
                                                <span>Entity {log.entityId}</span>
                                                <span>User {log.user?._id}</span>
                                            </div>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </div>
        </div>
    );
};
