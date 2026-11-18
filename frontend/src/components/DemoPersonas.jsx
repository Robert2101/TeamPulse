import { ArrowRight, Loader2 } from "lucide-react";
import { Avatar } from "./ui/avatar";
import { cn } from "../lib/utils";
import { DEMO_PERSONAS } from "../lib/demo";
import { useStartDemo } from "../hooks/useStartDemo";

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

/** One button per demo persona; each opens a private copy of the demo company as that person. */
export const DemoPersonas = ({ compact = false, className }) => {
    const { start, pending, slow, error } = useStartDemo();

    return (
        <div className={className}>
            <ul className={cn("grid gap-2", compact ? "grid-cols-2" : "sm:grid-cols-2")}>
                {DEMO_PERSONAS.map((p) => (
                    <li key={p.persona}>
                        <button
                            type="button"
                            onClick={() => start(p.persona)}
                            disabled={pending !== null}
                            aria-label={`Open the demo as ${p.name}, ${p.role}`}
                            className={cn(
                                "group flex h-full w-full items-center gap-3 rounded-xl border border-gray-200 bg-white text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow,transform] duration-150 ease-snappy hover:border-gray-300 hover:shadow-[0_6px_16px_-8px_rgba(15,23,42,0.2)] active:scale-[0.99] disabled:opacity-60",
                                compact ? "px-3 py-2.5" : "px-4 py-3.5"
                            )}
                        >
                            <Avatar name={p.name} size={compact ? "sm" : "md"} />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-gray-900">{compact ? p.name.split(" ")[0] : p.name}</span>
                                <span className="block truncate text-xs text-gray-600">{p.role}</span>
                                {!compact && <span className="mt-1 block text-xs leading-snug text-gray-500">{p.sees}</span>}
                            </span>
                            {pending === p.persona
                                ? <Loader2 size={16} className="shrink-0 animate-spin text-gray-500" aria-hidden="true" />
                                : <ArrowRight size={16} className="shrink-0 text-gray-400 transition-transform duration-150 ease-snappy group-hover:translate-x-0.5 group-hover:text-gray-700" aria-hidden="true" />}
                        </button>
                    </li>
                ))}
            </ul>
            <DemoStatus slow={slow} error={error} />
        </div>
    );
};
