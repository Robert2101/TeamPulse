// Workflow stage colors, shared by the board, badges and the overview chart.
// Hues validated with the dataviz palette checker (lightness, chroma, CVD separation all pass).
export const TASK_STATUS_DOT = {
    "To-Do": "bg-sky-500",
    "In-Progress": "bg-indigo-500",
    Review: "bg-amber-500",
    Done: "bg-emerald-500",
};

/** Stable task reference like APP-12, or null for tasks created before projects had keys. */
export const taskKey = (task, project) => {
    const key = project?.key ?? task?.projectReference?.key;
    return key && task?.number ? `${key}-${task.number}` : null;
};
