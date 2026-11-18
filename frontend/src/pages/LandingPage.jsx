import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Check, Loader2, MessageSquare, Minus, Sparkles } from "lucide-react";
import { gsap, Flip, prefersReducedMotion } from "../lib/motion";
import { Avatar } from "../components/ui/avatar";
import { PriorityBadge, ProjectStatusBadge } from "../components/ui/badges";
import { DemoPersonas, DemoStatus } from "../components/DemoPersonas";
import { useStartDemo } from "../hooks/useStartDemo";
import { demoEnabled } from "../lib/demo";
import { TASK_STATUS_DOT } from "../lib/taskMeta";
import { formatDate } from "../lib/format";
import { btn } from "../lib/styles";
import { cn } from "../lib/utils";

const REPO_URL = "https://github.com/Robert2101/TeamPulse";

// --- Hero preview: the seeded demo board, rendered with the app's own badges and avatars ---------

const PREVIEW_COLUMNS = ["To-Do", "In-Progress", "Review", "Done"];
// Same tasks, people and relative due dates as the seeded project.
const inDays = (days) => formatDate(new Date(Date.now() + days * 86400000), { short: true });
const PREVIEW_TASKS = [
    { id: "hud", name: "HUD layout for combat mode", status: "To-Do", priority: "Medium", who: "Peter Parker", due: inDays(15), comments: 1 },
    { id: "nano", name: "Nanobot storage algorithm", status: "In-Progress", priority: "High", who: "Peter Parker", due: inDays(5), comments: 2 },
    { id: "thrust", name: "Thruster output test", status: "Review", priority: "High", who: "Pepper Potts", due: inDays(2), comments: 2 },
    { id: "gamma", name: "Gamma signature masking", status: "Done", priority: "Urgent", who: "Bruce Banner", due: inDays(-2), comments: 2 },
];

const PreviewCard = ({ task }) => (
    <li data-flip-id={task.id} className="rounded-lg border border-gray-200 bg-white p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <div className="mb-1.5 flex items-center justify-between gap-2">
            <PriorityBadge priority={task.priority} />
            <Avatar name={task.who} size="xs" />
        </div>
        <p className="text-[13px] font-medium leading-snug text-gray-900">{task.name}</p>
        <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-600">
            <span className="flex items-center gap-1"><Calendar size={12} aria-hidden="true" />{task.due}</span>
            {task.comments && <span className="tabular ml-auto flex items-center gap-1"><MessageSquare size={12} aria-hidden="true" />{task.comments}</span>}
        </div>
    </li>
);

// The one authored moment: a teammate approves the thruster test and the card moves to Done,
// the way every board on the project updates live. Reduced motion shows the end state.
const BoardPreview = () => {
    const reduced = prefersReducedMotion();
    const [moved, setMoved] = useState(reduced);
    const boardRef = useRef(null);
    const flipState = useRef(null);

    useLayoutEffect(() => {
        if (reduced) return undefined;
        const timer = setTimeout(() => {
            flipState.current = Flip.getState(boardRef.current.querySelectorAll("[data-flip-id]"));
            setMoved(true);
        }, 1600);
        return () => clearTimeout(timer);
    }, [reduced]);

    useLayoutEffect(() => {
        if (!flipState.current) return;
        Flip.from(flipState.current, { duration: 0.7, ease: "power3.inOut", scale: false });
        gsap.from("[data-live-line]", { opacity: 0, y: 6, duration: 0.4, delay: 0.55, ease: "power2.out" });
        flipState.current = null;
    }, [moved]);

    const statusOf = (task) => (task.id === "thrust" && moved ? "Done" : task.status);

    return (
        <figure className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)]">
            <figcaption className="sr-only">
                A TeamPulse board for the demo project Mark 85 Armor Refinement. Pepper Potts moves the task Thruster output test from Review to Done, and the board updates for everyone.
            </figcaption>
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-5" aria-hidden="true">
                <div className="flex min-w-0 items-center gap-2.5">
                    <span className="truncate text-sm font-semibold text-gray-900">Mark 85 Armor Refinement</span>
                    <ProjectStatusBadge status="Active" />
                </div>
                <span className="hidden shrink-0 text-xs text-gray-500 sm:inline">Managed by Pepper Potts</span>
            </div>
            <div ref={boardRef} className="grid grid-cols-2 gap-2.5 bg-gray-50 p-3 sm:grid-cols-4 sm:p-4" aria-hidden="true">
                {PREVIEW_COLUMNS.map((column, i) => {
                    const cards = PREVIEW_TASKS.filter((t) => statusOf(t) === column);
                    return (
                        <div key={column} className={cn("min-w-0 rounded-xl border border-gray-200 bg-gray-100/70 p-2", i < 2 && "hidden sm:block")}>
                            <div className="mb-2 flex items-center justify-between px-0.5">
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                                    <span className={cn("h-1.5 w-1.5 rounded-full", TASK_STATUS_DOT[column])} />{column}
                                </span>
                                <span className="tabular text-[11px] text-gray-600">{cards.length}</span>
                            </div>
                            <ul className="flex min-h-24 flex-col gap-2">
                                {cards.map((task) => <PreviewCard key={task.id} task={task} />)}
                            </ul>
                        </div>
                    );
                })}
            </div>
            <div className="flex min-h-11 items-center gap-2 border-t border-gray-200 px-4 py-2.5 text-xs text-gray-700 sm:px-5" aria-hidden="true">
                {moved && (
                    <p data-live-line className="flex min-w-0 items-center gap-2">
                        <span className="relative flex h-2 w-2 shrink-0">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 motion-safe:animate-ping" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                        <span className="truncate"><span className="font-medium text-gray-900">Pepper Potts</span> moved <span className="font-medium text-gray-900">Thruster output test</span> to Done</span>
                        <span className="shrink-0 text-gray-500">· just now</span>
                    </p>
                )}
            </div>
        </figure>
    );
};

// --- Permissions: what each seeded role can do, as enforced by the API -----------------------

const ROLES = [
    { role: "Admin", person: "Tony" },
    { role: "Project Manager", person: "Pepper" },
    { role: "Team Member", person: "Peter" },
    { role: "Stakeholder", person: "joins by invite" },
];
const ALL = "all";
const OWN = "own";
const NO = "no";
const PERMISSIONS = [
    ["Create projects", [ALL, ALL, NO, NO]],
    ["Edit a project and manage its team", [ALL, OWN, NO, NO]],
    ["Create tasks and move them across the board", [ALL, OWN, OWN, NO]],
    ["Edit, reassign and delete tasks", [ALL, OWN, NO, NO]],
    ["Comment and attach files", [ALL, OWN, OWN, OWN]],
    ["Read the audit log", [ALL, OWN, NO, NO]],
    ["Manage members, roles and invite codes", [ALL, NO, NO, NO]],
];

const PermissionCell = ({ value }) => {
    if (value === ALL) return <Check size={18} className="mx-auto text-gray-900" aria-label="Yes, across the workspace" />;
    if (value === OWN) return <span className="text-xs font-medium text-gray-700">Their projects</span>;
    return <Minus size={16} className="mx-auto text-gray-300" aria-label="No" />;
};

// --- Page ----------------------------------------------------------------------------------------

const Logo = () => (
    <Link to="/" className="flex items-center gap-2.5 rounded-lg" aria-label="TeamPulse home">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900">
            <span className="h-2.5 w-2.5 rounded-full bg-white" />
        </span>
        <span className="text-lg font-semibold tracking-tight text-gray-900">TeamPulse</span>
    </Link>
);

const STACK = [
    ["Frontend", "React 18, Vite, Tailwind CSS and Zustand. Each screen loads on demand."],
    ["API", "Express 5 and MongoDB, with transactions for multi-document writes. Upstash Redis for caching and rate limits."],
    ["Real time", "Socket.IO rooms per project. Joining a room is authorized like any API call."],
    ["Security", "Revocable httpOnly JWT sessions, CSRF tokens, tenant-scoped queries and allow-listed updates."],
    ["AI", "Gemini 2.5 Flash with streamed answers and one scoped tool that can only touch the caller's own tasks."],
    ["Quality", "API tests with Vitest, Supertest and in-memory MongoDB, Playwright smoke tests, GitHub Actions CI, Docker."],
];

export const LandingPage = () => {
    // One click from the landing page to a populated board: a private demo workspace, as its Admin.
    const { start, pending, slow, error: demoError } = useStartDemo();
    const entering = pending !== null;
    const enterDemo = () => start("admin");

    const demoButton = (className) => (
        <button type="button" onClick={enterDemo} disabled={entering} className={cn(btn.primary, className)}>
            {entering ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
            Explore the demo
        </button>
    );

    return (
        <div className="min-h-dvh bg-gray-50 text-gray-900 selection:bg-indigo-100">
            <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
                <Logo />
                <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
                    <a href={REPO_URL} className={cn(btn.ghost, "hidden sm:inline-flex")}>Source</a>
                    <Link to="/login" className={btn.ghost}>Sign in</Link>
                    {demoEnabled ? demoButton("hidden sm:inline-flex") : <Link to="/register" className={btn.primary}>Create a workspace</Link>}
                </nav>
            </header>

            <main>
                {/* Hero: the claim, one way in, and the product itself */}
                <section className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
                    <div className="max-w-4xl">
                        <h1 className="text-4xl font-semibold tracking-tight text-balance text-gray-900 sm:text-5xl lg:text-6xl">
                            Projects, tasks and discussion, live for the whole team.
                        </h1>
                        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-gray-600">
                            TeamPulse is a multi-tenant project workspace. Every card move, comment and file appears for everyone on the project as it happens, and each role sees only what it can act on.
                        </p>
                        <div className="mt-8 flex flex-wrap items-center gap-3">
                            {demoEnabled && demoButton("h-11 px-5")}
                            <Link to="/register" className={cn(demoEnabled ? btn.secondary : btn.primary, "h-11 px-5")}>Create a workspace</Link>
                        </div>
                        <DemoStatus slow={slow} error={demoError} />
                        {demoEnabled && (
                            <p className="mt-4 text-sm text-gray-600">
                                Opens a sample workspace as its Admin. No sign-up.{" "}
                                <a href="#demo" className="font-medium text-indigo-700 underline-offset-4 hover:underline">Choose another role</a>
                            </p>
                        )}
                    </div>
                    <div className="mt-10 sm:mt-12">
                        <BoardPreview />
                    </div>
                </section>

                {/* Roles */}
                <section aria-labelledby="roles-title" className="border-t border-gray-200 bg-white">
                    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
                        <div>
                            <h2 id="roles-title" className="text-3xl font-semibold tracking-tight text-balance text-gray-900">Four roles, checked on every request.</h2>
                            <p className="mt-4 leading-relaxed text-gray-600">
                                Each company gets its own workspace. Inside it, the API decides what a person can see and change, and real-time events follow the same rules, so hiding a button is never the only line of defence.
                            </p>
                            <p className="mt-4 leading-relaxed text-gray-600">
                                Invites join as Stakeholders: they follow the projects they're added to and can discuss work, and an Admin promotes them.
                            </p>
                        </div>
                        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                            <table className="w-full min-w-xl border-collapse text-left text-sm">
                                <caption className="sr-only">What each role can do. "Their projects" means projects the person manages or is a member of.</caption>
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th scope="col" className="py-3 pr-4 font-medium text-gray-600"><span className="sr-only">Action</span></th>
                                        {ROLES.map(({ role, person }) => (
                                            <th key={role} scope="col" className="w-28 px-2 py-3 text-center align-bottom">
                                                <span className="block font-semibold text-gray-900">{role}</span>
                                                <span className="block text-xs font-normal text-gray-500">{person}</span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {PERMISSIONS.map(([action, values]) => (
                                        <tr key={action} className="border-b border-gray-100">
                                            <th scope="row" className="py-3.5 pr-4 font-normal text-gray-800">{action}</th>
                                            {values.map((value, i) => (
                                                <td key={ROLES[i].role} className="px-2 py-3.5 text-center"><PermissionCell value={value} /></td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <p className="mt-3 text-xs text-gray-500 sm:hidden">Swipe the table to see all four roles.</p>
                        </div>
                    </div>
                </section>

                {/* Live collaboration and the assistant */}
                <section aria-label="Collaboration" className="border-t border-gray-200">
                    <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-16">
                        <div>
                            <h2 className="text-3xl font-semibold tracking-tight text-balance text-gray-900">Talk about the work where the work is.</h2>
                            <p className="mt-4 leading-relaxed text-gray-600">
                                Every task has its own thread with files and typing indicators. New comments, edits and attachments arrive for everyone on the project without a refresh, and the audit log records who changed what.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_16px_40px_-24px_rgba(15,23,42,0.3)] sm:p-5" aria-hidden="true">
                            <p className="mb-4 text-sm font-semibold text-gray-900">Finalize compound blueprints</p>
                            <ol className="space-y-3">
                                {[["Natasha Romanoff", "Hangar 2 still shows the old door width."], ["James Rhodes", "Fixed in revision 7. Can you check it again?"]].map(([who, text]) => (
                                    <li key={who} className="flex items-start gap-2.5">
                                        <Avatar name={who} size="sm" />
                                        <div className="min-w-0">
                                            <p className="text-xs text-gray-500"><span className="font-medium text-gray-800">{who}</span></p>
                                            <p className="mt-1 rounded-xl rounded-tl-sm border border-gray-200 px-3 py-2 text-sm text-gray-800">{text}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                            <p className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                                <span className="flex gap-0.5">{[0, 1, 2].map((i) => <span key={i} className="h-1 w-1 rounded-full bg-gray-400" />)}</span>
                                Natasha Romanoff is typing
                            </p>
                        </div>

                        <div className="lg:order-4">
                            <h2 className="text-3xl font-semibold tracking-tight text-balance text-gray-900">Ask about your work, or have it done.</h2>
                            <p className="mt-4 leading-relaxed text-gray-600">
                                The assistant answers from your own projects and tasks only, streams its reply, and can move your tasks when you ask. It can never touch a task that isn't assigned to you.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_16px_40px_-24px_rgba(15,23,42,0.3)] sm:p-5 lg:order-3" aria-hidden="true">
                            <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
                                <Sparkles size={15} className="text-indigo-600" /> TeamPulse AI
                            </p>
                            <div className="space-y-3 text-sm">
                                <p className="ml-auto w-fit max-w-[85%] rounded-xl rounded-tr-sm bg-indigo-600 px-3 py-2 text-white">Move the thruster test to Done</p>
                                <p className="w-fit max-w-[85%] rounded-xl rounded-tl-sm border border-gray-200 px-3 py-2 text-gray-800">
                                    Got it! I have successfully updated the status of "Thruster output test" to Done.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Engineering, for the people reviewing the code */}
                <section aria-labelledby="stack-title" className="border-t border-gray-200 bg-white">
                    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <h2 id="stack-title" className="text-3xl font-semibold tracking-tight text-gray-900">Under the hood</h2>
                            <a href={REPO_URL} className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-700 underline-offset-4 hover:underline">
                                Read the code on GitHub <ArrowRight size={14} aria-hidden="true" />
                            </a>
                        </div>
                        <dl className="mt-10 grid gap-x-12 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                            {STACK.map(([term, detail]) => (
                                <div key={term} className="border-t border-gray-200 pt-4">
                                    <dt className="text-sm font-semibold text-gray-900">{term}</dt>
                                    <dd className="mt-2 text-sm leading-relaxed text-gray-600">{detail}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </section>

                {/* Demo picker */}
                {demoEnabled && (
                    <section id="demo" aria-labelledby="demo-title" className="scroll-mt-8 border-t border-gray-200">
                        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
                            <h2 id="demo-title" className="text-3xl font-semibold tracking-tight text-gray-900">Open the demo as anyone</h2>
                            <p className="mt-3 text-gray-600">A sample workspace with real projects, threads and history. Each account shows the app from a different role.</p>
                            <DemoPersonas className="mt-8" />
                            <p className="mt-6 text-sm text-gray-600">
                                Prefer your own? <Link to="/register" className="font-medium text-indigo-700 underline-offset-4 hover:underline">Create a workspace</Link> and invite your team with a code.
                            </p>
                        </div>
                    </section>
                )}
            </main>

            <footer className="border-t border-gray-200">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-gray-600 sm:px-6">
                    <span>TeamPulse</span>
                    <a href={REPO_URL} className="hover:text-gray-900">Source on GitHub</a>
                </div>
            </footer>
        </div>
    );
};
