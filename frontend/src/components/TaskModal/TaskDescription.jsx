export const TaskDescription = ({ task }) => {
    return (
        <>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">Description</h3>
            <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{task.taskDescription}</p>

            <div className="mt-8">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">Status & Priority</h3>
                <div className="flex gap-3">
                    <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm font-medium text-zinc-300">{task.taskStatus}</span>
                    <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-sm font-medium text-indigo-400 border border-indigo-500/20">{task.priority}</span>
                </div>
            </div>
        </>
    );
};