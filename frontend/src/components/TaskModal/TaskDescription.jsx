import { useState } from "react";
import { CheckCircle2, Loader2, Pencil } from "lucide-react";
import api from "../../lib/axios";
import { formatDate, errorMessage } from "../../lib/format";
import { toast } from "../../lib/toast";
import { btn } from "../../lib/styles";
import { cn } from "../../lib/utils";

export const TaskDescription = ({ task, canEdit = false, onTaskUpdated }) => {
    const [draft, setDraft] = useState(null); // null = not editing
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (draft.trim() === (task.taskDescription || "").trim()) { setDraft(null); return; }
        setSaving(true);
        try {
            const res = await api.patch(`/tasks/${task._id}`, { taskDescription: draft.trim() });
            if (res.data?.task) onTaskUpdated?.(res.data.task);
            setDraft(null);
        } catch (error) {
            toast.error("Couldn't save the description", errorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900">Description</h3>
                {canEdit && draft === null && (
                    <button type="button" onClick={() => setDraft(task.taskDescription || "")} className={cn(btn.ghost, "-my-1.5 px-2 py-1 text-xs")}>
                        <Pencil size={13} aria-hidden="true" /> Edit
                    </button>
                )}
            </div>

            {draft !== null ? (
                <div className="space-y-2">
                    <textarea
                        autoFocus
                        aria-label="Task description"
                        rows={8}
                        value={draft}
                        disabled={saving}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") { e.preventDefault(); setDraft(null); }
                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); }
                        }}
                        placeholder="What needs to happen, and what does done look like?"
                        className="block w-full resize-y rounded-xl border border-indigo-300 bg-white p-4 text-sm leading-relaxed text-gray-800 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-3 ring-indigo-500/15 outline-none"
                    />
                    <div className="flex items-center justify-end gap-2">
                        <span className="mr-auto text-xs text-gray-500">⌘/Ctrl + Enter to save</span>
                        <button type="button" onClick={() => setDraft(null)} disabled={saving} className={cn(btn.ghost, "px-3 py-1.5")}>Cancel</button>
                        <button type="button" onClick={save} disabled={saving} className={cn(btn.primary, "px-3 py-1.5")}>
                            {saving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />} Save
                        </button>
                    </div>
                </div>
            ) : (
                <div className="max-h-96 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap wrap-anywhere">
                    {task.taskDescription || (
                        <span className="text-gray-500">{canEdit ? "No description yet. Add the context someone needs to pick this up." : "No description yet."}</span>
                    )}
                </div>
            )}

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
