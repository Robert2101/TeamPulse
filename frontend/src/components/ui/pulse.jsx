import { cn } from "@/lib/utils";

/**
 * A project's pulse: audit-log events per day over the last 14 days, drawn as a trace.
 * The latest day gets a dot; a quiet project is a flat grey line.
 */
export const Pulse = ({ values, width = 56, height = 18, active = false, className, label }) => {
    const series = values?.length ? values : Array(14).fill(0);
    const total = series.reduce((a, b) => a + b, 0);
    const max = Math.max(...series, 1);
    const step = width / (series.length - 1);
    const y = (v) => height - 2 - (v / max) * (height - 4);
    const points = series.map((v, i) => `${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    const last = series.at(-1);

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={label ?? (total ? `${total} updates in the last 14 days` : "No activity in the last 14 days")}
            className={cn("shrink-0 overflow-visible", className)}
        >
            <polyline
                points={points}
                fill="none"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                className={cn(total ? (active ? "stroke-indigo-500" : "stroke-gray-400") : "stroke-gray-300")}
            />
            {last > 0 && <circle cx={width} cy={y(last)} r="2" className={active ? "fill-indigo-600" : "fill-gray-700"} />}
        </svg>
    );
};
