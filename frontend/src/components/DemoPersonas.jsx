import { ArrowRight, Loader2 } from "lucide-react";
import { Avatar } from "./ui/avatar";
import { cn } from "../lib/utils";
import { DEMO_PERSONAS } from "../lib/demo";
import { useDemoSignIn } from "../hooks/useDemoSignIn";

export const DemoStatus = ({ slow, error }) => (
    <>
        {slow && (
            <p role="status" className="mt-3 text-sm text-gray-600">
                Waking the server and building your workspace. The first start can take up to a minute.
            </p>
        )}
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </>
);

/** One button per shared demo account; each signs in with that account's email and password. */
export const DemoPersonas = ({ compact = false, className, listClassName }) => {
    const { signInAs, pending, slow, error } = useDemoSignIn();

    return (
        <div className={className}>
            <ul className={cn("grid", compact ? "grid-cols-2 gap-2" : "gap-3 sm:grid-cols-2", listClassName)}>
                {DEMO_PERSONAS.map((p) => {
                    const arrow = pending === p.persona
                        ? <Loader2 size={16} className="shrink-0 animate-spin text-gray-500" aria-hidden="true" />
                        : <ArrowRight size={16} className="shrink-0 text-gray-400 transition-transform duration-150 ease-snappy group-hover:translate-x-0.5 group-hover:text-gray-700" aria-hidden="true" />;
                    return (
                        <li key={p.persona}>
                            <button
                                type="button"
                                onClick={() => signInAs(p.persona)}
                                disabled={pending !== null}
                                aria-label={`Sign in as ${p.name}, ${p.role}`}
                                className={cn(
                                    "group h-full w-full text-left transition-[border-color,background-color,box-shadow,transform] duration-150 ease-snappy active:scale-[0.99] disabled:opacity-60",
                                    compact
                                        ? "flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-gray-300 hover:shadow-[0_6px_16px_-8px_rgba(15,23,42,0.2)]"
                                        : "flex flex-col rounded-2xl bg-gray-50 p-5 hover:bg-gray-100"
                                )}
                            >
                                {compact ? (
                                    <>
                                        <Avatar name={p.name} size="sm" />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-medium text-gray-900">{p.name.split(" ")[0]}</span>
                                            <span className="block truncate text-xs text-gray-600">{p.role}</span>
                                        </span>
                                        {arrow}
                                    </>
                                ) : (
                                    <>
                                        <span className="flex items-center justify-between gap-3">
                                            <Avatar name={p.name} size="md" />
                                            {arrow}
                                        </span>
                                        <span className="mt-4 block font-semibold text-gray-900">{p.name}</span>
                                        <span className="block text-sm text-gray-600">{p.role} · {p.title}</span>
                                        <span className="mt-1 block truncate text-sm text-gray-500">{p.email}</span>
                                        <span className="mt-3 block text-sm leading-relaxed text-gray-700">{p.sees}</span>
                                    </>
                                )}
                            </button>
                        </li>
                    );
                })}
            </ul>
            <DemoStatus slow={slow} error={error} />
        </div>
    );
};
