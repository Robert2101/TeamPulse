import { cn } from "@/lib/utils";

/** A keyboard key hint, e.g. <Kbd>⌘K</Kbd>. */
export const Kbd = ({ className, children }) => (
    <kbd className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-gray-200 bg-white px-1.5 font-mono text-[11px] font-medium text-gray-500 shadow-[0_1px_0_rgba(15,23,42,0.06)]", className)}>
        {children}
    </kbd>
);
