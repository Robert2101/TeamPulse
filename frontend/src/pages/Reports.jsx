import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, RotateCw, UserRound } from "lucide-react";
import api from "../lib/axios";
import { useStore } from "../store/useStore";
import { ProjectStatusBadge } from "../components/ui/badges";
import { PriorityIcon } from "../components/ui/priority-icon";
import { Pulse } from "../components/ui/pulse";
import { Avatar } from "../components/ui/avatar";
import { TASK_STATUS_DOT, taskKey } from "../lib/taskMeta";
import { formatDate, firstName, errorMessage } from "../lib/format";
import { btn, card } from "../lib/styles";
import { cn } from "../lib/utils";
import { gsap, useGSAP, EASE_OUT, prefersReducedMotion } from "../lib/motion";

const STAGES = ["To-Do", "In-Progress", "Review", "Done"];
const DAY = 86400000;
const idOf = (v) => (v && typeof v === "object" ? v._id : v)?.toString();
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const daysFromToday = (date) => Math.round((new Date(date).setHours(0, 0, 0, 0) - startOfToday()) / DAY);
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

const greeting = () => {
    const h = new Date().getHours();
    return h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

/** Why a task deserves attention, most urgent reason first; null when it doesn't. */
const attentionReason = (task, { managerView }) => {
    if (task.taskStatus === "Done") return null;
    const due = task.dueDate ? daysFromToday(task.dueDate) : null;
    if (due !== null && due < 0) return { rank: 0, tone: "danger", text: `Overdue ${plural(-due, "day")}` };
    if (task.taskStatus === "Review" && managerView) return { rank: 1, tone: "review", text: "Waiting for review" };
    if (due === 0) return { rank: 2, tone: "warn", text: "Due today" };
    if (due === 1) return { rank: 3, tone: "warn", text: "Due tomorrow" };
    if (managerView && !task.assignee && ["Urgent", "High"].includes(task.priority)) return { rank: 4, tone: "muted", text: "No owner yet" };
    if (due !== null && due <= 3) return { rank: 5, tone: "muted", text: `Due in ${due} days` };
    if (!managerView) return { rank: 6, tone: "muted", text: task.taskStatus === "Review" ? "In review" : task.taskStatus };
    return null;
};

const TONE = {
    danger: "bg-red-50 text-red-700 ring-red-200",
    review: "bg-amber-50 text-amber-800 ring-amber-200",
    warn: "bg-amber-50 text-amber-800 ring-amber-200",
    muted: "bg-gray-100 text-gray-700 ring-gray-200",
};

const Section = ({ title, aside, children, className }) => (
    <section className={cn(card, "overflow-hidden", className)}>
        <div className="flex items-baseline justify-between gap-4 border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
            {aside}
        </div>
        {children}
    </section>
);

const AttentionList = ({ items, projectById, emptyText }) => (
    items.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-gray-600">{emptyText}</p>
    ) : (
        <ul className="divide-y divide-gray-100">
            {items.map(({ task, reason }) => {
                const project = projectById[idOf(task.projectReference)];
                const key = taskKey(task, project);
                return (
                    <li key={task._id}>
                        <Link
                            to={`/project/${idOf(task.projectReference)}?task=${task._id}`}
                            className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-gray-50"
                        >
                            <span className={cn("size-2 shrink-0 rounded-full", TASK_STATUS_DOT[task.taskStatus])} title={task.taskStatus} aria-hidden="true" />
                            <PriorityIcon priority={task.priority} />
                            <span className="min-w-0 flex-1">
                                <span className="flex items-baseline gap-2">
                                    {key && <span className="shrink-0 tabular text-[11px] font-medium text-gray-500">{key}</span>}
                                    <span className="truncate text-sm font-medium text-gray-900">{task.taskName}</span>
                                </span>
                                <span className="mt-0.5 block truncate text-xs text-gray-500">{project?.projectName}</span>
                            </span>
                            <span className={cn("hidden shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset sm:inline", TONE[reason.tone])}>{reason.text}</span>
                            {task.assignee
                                ? <Avatar name={task.assignee.fullName} src={task.assignee.profilePicture} size="xs" />
                                : <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-400" title="Unassigned"><UserRound size={12} aria-label="Unassigned" /></span>}
                        </Link>
                    </li>
                );
            })}
        </ul>
    )
);

const ProjectRow = ({ project, tasks, pulse }) => {
    const done = tasks.filter((t) => t.taskStatus === "Done").length;
    const overdue = tasks.filter((t) => t.taskStatus !== "Done" && t.dueDate && daysFromToday(t.dueDate) < 0).length;
    const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    return (
        <li>
            <Link to={`/project/${project._id}`} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-3.5 transition-colors hover:bg-gray-50 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto_auto]">
                <span className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-5 min-w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 px-1 tabular text-[11px] font-medium text-gray-600">{project.key ?? "—"}</span>
                    <span className="truncate text-sm font-medium text-gray-900">{project.projectName}</span>
                    <ProjectStatusBadge status={project.projectStatus} className="hidden lg:inline-flex" />
                </span>
                <span className="col-span-2 flex items-center gap-2.5 md:col-span-1" title={`${done} of ${tasks.length} tasks done`}>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <span className="block h-full rounded-full bg-gray-800" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="tabular w-16 shrink-0 text-right text-xs text-gray-600">{done}/{tasks.length} done</span>
                </span>
                <Pulse values={pulse} width={64} height={18} className="hidden md:block" />
                <span className={cn("tabular w-28 whitespace-nowrap text-right text-xs", overdue ? "font-medium text-red-700" : "text-gray-500")}>
                    {overdue ? `${overdue} overdue` : project.endDate ? `Due ${formatDate(project.endDate, { short: true })}` : "—"}
                </span>
            </Link>
        </li>
    );
};

const Distribution = ({ tasks }) => {
    const barRef = useRef(null);
    const total = tasks.length;
    const counts = STAGES.map((s) => tasks.filter((t) => t.taskStatus === s).length);

    // One short reveal: segments grow left to right so the split reads as it forms.
    useGSAP(() => {
        if (!total || prefersReducedMotion()) return;
        gsap.from(barRef.current.children, { scaleX: 0, transformOrigin: "left center", duration: 0.6, stagger: 0.06, ease: EASE_OUT });
    }, { dependencies: [total > 0], scope: barRef });

    return (
        <Section title="Where work stands" aside={<span className="tabular text-xs text-gray-500">{plural(total, "task")}</span>}>
            <div className="p-5">
                <div ref={barRef} className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-gray-100" role="img" aria-label={STAGES.map((s, i) => `${s}: ${counts[i]}`).join(", ")}>
                    {STAGES.map((s, i) => counts[i] > 0 && (
                        <span key={s} className={cn("h-full", TASK_STATUS_DOT[s])} style={{ width: `${(counts[i] / total) * 100}%` }} />
                    ))}
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
                    {STAGES.map((s, i) => (
                        <div key={s} className="flex items-center gap-2 text-sm">
                            <span className={cn("size-2 shrink-0 rounded-full", TASK_STATUS_DOT[s])} aria-hidden="true" />
                            <dt className="text-gray-600">{s}</dt>
                            <dd className="tabular ml-auto font-medium text-gray-900">{counts[i]}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </Section>
    );
};

const Workload = ({ tasks }) => {
    const people = useMemo(() => {
        const byPerson = new Map();
        for (const t of tasks) {
            if (t.taskStatus === "Done" || !t.assignee) continue;
            const id = idOf(t.assignee);
            const entry = byPerson.get(id) || { person: t.assignee, open: 0, overdue: 0 };
            entry.open += 1;
            if (t.dueDate && daysFromToday(t.dueDate) < 0) entry.overdue += 1;
            byPerson.set(id, entry);
        }
        return [...byPerson.values()].sort((a, b) => b.open - a.open).slice(0, 6);
    }, [tasks]);
    const max = Math.max(1, ...people.map((p) => p.open));

    return (
        <Section title="Open work by person">
            {people.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-gray-600">Nobody has open tasks.</p>
            ) : (
                <ul className="flex flex-col gap-3 p-5">
                    {people.map(({ person, open, overdue }) => (
                        <li key={idOf(person)} className="flex items-center gap-3">
                            <Avatar name={person.fullName} src={person.profilePicture} size="sm" />
                            <span className="min-w-0 flex-1">
                                <span className="flex items-baseline justify-between gap-2 text-sm">
                                    <span className="truncate text-gray-900">{person.fullName}</span>
                                    <span className="tabular shrink-0 text-xs text-gray-600">
                                        {open} open{overdue > 0 && <span className="font-medium text-red-700"> · {overdue} overdue</span>}
                                    </span>
                                </span>
                                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-gray-100">
                                    <span className={cn("block h-full rounded-full", overdue ? "bg-red-500" : "bg-gray-700")} style={{ width: `${(open / max) * 100}%` }} />
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </Section>
    );
};

export const Reports = () => {
    const { projects, projectsLoaded, user, pulse } = useStore();
    const [tasks, setTasks] = useState(null);
    const [error, setError] = useState(null);

    const role = user?.role?.roleName;
    const managerView = role === "Admin" || role === "Project Manager";
    const stakeholder = role === "Stakeholder";

    const [reloadKey, setReloadKey] = useState(0);
    const retry = useCallback(() => setReloadKey((k) => k + 1), []);

    useEffect(() => {
        let cancelled = false;
        api.get("/tasks/overview")
            .then((res) => { if (!cancelled) { setTasks(res.data); setError(null); } })
            .catch((err) => { if (!cancelled) { setError(err); setTasks([]); } });
        return () => { cancelled = true; };
    }, [reloadKey]);

    const projectById = useMemo(() => Object.fromEntries(projects.map((p) => [p._id, p])), [projects]);
    const all = useMemo(() => tasks || [], [tasks]);
    const mine = useMemo(() => all.filter((t) => idOf(t.assignee) === idOf(user?._id)), [all, user?._id]);

    if (tasks === null || !projectsLoaded) {
        return (
            <div className="mx-auto max-w-7xl animate-pulse" role="status" aria-label="Loading overview">
                <div className="h-9 w-72 rounded-lg bg-gray-200" />
                <div className="mt-3 h-5 w-96 max-w-full rounded bg-gray-100" />
                <div className="mt-8 grid gap-6 lg:grid-cols-3">
                    <div className="h-96 rounded-2xl bg-gray-100 lg:col-span-2" />
                    <div className="h-96 rounded-2xl bg-gray-100" />
                </div>
            </div>
        );
    }

    // What needs attention: across every visible project for managers, your own work otherwise.
    const pool = managerView ? all : stakeholder ? [] : mine;
    const attention = pool
        .map((task) => ({ task, reason: attentionReason(task, { managerView }) }))
        .filter((x) => x.reason)
        .sort((a, b) => a.reason.rank - b.reason.rank || new Date(a.task.dueDate || 8.64e15) - new Date(b.task.dueDate || 8.64e15))
        .slice(0, 8);
    // Stakeholders follow progress: what moved most recently.
    const moving = [...all].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 6)
        .map((task) => ({ task, reason: { tone: "muted", text: task.taskStatus === "Done" ? "Done" : task.taskStatus } }));

    const open = (list) => list.filter((t) => t.taskStatus !== "Done");
    const overdueCount = (list) => open(list).filter((t) => t.dueDate && daysFromToday(t.dueDate) < 0).length;
    const reviewCount = all.filter((t) => t.taskStatus === "Review").length;
    const active = projects.filter((p) => p.projectStatus === "Active").length;

    let summary;
    if (managerView) {
        const parts = [];
        const od = overdueCount(all);
        if (od) parts.push(<><strong className="font-semibold text-red-700">{plural(od, "task")}</strong> {od === 1 ? "is" : "are"} overdue</>);
        if (reviewCount) parts.push(<><strong className="font-semibold text-gray-900">{reviewCount}</strong> waiting for review</>);
        parts.push(<><strong className="font-semibold text-gray-900">{plural(active, "project")}</strong> active</>);
        summary = parts.map((part, i) => (
            <span key={i}>{i === 0 ? "" : i === parts.length - 1 ? " and " : ", "}{part}</span>
        ));
    } else if (stakeholder) {
        summary = <>You're following <strong className="font-semibold text-gray-900">{plural(projects.length, "project")}</strong>. Here's what moved most recently.</>;
    } else {
        const od = overdueCount(mine);
        summary = <>You have <strong className="font-semibold text-gray-900">{plural(open(mine).length, "open task")}</strong>{od ? <>, and <strong className="font-semibold text-red-700">{od}</strong> {od === 1 ? "is" : "are"} overdue</> : null}.</>;
    }

    const tasksFor = (projectId) => all.filter((t) => idOf(t.projectReference) === projectId);
    const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

    return (
        <div className="mx-auto max-w-7xl pb-12">
            <header className="mb-8">
                <p className="text-sm text-gray-500">{today}</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
                    {greeting()}{firstName(user?.fullName) ? `, ${firstName(user.fullName)}` : ""}
                </h1>
                <p className="mt-2 text-gray-600">{summary}</p>
            </header>

            {error && (
                <p role="alert" className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <AlertCircle size={16} aria-hidden="true" /> Couldn't load tasks: {errorMessage(error)}
                    <button onClick={retry} className={cn(btn.ghost, "ml-auto px-2 py-1 text-amber-900 hover:bg-amber-100")}><RotateCw size={14} aria-hidden="true" /> Retry</button>
                </p>
            )}

            <div className="grid items-start gap-6 lg:grid-cols-3">
                <div className="flex flex-col gap-6 lg:col-span-2">
                    <Section
                        title={stakeholder ? "Recently updated" : managerView ? "Needs attention" : "Your focus"}
                        aside={!stakeholder && <Link to="/tasks" className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900">My tasks <ArrowRight size={13} aria-hidden="true" /></Link>}
                    >
                        <AttentionList
                            items={stakeholder ? moving : attention}
                            projectById={projectById}
                            emptyText={managerView ? "Nothing is overdue, waiting or unowned. A rare, quiet day." : "Nothing assigned to you needs attention."}
                        />
                    </Section>

                    <Section title="Projects" aside={<Link to="/projects" className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900">All projects <ArrowRight size={13} aria-hidden="true" /></Link>}>
                        {projects.length === 0 ? (
                            <p className="px-5 py-10 text-center text-sm text-gray-600">
                                {managerView ? "No projects yet. Create one from the Projects page." : "You haven't been added to a project yet."}
                            </p>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {projects.map((p) => <ProjectRow key={p._id} project={p} tasks={tasksFor(p._id)} pulse={pulse?.byProject?.[p._id]} />)}
                            </ul>
                        )}
                    </Section>
                </div>

                <div className="flex flex-col gap-6">
                    <Distribution tasks={managerView || stakeholder ? all : mine} />
                    {managerView && <Workload tasks={all} />}
                </div>
            </div>
        </div>
    );
};
