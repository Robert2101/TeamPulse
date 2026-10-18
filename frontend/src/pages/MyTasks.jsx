import { useCallback, useEffect, useState } from "react";
import { Calendar, FolderKanban, ListChecks, RotateCw } from "lucide-react";
import api from "../lib/axios";
import { Link } from "react-router-dom";
import { PriorityBadge, TaskStatusBadge } from "../components/ui/badges";
import { formatDate, isOverdue, errorMessage } from "../lib/format";
import { btn, card } from "../lib/styles";
import { cn } from "../lib/utils";

const FILTERS = [
    { id: "open", label: "Open" },
    { id: "done", label: "Completed" },
];

export const MyTasks = () => {
    const [myTasks, setMyTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState("open");

    const fetchMyTasks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/tasks/mine');
            setMyTasks(res.data);
        } catch (err) {
            console.error("Failed to load your tasks", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchMyTasks(); }, [fetchMyTasks]);

    const open = myTasks.filter((t) => t.taskStatus !== "Done");
    const done = myTasks.filter((t) => t.taskStatus === "Done");
    const visible = filter === "open" ? open : done;

    return (
        <div className="mx-auto max-w-5xl space-y-6 pb-12">
            <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">My tasks</h1>
                    <p className="mt-2 text-gray-600">Everything assigned to you across your projects.</p>
                </div>
                <div role="tablist" aria-label="Filter tasks" className="inline-flex self-start rounded-lg bg-gray-100 p-1 sm:self-auto">
                    {FILTERS.map((f) => {
                        const count = f.id === "open" ? open.length : done.length;
                        return (
                            <button
                                key={f.id}
                                role="tab"
                                aria-selected={filter === f.id}
                                onClick={() => setFilter(f.id)}
                                className={cn(
                                    "flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
                                    filter === f.id ? "bg-white text-gray-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)]" : "text-gray-600 hover:text-gray-900"
                                )}
                            >
                                {f.label} {!loading && <span className="tabular text-gray-600">{count}</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {loading ? (
                <div className="grid gap-4 md:grid-cols-2" role="status" aria-label="Loading your tasks">
                    {[0, 1, 2, 3].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-gray-100" />)}
                </div>
            ) : error ? (
                <div className="flex flex-col items-center rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center">
                    <p className="font-medium text-red-900">Couldn't load your tasks</p>
                    <p className="mt-1 text-sm text-red-800">{errorMessage(error)}</p>
                    <button onClick={fetchMyTasks} className={`${btn.secondary} mt-4`}><RotateCw size={14} aria-hidden="true" /> Try again</button>
                </div>
            ) : visible.length === 0 ? (
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
                    <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-600"><ListChecks size={22} aria-hidden="true" /></span>
                    <p className="font-medium text-gray-900">{filter === "open" ? "Nothing on your plate" : "No completed tasks yet"}</p>
                    <p className="mt-1 max-w-sm text-sm text-gray-600">
                        {filter === "open"
                            ? "When someone assigns you a task, it shows up here."
                            : "Tasks you finish will collect here."}
                    </p>
                </div>
            ) : (
                <ul className="grid gap-4 md:grid-cols-2">
                    {visible.map((task) => {
                        const project = task.projectReference;
                        const projectId = typeof project === "object" ? project?._id : project;
                        const overdue = isOverdue(task.dueDate, task.taskStatus);
                        return (
                            <li key={task._id} className="min-w-0">
                                <Link
                                    to={projectId ? `/project/${projectId}` : "/projects"}
                                    className={cn(card, "group flex h-full flex-col p-5 transition-[border-color,box-shadow] hover:border-gray-300 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]")}
                                >
                                    <div className="mb-3 flex items-center justify-between gap-2">
                                        <PriorityBadge priority={task.priority} />
                                        <TaskStatusBadge status={task.taskStatus} />
                                    </div>
                                    <h2 className="line-clamp-2 font-semibold text-gray-900 wrap-anywhere">{task.taskName}</h2>
                                    {task.taskDescription && <p className="mt-1.5 line-clamp-2 text-sm text-gray-600 wrap-anywhere">{task.taskDescription}</p>}

                                    <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-xs">
                                        <span className={cn("flex items-center gap-1.5", overdue ? "font-medium text-red-700" : "text-gray-600")}>
                                            <Calendar size={14} aria-hidden="true" />
                                            {task.dueDate ? `${overdue ? "Overdue · " : "Due "}${formatDate(task.dueDate)}` : "No due date"}
                                        </span>
                                        <span className="flex min-w-0 items-center gap-1.5 text-gray-700 group-hover:text-gray-900">
                                            <FolderKanban size={14} className="shrink-0" aria-hidden="true" />
                                            <span className="truncate">{project?.projectName || "Open project"}</span>
                                        </span>
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};
