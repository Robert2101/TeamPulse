import { AlignLeft, LayoutDashboard } from "lucide-react";

export const TaskDescription = ({ task }) => {
    return (
        <div className="space-y-8">
            <div>
                <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500">
                    <AlignLeft size={16} className="text-gray-400" /> Description
                </h3>
                <div className="rounded-xl border border-gray-200/60 bg-white shadow-sm p-5 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap shadow-inner">
                    {task.taskDescription || <span className="italic text-gray-500">No description provided for this task.</span>}
                </div>
            </div>

            <div>
                <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500">
                    <LayoutDashboard size={16} className="text-gray-400" /> Status & Priority
                </h3>
                <div className="flex gap-3">
                    <span className="flex items-center gap-2 rounded-full border border-gray-300 bg-gray-100 px-4 py-1.5 text-xs font-semibold text-gray-800 shadow-sm transition-colors hover:bg-gray-200">
                        <span className="h-2 w-2 rounded-full bg-gray-400"></span>
                        {task.taskStatus}
                    </span>
                    <span className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-1.5 text-xs font-semibold text-gray-800 border border-gray-200 shadow-sm transition-colors hover:bg-gray-200">
                        <span className="h-2 w-2 rounded-full bg-gray-400"></span>
                        {task.priority || "Normal"}
                    </span>
                    {task.taskStatus === "Done" && task.completedAt && (
                        <span className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-500/20 shadow-sm">
                            Completed on: {new Date(task.completedAt).toLocaleDateString()}
                        </span>
                    )}
                </div>
            </div>
            {task.updatedBy && (
                <div className="text-xs text-gray-400 italic">
                    Last updated by: {task.updatedBy.fullName || "Unknown"}
                </div>
            )}
        </div>
    );
};