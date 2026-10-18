import { useEffect, useRef, useState } from "react";
import { AlertCircle, Calendar, ChevronRight } from "lucide-react";
import api from "../lib/axios";
import { useStore } from "../store/useStore";
import { Link } from "react-router-dom";
import { PriorityBadge, ProjectStatusBadge, TaskStatusBadge } from "../components/ui/badges";
import { TASK_STATUS_DOT } from "../lib/taskMeta";
import { formatDate, isOverdue, firstName } from "../lib/format";
import { card } from "../lib/styles";
import { cn } from "../lib/utils";
import { gsap, useGSAP, EASE_OUT, prefersReducedMotion } from "../lib/motion";

// Workflow stages, in board order. Colors validated with the dataviz palette checker (all checks pass).
const STAGES = [
    { key: "todo", label: "To-Do" },
    { key: "inProgress", label: "In-Progress" },
    { key: "review", label: "Review" },
    { key: "done", label: "Done" },
];

const Stat = ({ label, value, tone }) => (
    <div className="min-w-0 px-5 py-4">
        <dt className="truncate text-sm text-gray-600">{label}</dt>
        <dd className={cn("tabular mt-1 text-3xl font-semibold tracking-tight", tone === "alert" && value > 0 ? "text-red-700" : "text-gray-900")}>{value}</dd>
    </div>
);

const StatStrip = ({ children }) => (
    <dl className={cn(card, "grid grid-cols-2 divide-gray-200 lg:grid-cols-4 [&>*:nth-child(n+3)]:border-t lg:[&>*:nth-child(n+3)]:border-t-0 [&>*:nth-child(even)]:border-l lg:[&>*:not(:first-child)]:border-l")}>
        {children}
    </dl>
);

const WorkflowBar = ({ stats }) => {
    const total = STAGES.reduce((sum, s) => sum + (stats[s.key] || 0), 0);
    const barRef = useRef(null);

    // One short reveal: segments grow left-to-right so the split reads as it forms.
    useGSAP(() => {
        if (!total || prefersReducedMotion()) return;
        gsap.from(barRef.current.children, { scaleX: 0, transformOrigin: "left center", duration: 0.6, stagger: 0.08, ease: EASE_OUT });
    }, { dependencies: [total > 0], scope: barRef });

    return (
        <section className={cn(card, "p-5")} aria-labelledby="workflow-heading">
            <div className="flex items-baseline justify-between gap-4">
                <h2 id="workflow-heading" className="text-base font-semibold text-gray-900">Where work stands</h2>
                <span className="tabular text-sm text-gray-600">{total} task{total === 1 ? "" : "s"}</span>
            </div>
            {total === 0 ? (
                <p className="mt-4 text-sm text-gray-600">No tasks yet. Once projects have tasks, their progress shows here.</p>
            ) : (
                <>
                    <div ref={barRef} className="mt-4 flex h-3 w-full gap-0.5 overflow-hidden rounded" role="img" aria-label={STAGES.map(s => `${s.label}: ${stats[s.key] || 0}`).join(", ")}>
                        {STAGES.map((s) => {
                            const count = stats[s.key] || 0;
                            if (!count) return null;
                            return (
                                <div
                                    key={s.key}
                                    className={cn("h-full first:rounded-l last:rounded-r transition-opacity hover:opacity-80", TASK_STATUS_DOT[s.label])}
                                    style={{ width: `${(count / total) * 100}%` }}
                                    title={`${s.label}: ${count} (${Math.round((count / total) * 100)}%)`}
                                />
                            );
                        })}
                    </div>
                    <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                        {STAGES.map((s) => {
                            const count = stats[s.key] || 0;
                            return (
                                <li key={s.key} className="flex items-center gap-2 text-sm">
                                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-sm", TASK_STATUS_DOT[s.label])} aria-hidden="true" />
                                    <span className="text-gray-700">{s.label}</span>
                                    <span className="tabular ml-auto font-medium text-gray-900 sm:ml-0">{count}</span>
                                    <span className="tabular text-gray-500">{Math.round((count / total) * 100)}%</span>
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}
        </section>
    );
};

const PageHeader = ({ title, subtitle }) => (
    <div className="border-b border-gray-200 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">{title}</h1>
        <p className="mt-2 text-gray-600">{subtitle}</p>
    </div>
);

export const Reports = () => {
    const { projects, projectsLoaded, user } = useStore();
    const isAdmin = user?.role?.roleName === "Admin";

    // Global Stats (For Admin)
    const [globalStats, setGlobalStats] = useState({ todo: 0, inProgress: 0, review: 0, done: 0, total: 0, urgent: 0 });
    // Personal Stats (For Members)
    const [myTasks, setMyTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (isAdmin && !projectsLoaded) return;
        const fetchDashboardData = async () => {
            setError(false);
            try {
                if (isAdmin) {
                    if (projects.length === 0) return;
                    // ADMIN COMMAND CENTER LOGIC: Use single workspace aggregate stats endpoint (cached in Redis)
                    const res = await api.get('/tasks/stats');
                    setGlobalStats(res.data);
                } else {
                    // PERSONAL WORKSPACE LOGIC
                    const res = await api.get('/tasks/mine');
                    setMyTasks(res.data);
                }
            } catch (err) {
                console.error("Failed to load dashboard data", err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [projects.length, projectsLoaded, isAdmin]);

    if (loading) {
        return (
            <div className="mx-auto max-w-7xl animate-pulse space-y-8" role="status" aria-label="Loading overview">
                <div className="h-8 w-56 rounded bg-gray-200" />
                <div className="h-24 rounded-2xl bg-gray-100" />
                <div className="h-28 rounded-2xl bg-gray-100" />
                <div className="h-64 rounded-2xl bg-gray-100" />
            </div>
        );
    }

    const errorBanner = error && (
        <p role="alert" className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertCircle size={16} aria-hidden="true" /> Some numbers couldn't be loaded and may be out of date. Refresh to try again.
        </p>
    );

    // ==========================================
    // ADMIN COMMAND CENTER
    // ==========================================
    if (isAdmin) {
        return (
            <div className="mx-auto max-w-7xl space-y-6 pb-12">
                <PageHeader title="Workspace overview" subtitle="Task progress and every project across your organization." />
                {errorBanner}

                <StatStrip>
                    <Stat label="Projects" value={projects.length} />
                    <Stat label="Tasks" value={globalStats.total} />
                    <Stat label="Completed" value={globalStats.done} />
                    <Stat label="Urgent and open" value={globalStats.urgent} tone="alert" />
                </StatStrip>

                <WorkflowBar stats={globalStats} />

                {/* Admin project directory */}
                <section className={cn(card, "overflow-hidden")} aria-labelledby="directory-heading">
                    <div className="flex items-center justify-between border-b border-gray-200 p-5">
                        <h2 id="directory-heading" className="text-base font-semibold text-gray-900">Project directory</h2>
                        <Link to="/projects" className="text-sm font-medium text-indigo-700 hover:underline">View as cards</Link>
                    </div>

                    {projects.length === 0 ? (
                        <p className="p-8 text-center text-sm text-gray-600">No projects in this workspace yet.</p>
                    ) : (
                        <div className="relative overflow-x-auto">
                            <table className="w-full min-w-160 text-left text-sm text-gray-700">
                                <thead className="bg-gray-50 text-xs text-gray-600">
                                    <tr>
                                        <th scope="col" className="px-5 py-3 font-medium">Project</th>
                                        <th scope="col" className="px-5 py-3 font-medium">Manager</th>
                                        <th scope="col" className="px-5 py-3 font-medium">Status</th>
                                        <th scope="col" className="px-5 py-3 font-medium">Priority</th>
                                        <th scope="col" className="px-5 py-3"><span className="sr-only">Open</span></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {projects.map((p) => (
                                        <tr key={p._id} className="transition-colors hover:bg-gray-50">
                                            <td className="max-w-88 px-5 py-3.5">
                                                <Link to={`/project/${p._id}`} className="line-clamp-2 font-medium text-gray-900 wrap-anywhere hover:underline">{p.projectName}</Link>
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-3.5">{p.projectManager?.fullName || "Unassigned"}</td>
                                            <td className="px-5 py-3.5"><ProjectStatusBadge status={p.projectStatus} /></td>
                                            <td className="px-5 py-3.5"><PriorityBadge priority={p.priority} /></td>
                                            <td className="px-5 py-3.5 text-right">
                                                <Link to={`/project/${p._id}`} className="inline-flex items-center gap-1 rounded font-medium text-gray-700 hover:text-gray-900" aria-label={`Open ${p.projectName}`}>
                                                    Open <ChevronRight size={14} aria-hidden="true" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        );
    }

    // ==========================================
    // PERSONAL DESK: TEAM MEMBER / PM VIEW
    // ==========================================
    const myTodo = myTasks.filter((t) => t.taskStatus !== "Done");
    const myDone = myTasks.filter((t) => t.taskStatus === "Done");
    const myUrgent = myTodo.filter((t) => t.priority === "Urgent" || t.priority === "High");
    const myOverdue = myTodo.filter((t) => isOverdue(t.dueDate, t.taskStatus));
    // Overdue first, then urgency, then soonest due date.
    const rank = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
    const queue = [...myTodo].sort((a, b) =>
        (isOverdue(b.dueDate, b.taskStatus) - isOverdue(a.dueDate, a.taskStatus)) ||
        ((rank[a.priority] ?? 4) - (rank[b.priority] ?? 4)) ||
        ((a.dueDate ? new Date(a.dueDate) : Infinity) - (b.dueDate ? new Date(b.dueDate) : Infinity))
    );

    return (
        <div className="mx-auto max-w-6xl space-y-6 pb-12">
            <PageHeader
                title={`Welcome back${firstName(user?.fullName) ? `, ${firstName(user.fullName)}` : ""}`}
                subtitle="Here's what needs your attention."
            />
            {errorBanner}

            <StatStrip>
                <Stat label="Open tasks" value={myTodo.length} />
                <Stat label="Completed" value={myDone.length} />
                <Stat label="High or urgent" value={myUrgent.length} />
                <Stat label="Overdue" value={myOverdue.length} tone="alert" />
            </StatStrip>

            {/* Priority Queue */}
            <section className={cn(card, "overflow-hidden")} aria-labelledby="queue-heading">
                <div className="flex items-center justify-between border-b border-gray-200 p-5">
                    <h2 id="queue-heading" className="text-base font-semibold text-gray-900">Up next</h2>
                    {myTodo.length > 5 && <Link to="/tasks" className="text-sm font-medium text-indigo-700 hover:underline">All {myTodo.length} tasks</Link>}
                </div>

                {myTodo.length === 0 ? (
                    <div className="p-10 text-center">
                        <p className="font-medium text-gray-900">You're all caught up</p>
                        <p className="mt-1 text-sm text-gray-600">No open tasks are assigned to you.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {queue.slice(0, 5).map((task) => {
                            const overdue = isOverdue(task.dueDate, task.taskStatus);
                            return (
                                <li key={task._id}>
                                    <Link
                                        to={`/project/${task.projectReference?._id || task.projectReference}`}
                                        className="group flex flex-col gap-2 p-4 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <PriorityBadge priority={task.priority} />
                                                <h3 className="truncate font-medium text-gray-900">{task.taskName}</h3>
                                            </div>
                                            <p className={cn("mt-1 flex items-center gap-1.5 text-xs", overdue ? "font-medium text-red-700" : "text-gray-600")}>
                                                <Calendar size={12} aria-hidden="true" />
                                                {task.dueDate ? `${overdue ? "Overdue · " : "Due "}${formatDate(task.dueDate)}` : "No due date"}
                                                {task.projectReference?.projectName && <span className="truncate text-gray-600">· {task.projectReference.projectName}</span>}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-3">
                                            <TaskStatusBadge status={task.taskStatus} />
                                            <ChevronRight size={16} className="hidden text-gray-400 group-hover:text-gray-700 sm:block" aria-hidden="true" />
                                        </div>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </div>
    );
};
