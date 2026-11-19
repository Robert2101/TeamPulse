import { cn } from "@/lib/utils";

const LEVEL = { Low: 1, Medium: 2, High: 3 };

/** Priority as a glyph: one to three signal bars, or a filled mark for Urgent/Critical. */
export const PriorityIcon = ({ priority = "Medium", className }) => {
    const label = `${priority} priority`;
    if (priority === "Urgent" || priority === "Critical") {
        return (
            <svg width="14" height="14" viewBox="0 0 14 14" role="img" aria-label={label} className={cn("shrink-0", className)}>
                <title>{label}</title>
                <rect width="14" height="14" rx="3.5" className="fill-red-600" />
                <path d="M7 3.4v4.4" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="7" cy="10.4" r="1.05" fill="white" />
            </svg>
        );
    }
    const level = LEVEL[priority] ?? 2;
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" role="img" aria-label={label} className={cn("shrink-0", className)}>
            <title>{label}</title>
            {[4, 7.5, 11].map((h, i) => (
                <rect key={h} x={1 + i * 4.5} y={13 - h} width="3" height={h} rx="1" className={i < level ? "fill-gray-700" : "fill-gray-300"} />
            ))}
        </svg>
    );
};
