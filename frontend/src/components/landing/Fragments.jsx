import { CheckSquare, MessageSquare, Paperclip, Sparkles, UserRound } from "lucide-react";
import { Avatar } from "../ui/avatar";
import { PriorityIcon } from "../ui/priority-icon";
import { TASK_STATUS_DOT } from "../../lib/taskMeta";
import { cn } from "../../lib/utils";

// Cropped fragments of real TeamPulse screens, drawn with the app's own components and the demo company's data.
// Each is a figure: screen readers get the caption, the visual detail is hidden from them.
// Inside data-ui the app keeps its own furniture: the rules, the brand accent and the small UI sizes.
const UI = {
    headRule: "border-b border-gray-100", // app panel header edge
    rowRule: "divide-y divide-gray-100", // app list rows
    bubble: "border border-gray-200", // app chat bubble
    thread: "w-px bg-gray-200", // audit log timeline
    unassigned: "border border-dashed border-gray-300", // app's unassigned avatar
    accentText: "text-indigo-600", // brand accent, assistant
    accentBubble: "bg-indigo-600 text-white", // brand accent, your own message
};

const Frame = ({ caption, className, children }) => (
    <figure data-ui className={cn("overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_24px_60px_-32px_rgba(15,23,42,0.35)]", className)}>
        <figcaption className="sr-only">{caption}</figcaption>
        <div aria-hidden="true">{children}</div>
    </figure>
);

const PanelHead = ({ title, aside }) => (
    <div className={cn("flex items-baseline justify-between gap-4 px-5 py-3.5", UI.headRule)}>
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        {aside && <span className="tabular text-xs text-gray-500">{aside}</span>}
    </div>
);

const Strong = ({ children }) => <span className="font-medium text-gray-900">{children}</span>;

// --- Overview: what needs attention, as Maya (Admin) sees it across every project

const TONE = {
    danger: "bg-red-50 text-red-700 ring-red-200",
    review: "bg-amber-50 text-amber-800 ring-amber-200",
    warn: "bg-amber-50 text-amber-800 ring-amber-200",
    muted: "bg-gray-100 text-gray-700 ring-gray-200",
};

const ATTENTION = [
    { key: "API-3", name: "Load test at 10x launch traffic", project: "Partner API", status: "To-Do", priority: "High", who: "Jonas Weber", reason: ["danger", "Overdue 2 days"] },
    { key: "API-2", name: "API reference docs", project: "Partner API", status: "Review", priority: "Medium", who: "Lucas Moreau", reason: ["review", "Waiting for review"] },
    { key: "SEC-1", name: "Access review policy", project: "SOC 2 Type I", status: "Review", priority: "Medium", who: "Priya Raman", reason: ["review", "Waiting for review"] },
    { key: "APP-2", name: "Crash when switching currency on Android", project: "Mobile app 3.0", status: "In-Progress", priority: "Urgent", who: "Lucas Moreau", reason: ["warn", "Due tomorrow"] },
    { key: "APP-5", name: "Accessibility pass (WCAG 2.2 AA)", project: "Mobile app 3.0", status: "To-Do", priority: "High", who: null, reason: ["muted", "No owner yet"] },
];

export const AttentionFragment = () => (
    <Frame caption="The Overview screen for an Admin: five tasks that need attention across projects, each with its reason, such as overdue, waiting for review, due tomorrow or no owner yet.">
        <PanelHead title="Needs attention" aside="5 tasks" />
        <ul className={UI.rowRule}>
            {ATTENTION.map((t, i) => (
                <li key={t.key} className={cn("flex items-center gap-3 px-5 py-3", i === 1 && "bg-gray-50")}>
                    <span className={cn("size-2 shrink-0 rounded-full", TASK_STATUS_DOT[t.status])} />
                    <PriorityIcon priority={t.priority} />
                    <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                            <span className="tabular shrink-0 text-[11px] font-medium text-gray-500">{t.key}</span>
                            <span className="truncate text-sm font-medium text-gray-900">{t.name}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-gray-500">{t.project}</span>
                    </span>
                    <span className={cn("hidden shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset sm:inline", TONE[t.reason[0]])}>{t.reason[1]}</span>
                    {t.who
                        ? <Avatar name={t.who} size="xs" />
                        : <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-gray-400", UI.unassigned)}><UserRound size={12} /></span>}
                </li>
            ))}
        </ul>
    </Frame>
);

// --- Audit log, grouped by day

const AUDIT = [
    { day: "Today", entries: [
        { who: "Daniel Okafor", icon: CheckSquare, text: <>moved <Strong>One-tap rebooking for cancelled flights</Strong> to <Strong>Done</Strong></>, at: "Just now" },
        { who: "Grace Liu", icon: MessageSquare, text: <>commented on <Strong>Booking webhooks for partners</Strong></>, at: "25m ago" },
        { who: "Aisha Bello", icon: CheckSquare, text: <>uploaded <Strong>partner-api-reference.pdf</Strong></>, at: "1h ago" },
    ] },
    { day: "Yesterday", entries: [
        { who: "Priya Raman", icon: CheckSquare, text: <>moved <Strong>Access review policy</Strong> to <Strong>Review</Strong></>, at: "5:40 PM" },
        { who: "Daniel Okafor", icon: CheckSquare, text: <>changed the due date of <Strong>Crash when switching currency on Android</Strong></>, at: "9:15 AM" },
    ] },
];

export const AuditFragment = () => (
    <Frame caption="The audit log, grouped by day: who moved, commented on, uploaded to or edited which task, and when.">
        <PanelHead title="Audit log" aside="All projects" />
        <div className="flex flex-col gap-6 px-5 py-5">
            {AUDIT.map(({ day, entries }) => (
                <div key={day}>
                    <p className="mb-3.5 text-xs font-medium text-gray-500">{day}</p>
                    <ol className="flex flex-col gap-4">
                        {entries.map((e, i) => (
                            <li key={e.at} className="relative flex items-start gap-3">
                                {i !== entries.length - 1 && <span className={cn("absolute -bottom-4 left-4 top-10", UI.thread)} />}
                                <span className="relative shrink-0">
                                    <Avatar name={e.who} size="md" ring />
                                    <span className="absolute -bottom-1 -right-1 flex size-4.5 items-center justify-center rounded-full bg-gray-100 text-gray-700 ring-2 ring-white"><e.icon size={10} /></span>
                                </span>
                                <span className="flex min-w-0 flex-1 items-start justify-between gap-3 pt-1.5">
                                    <span className="min-w-0 text-sm text-gray-700"><span className="font-semibold text-gray-900">{e.who}</span> {e.text}</span>
                                    <span className="tabular shrink-0 text-xs text-gray-500">{e.at}</span>
                                </span>
                            </li>
                        ))}
                    </ol>
                </div>
            ))}
        </div>
    </Frame>
);

// --- A task thread

export const ThreadFragment = () => (
    <Frame caption="A task thread on Home feed redesign: the designer attaches the final screen, the project manager approves it, and a teammate is typing." className="p-5">
        <p className="mb-4 flex items-center gap-2 text-sm">
            <span className="tabular text-[11px] font-medium text-gray-500">APP-7</span>
            <span className="font-semibold text-gray-900">Home feed redesign</span>
        </p>
        <ol className="flex flex-col gap-4">
            <li className="flex items-start gap-2.5">
                <Avatar name="Sam Rivera" size="sm" />
                <div className="min-w-0">
                    <p className="text-xs text-gray-500"><span className="font-medium text-gray-800">Sam Rivera</span> · Product designer</p>
                    <div className={cn("mt-1 rounded-xl rounded-tl-sm p-2.5 text-sm text-gray-800", UI.bubble)}>
                        Final designs attached. Spacing and type follow the new brand system.
                        <div className="mt-2.5 flex items-center gap-3 rounded-lg bg-gray-50 p-2">
                            <img src="/demo/home-feed-v3.png" alt="" width="44" height="95" loading="lazy" className="h-[95px] w-[44px] rounded-md object-cover ring-1 ring-gray-200" />
                            <span className="min-w-0 text-xs">
                                <span className="flex items-center gap-1 font-medium text-gray-900"><Paperclip size={12} /> home-feed-v3.png</span>
                                <span className="mt-0.5 block text-gray-500">PNG · 120 KB</span>
                            </span>
                        </div>
                    </div>
                </div>
            </li>
            <li className="flex items-start gap-2.5">
                <Avatar name="Daniel Okafor" size="sm" />
                <div className="min-w-0">
                    <p className="text-xs text-gray-500"><span className="font-medium text-gray-800">Daniel Okafor</span> · Project manager</p>
                    <p className={cn("mt-1 rounded-xl rounded-tl-sm px-3 py-2 text-sm text-gray-800", UI.bubble)}>Approved. The trip card at the top is exactly right.</p>
                </div>
            </li>
        </ol>
        <p className="mt-4 flex items-center gap-2 text-xs text-gray-500">
            <span className="flex gap-0.5">{[0, 1, 2].map((i) => <span key={i} className="size-1 rounded-full bg-gray-400" />)}</span>
            Lucas Moreau is typing
        </p>
    </Frame>
);

// --- The assistant moving a task

export const AssistantFragment = () => (
    <Frame caption="The AI assistant: Lucas asks it to move the currency crash fix to Review, it confirms, and the task moves on the board for everyone." className="p-5">
        <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Sparkles size={15} className={UI.accentText} /> TeamPulse AI
            <span className="ml-auto text-xs font-normal text-gray-500">Lucas Moreau</span>
        </p>
        <div className="flex flex-col gap-3 text-sm">
            <p className={cn("ml-auto w-fit max-w-[85%] rounded-xl rounded-tr-sm px-3 py-2", UI.accentBubble)}>The currency crash fix is ready, move it to Review</p>
            <p className={cn("w-fit max-w-[90%] rounded-xl rounded-tl-sm px-3 py-2 text-gray-800", UI.bubble)}>
                Got it! I have successfully updated the status of "Crash when switching currency on Android" to Review.
            </p>
            <p className="flex items-center gap-2 text-xs text-gray-500">
                <span className={cn("size-1.5 rounded-full", TASK_STATUS_DOT.Review)} /> APP-2 moved to Review on the board for everyone
            </p>
        </div>
    </Frame>
);
