import { useLayoutEffect, useRef, useState } from "react";
import { Calendar, FolderKanban, LayoutDashboard, ListChecks, Lock, MessageSquare, Activity, Plus, Search, Settings, Users } from "lucide-react";
import { gsap, Flip, prefersReducedMotion } from "../../lib/motion";
import { Avatar } from "../ui/avatar";
import { LogoMark } from "../ui/logo";
import { Pulse } from "../ui/pulse";
import { PriorityIcon } from "../ui/priority-icon";
import { ProjectStatusBadge } from "../ui/badges";
import { TASK_STATUS_DOT } from "../../lib/taskMeta";
import { formatDate } from "../../lib/format";
import { cn } from "../../lib/utils";
import { PREVIEW_ROLES } from "../../lib/demo";

// This figure is a fragment of the real interface (data-ui): it keeps the app's own rules, card shadow,
// keyboard hint and brand accent, exactly as the board renders them.
const UI = {
    cardShadow: "shadow-[0_1px_2px_rgba(15,23,42,0.05)]", // taste-skill-ignore: app card
    ruleR: "border-r border-gray-200", // taste-skill-ignore: app sidebar edge
    ruleB: "border-b border-gray-200", // taste-skill-ignore: app header edge
    ruleT: "border-t border-gray-200", // taste-skill-ignore: app activity bar edge
    mono: "font-mono", // taste-skill-ignore: keyboard shortcut, literal key names
    accentIcon: "text-indigo-600", // taste-skill-ignore: brand accent, active nav
    accentChip: "bg-indigo-50 text-indigo-700", // taste-skill-ignore: brand accent, current project
    accentButton: "bg-indigo-600 text-white", // taste-skill-ignore: brand primary action
};

const COLUMNS = ["To-Do", "In-Progress", "Review", "Done"];
const inDays = (days) => formatDate(new Date(Date.now() + days * 86400000), { short: true });
// The Mobile app 3.0 board from the demo workspace (same keys, people and relative dates).
const TASKS = [
    { id: "app-5", key: "APP-5", name: "Accessibility pass (WCAG 2.2 AA)", status: "To-Do", priority: "High", who: null, due: inDays(12), comments: 1 },
    { id: "app-4", key: "APP-4", name: "Push reminder before online check-in opens", status: "To-Do", priority: "Medium", who: "Aisha Bello", due: inDays(9) },
    { id: "app-2", key: "APP-2", name: "Crash when switching currency on Android", status: "In-Progress", priority: "Urgent", who: "Lucas Moreau", due: inDays(1), comments: 2 },
    { id: "app-3", key: "APP-3", name: "Offline trip timeline", status: "In-Progress", priority: "High", who: "Lucas Moreau", due: inDays(4), comments: 3 },
    { id: "app-1", key: "APP-1", name: "One-tap rebooking for cancelled flights", status: "Review", priority: "Urgent", who: "Lucas Moreau", due: inDays(-1), overdue: true, comments: 2 },
    { id: "app-7", key: "APP-7", name: "Home feed redesign", status: "Done", priority: "High", who: "Sam Rivera", due: inDays(-6), comments: 2 },
];
const PULSE = [2, 1, 3, 2, 0, 1, 4, 3, 2, 5, 3, 4, 6, 4];
const NAV = [
    { label: "Overview", icon: LayoutDashboard },
    { label: "My Tasks", icon: ListChecks },
    { label: "Projects", icon: FolderKanban, active: true },
    { label: "AI Assistant", icon: MessageSquare },
    { label: "Audit Log", icon: Activity, audit: true },
];
const SIDEBAR_PROJECTS = [["APP", "Mobile app 3.0", PULSE], ["API", "Partner API", [1, 3, 2, 2, 4, 1, 0, 2, 3, 2, 4, 3, 5, 3]], ["WEB", "Website relaunch", [0, 0, 1, 0, 0, 2, 0, 1, 0, 0, 1, 2, 0, 1]]];

const Card = ({ task, canMove }) => (
    <li data-flip-id={task.id} className={cn("rounded-lg border border-gray-200 bg-white p-2.5", UI.cardShadow, canMove ? "cursor-grab" : "cursor-default")}>
        <div className="mb-1.5 flex items-center gap-1.5">
            <PriorityIcon priority={task.priority} />
            <span className="tabular text-[10.5px] font-medium text-gray-500">{task.key}</span>
            <span className="ml-auto">{task.who ? <Avatar name={task.who} size="xs" /> : <span className="block size-6 rounded-full border border-dashed border-gray-300" title="Unassigned" />}</span>
        </div>
        <p className="text-[13px] font-medium leading-snug text-gray-900">{task.name}</p>
        <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-600">
            <span className={cn("flex items-center gap-1", task.overdue && task.status !== "Done" && "font-medium text-red-700")}>
                <Calendar size={12} aria-hidden="true" />{task.overdue && task.status !== "Done" ? `Overdue · ${task.due}` : task.due}
            </span>
            {task.comments && <span className="tabular ml-auto flex items-center gap-1"><MessageSquare size={12} aria-hidden="true" />{task.comments}</span>}
        </div>
    </li>
);

/**
 * The demo workspace's Mobile app 3.0 board inside the app's own chrome. After a moment the project
 * manager approves APP-1 and it moves to Done, as every open board would show it. The role switch
 * (rendered by the landing page) changes what the board lets you do.
 */
export const ProductPreview = ({ role = PREVIEW_ROLES[0] }) => {
    const reduced = prefersReducedMotion();
    const [moved, setMoved] = useState(reduced);
    const boardRef = useRef(null);
    const flipState = useRef(null);

    useLayoutEffect(() => {
        if (reduced) return undefined;
        const timer = setTimeout(() => {
            flipState.current = Flip.getState(boardRef.current.querySelectorAll("[data-flip-id]"));
            setMoved(true);
        }, 1800);
        return () => clearTimeout(timer);
    }, [reduced]);

    useLayoutEffect(() => {
        if (!flipState.current) return;
        // The card being moved stays above its neighbours while it travels, like a card being dragged.
        const card = boardRef.current.querySelector('[data-flip-id="app-1"]');
        gsap.set(card, { position: "relative", zIndex: 10 });
        Flip.from(flipState.current, { duration: 0.75, ease: "power3.inOut", scale: false, onComplete: () => gsap.set(card, { clearProps: "position,zIndex" }) });
        gsap.from("[data-live-line]", { opacity: 0, y: 6, duration: 0.4, delay: 0.6, ease: "power2.out" });
        flipState.current = null;
    }, [moved]);

    const statusOf = (task) => (task.id === "app-1" && moved ? "Done" : task.status);

    return (
        <figure data-ui className="overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-[0_32px_80px_-36px_rgba(15,23,42,0.45)]">
            <figcaption className="sr-only">
                The Mobile app 3.0 board in TeamPulse, seen as a {role.label}. The project manager approves APP-1, One-tap rebooking for cancelled flights, and it moves from Review to Done for everyone on the project.
            </figcaption>
            <div aria-hidden="true" className="grid lg:grid-cols-[13rem_minmax(0,1fr)]">
                {/* Sidebar */}
                <div className={cn("hidden flex-col gap-4 bg-gray-50 p-3 lg:flex", UI.ruleR)}>
                    <div className="flex items-center gap-2 px-1 pt-1">
                        <LogoMark size={22} />
                        <span className="text-[13px] font-semibold text-gray-900">Fernway</span>
                    </div>
                    <div className="flex h-7 items-center gap-2 rounded-md border border-gray-200 bg-white px-2 text-[11px] text-gray-500">
                        <Search size={12} /> Search <kbd className={cn("ml-auto rounded border border-gray-200 px-1 text-[10px]", UI.mono)}>⌘K</kbd>
                    </div>
                    <ul className="flex flex-col gap-0.5 text-[12px]">
                        {NAV.filter((n) => !n.audit || role.audit).map((n) => (
                            <li key={n.label} className={cn("flex h-7 items-center gap-2 rounded-md px-2", n.active ? "bg-white font-medium text-gray-900 ring-1 ring-gray-200" : "text-gray-600")}>
                                <n.icon size={13} className={n.active ? UI.accentIcon : "text-gray-500"} /> {n.label}
                            </li>
                        ))}
                    </ul>
                    <div>
                        <p className="mb-1 px-2 text-[10.5px] font-medium text-gray-500">Your projects</p>
                        <ul className="flex flex-col gap-0.5 text-[12px] text-gray-700">
                            {SIDEBAR_PROJECTS.map(([key, name, pulse]) => (
                                <li key={key} className={cn("flex h-7 items-center gap-2 rounded-md px-2", key === "APP" && "bg-white ring-1 ring-gray-200")}>
                                    <span className={cn("tabular rounded px-1 text-[9.5px] font-medium", key === "APP" ? UI.accentChip : "bg-gray-200/70 text-gray-600")}>{key}</span>
                                    <span className="min-w-0 flex-1 truncate">{name}</span>
                                    <Pulse values={pulse} width={26} height={11} active={key === "APP"} />
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Main */}
                <div className="min-w-0">
                    <div className={cn("flex h-11 items-center justify-between gap-3 px-4 text-[12px]", UI.ruleB)}>
                        <span className="truncate text-gray-500">Fernway / Projects / <span className="font-medium text-gray-900">Mobile app 3.0</span></span>
                        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 py-0.5 pl-0.5 pr-2 text-[11px] text-gray-600">
                            <span className="flex size-5 items-center justify-center rounded-full bg-gray-100 text-[9px] font-semibold text-gray-700">{role.label[0]}</span>
                            Viewing as <span className="font-medium text-gray-900">{role.label}</span>
                        </span>
                    </div>
                    <div className="flex flex-wrap items-start justify-between gap-3 px-4 pb-3 pt-4">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="tabular rounded bg-gray-900 px-1.5 py-0.5 text-[10px] font-medium text-white">APP</span>
                                <span className="text-[17px] font-semibold tracking-tight text-gray-900">Mobile app 3.0</span>
                                <ProjectStatusBadge status="Active" />
                            </div>
                            <div className="mt-2 flex items-center gap-4 text-[11px] text-gray-600">
                                <span className="flex items-center gap-1.5"><Pulse values={PULSE} width={64} height={16} active /> 40 updates in 14 days</span>
                                <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-emerald-500" /> Live</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px]">
                            {role.canManage && <span className="flex h-7 items-center gap-1 rounded-md border border-gray-200 px-2 text-gray-700"><Settings size={12} /> Settings</span>}
                            {role.canManage && <span className="hidden h-7 items-center gap-1 rounded-md border border-gray-200 px-2 text-gray-700 sm:flex"><Users size={12} /> Team</span>}
                            {role.canCreate && <span className={cn("flex h-7 items-center gap-1 rounded-md px-2 font-medium", UI.accentButton)}><Plus size={12} /> Add task</span>}
                        </div>
                    </div>
                    {!role.canMove && (
                        <p className="mx-4 mb-2 flex items-center gap-1.5 text-[11px] text-gray-600"><Lock size={11} /> View only. Stakeholders follow and discuss the work but can't change it.</p>
                    )}
                    <div ref={boardRef} className="grid grid-cols-2 gap-2 bg-gray-50/80 p-3 sm:grid-cols-4">
                        {COLUMNS.map((column, i) => {
                            const cards = TASKS.filter((t) => statusOf(t) === column);
                            return (
                                <div key={column} className={cn("min-w-0 rounded-xl border border-gray-200 bg-gray-100/70 p-2", i < 2 && "hidden sm:block")}>
                                    <div className="mb-2 flex items-center justify-between px-0.5">
                                        <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-gray-800">
                                            <span className={cn("size-1.5 rounded-full", TASK_STATUS_DOT[column])} />{column}
                                        </span>
                                        <span className="tabular text-[10.5px] text-gray-600">{cards.length}</span>
                                    </div>
                                    <ul className="flex min-h-28 flex-col gap-2">
                                        {cards.map((task) => <Card key={task.id} task={{ ...task, status: column }} canMove={role.canMove} />)}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                    <div className={cn("flex min-h-10 items-center px-4 py-2 text-[11.5px] text-gray-700", UI.ruleT)}>
                        {moved && (
                            <p data-live-line className="flex min-w-0 items-center gap-2">
                                <span className="relative flex size-2 shrink-0">
                                    <span className="absolute inline-flex size-full animate-beat rounded-full bg-emerald-500" />
                                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                                </span>
                                <span className="truncate"><span className="font-medium text-gray-900">Daniel Okafor</span> moved <span className="tabular text-[10.5px] text-gray-500">APP-1</span> <span className="font-medium text-gray-900">One-tap rebooking</span> to Done</span>
                                <span className="shrink-0 text-gray-500">· just now</span>
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </figure>
    );
};
