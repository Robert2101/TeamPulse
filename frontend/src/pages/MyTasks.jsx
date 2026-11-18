import { useCallback, useEffect, useState } from "react";
import { ListChecks, RotateCw } from "lucide-react";
import api from "../lib/axios";
import { Link } from "react-router-dom";
import { PriorityIcon } from "../components/ui/priority-icon";
import { TASK_STATUS_DOT, taskKey } from "../lib/taskMeta";
import { formatDate, errorMessage } from "../lib/format";
import { btn, card } from "../lib/styles";
import { cn } from "../lib/utils";

const DAY = 86400000;
const daysUntil = (date) => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return Math.round((new Date(date).setHours(0, 0, 0, 0) - start.getTime()) / DAY);
};

const dueLabel = (task) => {
    if (task.taskStatus === "Done") return task.completedAt ? `Done ${formatDate(task.completedAt, { short: true })}` : "Done";
    if (!task.dueDate) return "No due date";
    const d = daysUntil(task.dueDate);
    if (d < 0) return `${-d} day${d === -1 ? "" : "s"} overdue`;
    if (d === 0) return "Due today";
    if (d === 1) return "Due tomorrow";
    if (d < 7) return `Due ${new Date(task.dueDate).toLocaleDateString(undefined, { weekday: "long" })}`;
    return `Due ${formatDate(task.dueDate, { short: true })}`;
};

// Open work grouped by when it is due, soonest first; completed work by when it was finished.
const groupTasks = (tasks, filter) => {
    if (filter === "done") {
        return [{ title: "Completed", tasks: [...tasks].sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0)) }];
    }
    const groups = [
        { title: "Overdue", tone: "danger", test: (d) => d !== null && d < 0 },
        { title: "Today and tomorrow", test: (d) => d === 0 || d === 1 },
        { title: "Next 7 days", test: (d) => d !== null && d > 1 && d <= 7 },
        { title: "Later", test: (d) => d !== null && d > 7 },
        { title: "No due date", test: (d) => d === null },
    ];
    const sorted = [...tasks].sort((a, b) => new Date(a.dueDate || 8.64e15) - new Date(b.dueDate || 8.64e15));
    return groups
        .map((g) => ({ ...g, tasks: sorted.filter((t) => g.test(t.dueDate ? daysUntil(t.dueDate) : null)) }))
        .filter((g) => g.tasks.length > 0);
};

const TaskRow = ({ task }) => {
    const project = task.projectReference;
    const projectId = typeof project === "object" ? project?._id : project;
    const key = taskKey(task);
    const overdue = task.taskStatus !== "Done" && task.dueDate && daysUntil(task.dueDate) < 0;
    return (
        <li>
            <Link
                to={projectId ? `/project/${projectId}?task=${task._id}` : "/projects"}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 sm:px-5"
            >
                <span className={cn("size-2 shrink-0 rounded-full", TASK_STATUS_DOT[task.taskStatus])} title={task.taskStatus} aria-hidden="true" />
                <PriorityIcon priority={task.priority} />
                <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                        {key && <span className="shrink-0 font-mono text-[11px] font-medium text-gray-500">{key}</span>}
                        <span className="truncate text-sm font-medium text-gray-900">{task.taskName}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-gray-500">
                        {project?.projectName || "Project"} · {task.taskStatus}
                    </span>
                </span>
                <span className={cn("tabular shrink-0 text-xs", overdue ? "font-medium text-red-700" : "text-gray-600")}>{dueLabel(task)}</span>
            </Link>
        </li>
    );
};

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
                <div className="flex flex-col gap-2" role="status" aria-label="Loading your tasks">
                    {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />)}
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
                <div className="flex flex-col gap-6">
                    {groupTasks(visible, filter).map(({ title, tone, tasks }) => (
                        <section key={title} aria-label={title}>
                            <h2 className={cn("mb-2 flex items-center gap-2 px-1 text-xs font-medium", tone === "danger" ? "text-red-700" : "text-gray-500")}>
                                {title} <span className="tabular font-normal text-gray-400">{tasks.length}</span>
                            </h2>
                            <ul className={cn(card, "divide-y divide-gray-100 overflow-hidden")}>
                                {tasks.map((task) => <TaskRow key={task._id} task={task} />)}
                            </ul>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
};
