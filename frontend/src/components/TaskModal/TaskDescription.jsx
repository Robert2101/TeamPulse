import { CheckCircle2 } from "lucide-react";
import { formatDate } from "../../lib/format";

export const TaskDescription = ({ task }) => {
    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Description</h3>
            <div className="max-h-96 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap wrap-anywhere">
                {task.taskDescription || <span className="italic text-gray-500">No description provided for this task.</span>}
            </div>

            <dl className="space-y-1.5 text-xs text-gray-600">
                {task.taskStatus === "Done" && task.completedAt && (
                    <div className="flex items-center gap-1.5 text-emerald-700">
                        <CheckCircle2 size={14} aria-hidden="true" />
                        <dt className="sr-only">Completed</dt>
                        <dd>Completed {formatDate(task.completedAt)}</dd>
                    </div>
                )}
                {task.createdBy?.fullName && (
                    <div className="flex gap-1"><dt>Created by</dt><dd className="font-medium text-gray-800">{task.createdBy.fullName}</dd></div>
                )}
                {task.updatedBy?.fullName && (
                    <div className="flex gap-1"><dt>Last updated by</dt><dd className="font-medium text-gray-800">{task.updatedBy.fullName}</dd></div>
                )}
            </dl>
        </div>
    );
};
