import { cn } from "@/lib/utils";
import { TASK_STATUS_DOT } from "@/lib/taskMeta";

const PRIORITY = {
    Urgent: "bg-red-50 text-red-700 ring-red-200",
    Critical: "bg-red-50 text-red-700 ring-red-200",
    High: "bg-amber-50 text-amber-800 ring-amber-200",
    Medium: "bg-gray-100 text-gray-700 ring-gray-200",
    Low: "bg-white text-gray-600 ring-gray-200",
};

const PROJECT_STATUS = {
    Planning: "bg-gray-100 text-gray-700 ring-gray-200",
    Active: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    "On Hold": "bg-amber-50 text-amber-800 ring-amber-200",
    Completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Cancelled: "bg-gray-100 text-gray-500 ring-gray-200 line-through",
};

const base = "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium leading-5 ring-1 ring-inset whitespace-nowrap";

export const PriorityBadge = ({ priority, className }) => {
    if (!priority) return null;
    return <span className={cn(base, PRIORITY[priority] || PRIORITY.Medium, className)}>{priority}</span>;
};

export const TaskStatusBadge = ({ status, className }) => {
    if (!status) return null;
    return (
        <span className={cn(base, "bg-white text-gray-700 ring-gray-200", className)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", TASK_STATUS_DOT[status] || "bg-gray-400")} aria-hidden="true" />
            {status}
        </span>
    );
};

export const ProjectStatusBadge = ({ status, className }) => {
    const value = status || "Planning";
    return <span className={cn(base, PROJECT_STATUS[value] || PROJECT_STATUS.Planning, className)}>{value}</span>;
};
