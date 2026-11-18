import { useState } from "react";
import { Calendar, User, X, Trash2, Loader2, CircleDot, Flag, Link2 } from "lucide-react";
import api from "../../lib/axios";
import { PriorityBadge, TaskStatusBadge } from "../ui/badges";
import { formatDate, isOverdue, errorMessage } from "../../lib/format";
import { toast } from "../../lib/toast";
import { btn } from "../../lib/styles";
import { cn } from "../../lib/utils";

const STATUSES = ["To-Do", "In-Progress", "Review", "Done"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");
const chip = "flex min-h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-xs text-gray-700";
const chipSelect = "max-w-[12rem] cursor-pointer truncate bg-transparent py-1 font-medium text-gray-900 focus:outline-none";

export const TaskHeader = ({ task, project, canAssignMembers, canMoveTasks, canDelete, onStatusChange, onTaskUpdated, onTaskDeleted, onClose }) => {
    const [saving, setSaving] = useState(null); // field currently being saved
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [titleDraft, setTitleDraft] = useState(null); // null = not editing
    const canEdit = canAssignMembers; // Admins and the project's manager edit every field

    const saveField = async (field, value, failure) => {
        setSaving(field);
        try {
            const res = await api.patch(`/tasks/${task._id}`, { [field]: value });
            if (res.data?.task) onTaskUpdated?.(res.data.task);
            return true;
        } catch (error) {
            toast.error(failure, errorMessage(error));
            return false;
        } finally {
            setSaving(null);
        }
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            toast.success("Link copied", "Anyone on this project can open the task with it.");
        } catch {
            toast.error("Couldn't copy the link", "Copy it from the address bar instead.");
        }
    };

    const handleAssigneeChange = (newAssigneeId) => saveField("assignee", newAssigneeId || null, "Couldn't change the assignee");

    const commitTitle = async () => {
        const next = titleDraft?.trim();
        if (!next || next === task.taskName) { setTitleDraft(null); return; }
        if (await saveField("taskName", next, "Couldn't rename the task")) setTitleDraft(null);
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
                {titleDraft !== null ? (
                    <input
                        autoFocus
                        aria-label="Task title"
                        maxLength={200}
                        value={titleDraft}
                        disabled={saving === "taskName"}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onBlur={commitTitle}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); commitTitle(); }
                            if (e.key === "Escape") { e.preventDefault(); setTitleDraft(null); }
                        }}
                        className="-mx-2 w-full rounded-lg border border-indigo-300 bg-white px-2 py-0.5 text-xl font-semibold tracking-tight text-gray-900 ring-3 ring-indigo-500/15 outline-none sm:text-2xl"
                    />
                ) : (
                    <h2 id="task-dialog-title" className="text-xl font-semibold tracking-tight text-gray-900 wrap-anywhere sm:text-2xl">
                        {canEdit ? (
                            <button
                                type="button"
                                onClick={() => setTitleDraft(task.taskName)}
                                title="Rename task"
                                className="-mx-2 rounded-lg px-2 py-0.5 text-left transition-colors hover:bg-gray-100"
                            >
                                {task.taskName}
                            </button>
                        ) : task.taskName}
                    </h2>
                )}
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

                    {canEdit ? (
                        <label className={chip}>
                            {saving === "priority" ? <Loader2 size={14} className="animate-spin text-gray-500" aria-hidden="true" /> : <Flag size={14} className="text-gray-500" aria-hidden="true" />}
                            <span className="sr-only">Priority</span>
                            <select className={chipSelect} value={task.priority || "Medium"} disabled={saving === "priority"} onChange={(e) => saveField("priority", e.target.value, "Couldn't change the priority")}>
                                {PRIORITIES.map((p) => <option key={p} value={p}>{p} priority</option>)}
                            </select>
                        </label>
                    ) : (
                        <PriorityBadge priority={task.priority} className="min-h-8 rounded-lg px-2.5 text-xs" />
                    )}

                    {canEdit ? (
                        <label className={cn(chip, overdue && "border-red-200 bg-red-50 text-red-800")}>
                            {saving === "dueDate" ? <Loader2 size={14} className="animate-spin text-gray-500" aria-hidden="true" /> : <Calendar size={14} aria-hidden="true" className={overdue ? "text-red-700" : "text-gray-500"} />}
                            <span>{overdue ? "Overdue" : "Due"}</span>
                            <input
                                type="date"
                                aria-label="Due date"
                                value={toDateInput(task.dueDate)}
                                disabled={saving === "dueDate"}
                                onChange={(e) => saveField("dueDate", e.target.value || null, "Couldn't change the due date")}
                                className="tabular cursor-pointer bg-transparent py-1 font-medium text-inherit focus:outline-none"
                            />
                        </label>
                    ) : (
                        <span className={cn(chip, overdue && "border-red-200 bg-red-50 text-red-800")}>
                            <Calendar size={14} aria-hidden="true" className={overdue ? "text-red-700" : "text-gray-500"} />
                            {task.dueDate ? <>{overdue ? "Overdue · " : "Due "}<span className="font-medium">{formatDate(task.dueDate)}</span></> : "No due date"}
                        </span>
                    )}

                    <span className={chip}>
                        {saving === "assignee" ? <Loader2 size={14} className="animate-spin text-gray-500" aria-hidden="true" /> : <User size={14} className="text-gray-500" aria-hidden="true" />}
                        {canAssignMembers ? (
                            <label>
                                <span className="sr-only">Assignee</span>
                                <select
                                    className={chipSelect}
                                    disabled={saving === "assignee"}
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
            <div className="-mr-2 flex shrink-0 items-center gap-1">
                <button onClick={copyLink} className={btn.icon} aria-label="Copy link to this task" title="Copy link">
                    <Link2 size={18} aria-hidden="true" />
                </button>
                <button onClick={onClose} className={btn.icon} aria-label="Close task details">
                    <X size={20} aria-hidden="true" />
                </button>
            </div>
        </div>
    );
};
