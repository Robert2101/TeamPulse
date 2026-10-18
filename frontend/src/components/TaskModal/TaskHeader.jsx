import { useState } from "react";
import { Calendar, User, X, Trash2, Loader2, CircleDot } from "lucide-react";
import api from "../../lib/axios";
import { PriorityBadge, TaskStatusBadge } from "../ui/badges";
import { formatDate, isOverdue, errorMessage } from "../../lib/format";
import { toast } from "../../lib/toast";
import { btn } from "../../lib/styles";
import { cn } from "../../lib/utils";

const STATUSES = ["To-Do", "In-Progress", "Review", "Done"];
const chip = "flex min-h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-xs text-gray-700";
const chipSelect = "max-w-[12rem] cursor-pointer truncate bg-transparent py-1 font-medium text-gray-900 focus:outline-none";

export const TaskHeader = ({ task, project, canAssignMembers, canMoveTasks, canDelete, onStatusChange, onTaskUpdated, onTaskDeleted, onClose }) => {
    const [savingAssignee, setSavingAssignee] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleAssigneeChange = async (newAssigneeId) => {
        setSavingAssignee(true);
        try {
            const res = await api.patch(`/tasks/${task._id}`, { assignee: newAssigneeId || null });
            if (res.data?.task) onTaskUpdated?.(res.data.task);
        } catch (error) {
            toast.error("Couldn't change the assignee", errorMessage(error));
        } finally {
            setSavingAssignee(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await api.delete(`/tasks/${task._id}`);
            toast.success("Task deleted");
            onTaskDeleted?.(task._id);
        } catch (error) {
            toast.error("Couldn't delete the task", errorMessage(error));
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    const pm = project?.projectManager;
    const members = (project?.assignedTeamMembers || []).filter((m) => (m._id || m) !== (pm?._id || pm));
    const overdue = isOverdue(task.dueDate, task.taskStatus);

    return (
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-white px-5 py-4 sm:px-8 sm:py-6">
            <div className="min-w-0 flex-1">
                <h2 id="task-dialog-title" className="text-xl font-semibold tracking-tight text-gray-900 wrap-anywhere sm:text-2xl">{task.taskName}</h2>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    {canMoveTasks ? (
                        <label className={chip}>
                            <CircleDot size={14} className="text-gray-500" aria-hidden="true" />
                            <span className="sr-only">Status</span>
                            <select className={chipSelect} value={task.taskStatus} onChange={(e) => onStatusChange?.(e.target.value)}>
                                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </label>
                    ) : (
                        <TaskStatusBadge status={task.taskStatus} className="min-h-8 rounded-lg px-2.5 text-xs" />
                    )}

                    <PriorityBadge priority={task.priority} className="min-h-8 rounded-lg px-2.5 text-xs" />

                    <span className={cn(chip, overdue && "border-red-200 bg-red-50 text-red-800")}>
                        <Calendar size={14} aria-hidden="true" className={overdue ? "text-red-700" : "text-gray-500"} />
                        {task.dueDate ? <>{overdue ? "Overdue · " : "Due "}<span className="font-medium">{formatDate(task.dueDate)}</span></> : "No due date"}
                    </span>

                    <span className={chip}>
                        {savingAssignee ? <Loader2 size={14} className="animate-spin text-gray-500" aria-hidden="true" /> : <User size={14} className="text-gray-500" aria-hidden="true" />}
                        {canAssignMembers ? (
                            <label>
                                <span className="sr-only">Assignee</span>
                                <select
                                    className={chipSelect}
                                    disabled={savingAssignee}
                                    value={task.assignee?._id || task.assignee || ""}
                                    onChange={(e) => handleAssigneeChange(e.target.value)}
                                >
                                    <option value="">Unassigned</option>
                                    {members.map((member) => (
                                        <option key={member._id || member} value={member._id || member}>
                                            {member.fullName || member.emailAddress || "Team member"}
                                        </option>
                                    ))}
                                    {pm && (
                                        <option value={pm._id || pm}>
                                            {pm.fullName ? `${pm.fullName} (Manager)` : "Project manager"}
                                        </option>
                                    )}
                                </select>
                            </label>
                        ) : (
                            <span className="font-medium text-gray-900">{task.assignee?.fullName || "Unassigned"}</span>
                        )}
                    </span>

                    {canDelete && (
                        confirmDelete ? (
                            <span className="flex items-center gap-1.5">
                                <button onClick={handleDelete} disabled={deleting} className={cn(btn.danger, "min-h-8 px-2.5 py-1 text-xs")}>
                                    {deleting ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Trash2 size={13} aria-hidden="true" />} Delete task
                                </button>
                                <button onClick={() => setConfirmDelete(false)} disabled={deleting} className={cn(btn.ghost, "min-h-8 px-2.5 py-1 text-xs")}>Cancel</button>
                            </span>
                        ) : (
                            <button onClick={() => setConfirmDelete(true)} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-700">
                                <Trash2 size={13} aria-hidden="true" /> Delete
                            </button>
                        )
                    )}
                </div>
            </div>
            <button onClick={onClose} className={cn(btn.icon, "-mr-2 shrink-0")} aria-label="Close task details">
                <X size={20} />
            </button>
        </div>
    );
};
