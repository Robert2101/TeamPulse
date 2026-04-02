import { AlignLeft, LayoutDashboard } from "lucide-react";

export const TaskDescription = ({ task }) => {
    return (
        <div className="space-y-8">
            <div>
                <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
                    <AlignLeft size={16} className="text-zinc-500" /> Description
                </h3>
                <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-5 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap shadow-inner">
                    {task.taskDescription || <span className="italic text-zinc-600">No description provided for this task.</span>}
                </div>
            </div>

            <div>
                <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
                    <LayoutDashboard size={16} className="text-zinc-500" /> Status & Priority
                </h3>
                <div className="flex gap-3">
                    <span className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800/80 px-4 py-1.5 text-xs font-semibold text-zinc-200 shadow-sm transition-colors hover:bg-zinc-700">
                        <span className="h-2 w-2 rounded-full bg-zinc-400"></span>
                        {task.taskStatus}
                    </span>
                    <span className="flex items-center gap-2 rounded-full bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-300 border border-indigo-500/20 shadow-sm transition-colors hover:bg-indigo-500/20">
                        <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse"></span>
                        {task.priority || "Normal"}
                    </span>
                </div>
            </div>
        </div>
    );
};