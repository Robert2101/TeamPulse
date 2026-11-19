import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Check, Loader2, Minus } from "lucide-react";
import { LogoMark } from "../components/ui/logo";
import { DemoPersonas, DemoStatus } from "../components/DemoPersonas";
import { ProductPreview } from "../components/landing/ProductPreview";
import { AssistantFragment, AttentionFragment, AuditFragment, ThreadFragment } from "../components/landing/Fragments";
import { Reveal } from "../components/landing/Reveal";
import { useStartDemo } from "../hooks/useStartDemo";
import { demoEnabled, PREVIEW_ROLES } from "../lib/demo";
import { btn } from "../lib/styles";
import { cn } from "../lib/utils";

// Rules belong to the real permissions table.
const HEAD_RULE = "border-b border-gray-200"; // table rule
const ROW_RULE = "border-b border-gray-100"; // table rule

const REPO_URL = "https://github.com/Robert2101/TeamPulse";
const API_ORIGIN = import.meta.env.VITE_API_URL || (import.meta.env.MODE === "production" ? "" : "http://localhost:5001");
const TEXT_LINK = "font-medium text-gray-900 underline decoration-gray-300 underline-offset-4 transition-colors hover:decoration-gray-900";
const H2 = "text-3xl font-semibold tracking-tight text-balance text-gray-900 sm:text-4xl";
const LEAD = "text-lg leading-relaxed text-gray-700";

// --- Permissions: what each role can do, row by row as the API enforces it (backend/tests/permissions.test.js)

const ALL = "all";
const OWN = "own";
const NO = "no";
const ROLE_COLUMNS = [["Admin", "Maya"], ["Project manager", "Daniel"], ["Team member", "Lucas"], ["Stakeholder", "Grace"]];
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
    if (value === OWN) return <span className="text-sm font-medium text-gray-700">Their projects</span>;
    return <Minus size={16} className="mx-auto text-gray-300" aria-label="No" />;
};

// Desktop and tablet: the matrix. Phone: each action lists who may do it, so nothing scrolls sideways.
const PermissionTable = () => (
    <table className="hidden w-full border-collapse text-left text-sm sm:table">
        <caption className="sr-only">What each role can do. "Their projects" means projects the person manages or is a member of.</caption>
        <thead>
            <tr className={HEAD_RULE}>
                <th scope="col" className="py-3 pr-4"><span className="sr-only">Action</span></th>
                {ROLE_COLUMNS.map(([r, person]) => (
                    <th key={r} scope="col" className="w-28 px-2 py-3 text-center align-bottom">
                        <span className="block font-semibold text-gray-900">{r}</span>
                        <span className="block text-sm font-normal text-gray-500">{person}</span>
                    </th>
                ))}
            </tr>
        </thead>
        <tbody>
            {PERMISSIONS.map(([action, values]) => (
                <tr key={action} className={ROW_RULE}>
                    <th scope="row" className="py-4 pr-4 font-normal text-gray-800">{action}</th>
                    {values.map((value, i) => (
                        <td key={ROLE_COLUMNS[i][0]} className="px-2 py-4 text-center"><PermissionCell value={value} /></td>
                    ))}
                </tr>
            ))}
        </tbody>
    </table>
);

const PermissionList = () => (
    <dl className="flex flex-col gap-6 sm:hidden">
        {PERMISSIONS.map(([action, values]) => (
            <div key={action}>
                <dt className="font-medium text-gray-900">{action}</dt>
                <dd className="mt-2 flex flex-wrap gap-1.5">
                    {values.map((value, i) => value !== NO && (
                        <span key={ROLE_COLUMNS[i][0]} className="rounded-md bg-gray-100 px-2 py-1 text-sm text-gray-800">
                            {ROLE_COLUMNS[i][0]}{value === OWN && <span className="text-gray-600"> · their projects</span>}
                        </span>
                    ))}
                </dd>
            </div>
        ))}
    </dl>
);

const STACK = [
    ["Frontend", "React 18, Vite, Tailwind CSS and Zustand. Every screen loads on demand, and the board animates real moves with GSAP Flip."],
    ["API", "Express 5 and MongoDB, with transactions for writes that span documents, and Upstash Redis for caching and rate limits."],
    ["Real time", "Socket.IO with one room per project. Joining a room is authorized like any API call, and typing events never leave it."],
    ["Security", "Revocable httpOnly sessions, CSRF tokens, tenant-scoped queries and allow-listed updates."],
    ["AI", "Gemini 2.5 Flash with streamed answers and one tool, scoped in the database query to the caller's own tasks."],
    ["The demo", "Each visitor gets a private copy of a sample company, built from a template in a few hundred milliseconds and deleted after 24 hours."],
    ["Quality", "API tests on an in-memory MongoDB replica set, Playwright smoke tests and GitHub Actions CI with Docker images."],
];

export const LandingPage = () => {
    const { start, pending, slow, error: demoError } = useStartDemo();
    const [params] = useSearchParams();
    const [role, setRole] = useState(PREVIEW_ROLES[0]);
    const expired = params.get("demo") === "expired";

    // Wake the API while the visitor reads: free hosting sleeps when idle, and the demo button needs it.
    useEffect(() => { fetch(`${API_ORIGIN}/api/health`).catch(() => {}); }, []);

    const demoButton = (className, label = "Explore the demo") => (
        <button type="button" onClick={() => start("admin")} disabled={pending !== null} className={cn(btn.primary, "shadow-none", className)}>
            {pending === "admin" && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {label}
        </button>
    );

    return (
        <div className="min-h-dvh bg-gray-50 text-gray-900">
            <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
                <Link to="/" className="flex items-center gap-2.5 rounded-lg" aria-label="TeamPulse home">
                    <LogoMark size={30} />
                    <span className="text-lg font-semibold tracking-tight">TeamPulse</span>
                </Link>
                <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
                    <a href={REPO_URL} className={cn(btn.ghost, "hidden sm:inline-flex")}>Source</a>
                    <Link to="/login" className={btn.ghost}>Sign in</Link>
                    {demoEnabled ? demoButton("hidden sm:inline-flex") : <Link to="/register" className={cn(btn.primary, "shadow-none")}>Create a workspace</Link>}
                </nav>
            </header>

            <main>
                {/* Hero: the claim, one way in, and the product itself */}
                <section className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-8 sm:pt-16">
                    {expired && (
                        <p role="status" className="mb-8 max-w-2xl rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            Your demo workspace reached its 24 hours and was cleared. Start a fresh one below.
                        </p>
                    )}
                    <div className="grid grid-cols-1 items-end gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
                        <h1 className="text-4xl font-semibold tracking-[-0.035em] text-balance text-gray-900 sm:text-6xl lg:text-7xl">
                            A live board for the whole team.
                        </h1>
                        <div>
                            <p className={cn(LEAD, "max-w-xl")}>
                                Projects, tasks, threads and files in one workspace, where every change reaches everyone on the project the moment it happens.
                            </p>
                            <div className="mt-6 flex flex-wrap items-center gap-3">
                                {demoEnabled && demoButton("h-11 px-5")}
                                <Link to="/register" className={cn(demoEnabled ? btn.secondary : btn.primary, "h-11 px-5 shadow-none")}>Create a workspace</Link>
                            </div>
                            {demoEnabled && (
                                <p className="mt-3 text-sm text-gray-600">
                                    A private copy of a sample company, yours for 24 hours. No account needed.{" "}
                                    <a href="#demo" className={cn(TEXT_LINK, "whitespace-nowrap")}>Open it as someone else</a>
                                </p>
                            )}
                            <DemoStatus slow={slow && pending === "admin"} error={demoError} />
                        </div>
                    </div>

                    <div className="mt-14">
                        <div role="radiogroup" aria-label="See the board as" className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                            <span className="text-sm font-medium text-gray-900">See it as</span>
                            <div className="grid w-full grid-cols-2 rounded-xl bg-gray-200/60 p-1 sm:inline-flex sm:w-auto">
                                {PREVIEW_ROLES.map((r) => (
                                    <button
                                        key={r.id}
                                        type="button"
                                        role="radio"
                                        aria-checked={role.id === r.id}
                                        onClick={() => setRole(r)}
                                        className={cn(
                                            "rounded-lg px-3 py-1.5 text-sm font-medium transition-[background-color,color,transform] duration-150 ease-snappy active:scale-97",
                                            role.id === r.id ? "bg-white text-gray-900" : "text-gray-600 hover:text-gray-900"
                                        )}
                                    >
                                        {r.label}
                                    </button>
                                ))}
                            </div>
                            <span className="w-full text-sm text-gray-600 sm:w-auto" aria-live="polite">{role.note}</span>
                        </div>
                        <ProductPreview role={role} />
                    </div>
                </section>

                {/* Roles */}
                <section aria-labelledby="roles-title" className="bg-white">
                    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 py-28 sm:px-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-20">
                        <div>
                            <Reveal as="h2" id="roles-title" className={H2}>Four roles, checked on every request.</Reveal>
                            <Reveal as="p" delay={80} className={cn(LEAD, "mt-5")}>
                                Each company works in its own workspace. Inside it, the API decides what a person can see and change, and real-time events follow the same rules, so hiding a button is never the only line of defence.
                            </Reveal>
                            <Reveal as="p" delay={160} className="mt-4 leading-relaxed text-gray-700">
                                People who join with an invite code start as Stakeholders: they follow the projects they're added to and discuss the work, until an Admin promotes them.
                            </Reveal>
                        </div>
                        <Reveal delay={120}>
                            <PermissionTable />
                            <PermissionList />
                        </Reveal>
                    </div>
                </section>

                {/* Overview and audit log */}
                <section aria-labelledby="attention-title" className="bg-gray-50">
                    <div className="mx-auto max-w-7xl px-4 py-28 sm:px-8">
                        <div className="grid items-end gap-x-12 gap-y-5 lg:grid-cols-2">
                            <Reveal as="h2" id="attention-title" className={H2}>What needs you, and what changed.</Reveal>
                            <Reveal as="p" delay={80} className={LEAD}>
                                The overview opens on the work that needs a decision: overdue tasks, reviews waiting, launches with no owner. Every write lands in the audit log, grouped by day.
                            </Reveal>
                        </div>
                        <div className="mt-14 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
                            <Reveal delay={120}>
                                <AttentionFragment />
                                <p className="mt-4 text-sm text-gray-600">The overview as Maya, the Admin, sees it. Managers get the same view for their projects; everyone else sees their own work.</p>
                            </Reveal>
                            <Reveal delay={200}>
                                <AuditFragment />
                                <p className="mt-4 text-sm text-gray-600">Admins read the whole log; project managers read the projects they run.</p>
                            </Reveal>
                        </div>
                    </div>
                </section>

                {/* Discussion and the assistant */}
                <section aria-label="Discussion and the assistant" className="bg-white">
                    <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-x-20 gap-y-16 px-4 py-28 sm:px-8 lg:grid-cols-2">
                        <div>
                            <Reveal as="h2" className={H2}>Talk about the work where it is.</Reveal>
                            <Reveal as="p" delay={80} className={cn(LEAD, "mt-5")}>
                                Every task has its own thread with files, pinned decisions and typing indicators. Comments arrive for everyone on the project without a refresh.
                            </Reveal>
                        </div>
                        <Reveal delay={140}><ThreadFragment /></Reveal>

                        <Reveal delay={140} className="lg:order-4">
                            <h2 className={H2}>Ask about your work, or have it done.</h2>
                            <p className={cn(LEAD, "mt-5")}>
                                The assistant answers from your own projects and tasks, streams its reply, and moves your tasks when you ask. It can't touch a task that isn't assigned to you: that rule lives in the database query, not in the prompt.
                            </p>
                        </Reveal>
                        <Reveal delay={200} className="lg:order-3"><AssistantFragment /></Reveal>
                    </div>
                </section>

                {/* Engineering */}
                <section aria-labelledby="stack-title" className="bg-gray-50">
                    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 py-28 sm:px-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-20">
                        <div className="lg:sticky lg:top-24 lg:self-start">
                            <Reveal as="h2" id="stack-title" className={H2}>Under the hood</Reveal>
                            <Reveal as="p" delay={80} className={cn(LEAD, "mt-5")}>
                                A MERN app built the way a team would run it in production, with the decisions written down in the code.
                            </Reveal>
                            <Reveal delay={140} className="mt-6">
                                <a href={REPO_URL} className={cn("inline-flex items-center gap-1.5", TEXT_LINK)}>
                                    Read the code on GitHub <ArrowRight size={15} aria-hidden="true" />
                                </a>
                            </Reveal>
                        </div>
                        <dl className="flex flex-col gap-10">
                            {STACK.map(([term, detail], i) => (
                                <Reveal key={term} delay={40 + (i % 4) * 60} className="grid gap-2 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-8">
                                    <dt className="text-lg font-semibold tracking-tight text-gray-900">{term}</dt>
                                    <dd className="leading-relaxed text-gray-700">{detail}</dd>
                                </Reveal>
                            ))}
                        </dl>
                    </div>
                </section>

                {/* Demo picker */}
                {demoEnabled && (
                    <section id="demo" aria-labelledby="demo-title" className="scroll-mt-8 bg-white">
                        <div className="mx-auto max-w-7xl px-4 py-28 sm:px-8">
                            <div className="grid items-end gap-x-12 gap-y-5 lg:grid-cols-2">
                                <Reveal as="h2" id="demo-title" className={H2}>Open the demo as anyone.</Reveal>
                                <Reveal as="p" delay={80} className={LEAD}>
                                    Fernway, a travel startup, is mid-launch: a crash due tomorrow, reviews waiting, a load test running late. You get your own copy for 24 hours and can switch person from the top bar.
                                </Reveal>
                            </div>
                            <Reveal delay={140} className="mt-12">
                                <DemoPersonas listClassName="lg:grid-cols-4" />
                            </Reveal>
                            <Reveal as="p" delay={200} className="mt-6 text-sm text-gray-600">
                                Prefer your own? <Link to="/register" className={TEXT_LINK}>Create a workspace</Link> and invite your team with a code.
                            </Reveal>
                        </div>
                    </section>
                )}
            </main>

            <footer className="overflow-hidden bg-gray-900 text-gray-300">
                <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-8">
                    <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                        <p className="max-w-md text-gray-400">A multi-tenant project workspace with live boards, threads, files, an audit log and an assistant.</p>
                        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
                            <a href={REPO_URL} className="hover:text-white">Source on GitHub</a>
                            <Link to="/login" className="hover:text-white">Sign in</Link>
                            <Link to="/register" className="hover:text-white">Create a workspace</Link>
                        </nav>
                    </div>
                    <p aria-hidden="true" className="mt-12 select-none text-[19vw] font-semibold leading-[0.8] tracking-[-0.05em] text-white sm:text-[17vw] xl:text-[15rem]">
                        TeamPulse
                    </p>
                </div>
            </footer>
        </div>
    );
};
