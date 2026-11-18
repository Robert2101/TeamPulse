import Task from '../models/task.model.js';
import { logActivity } from '../utils/activityLogger.js';
import { getIO } from '../socket/socket.js';
import { delCache } from '../config/redis.js';
import { idOf } from '../utils/projectAccess.js';

export const TASK_STATUSES = Task.schema.path('taskStatus').enumValues;

// Request values arrive as strings; stored ones may be ObjectIds or Dates.
const sameValue = (next, prev) => {
    if (prev instanceof Date) return Boolean(next) && new Date(next).getTime() === prev.getTime();
    return String(next?._id ?? next ?? '') === String(prev?._id ?? prev ?? '');
};

/**
 * The one write path for task updates, shared by the REST API and the AI assistant.
 * Applies `changes` (already authorized and allow-listed by the caller) to the task matching `filter`,
 * then runs every side effect an update needs: completedAt, cache invalidation, the audit log and the
 * realtime broadcast. Returns the populated task, or null when nothing matched the filter.
 */
export const applyTaskUpdate = async ({ filter, changes, user, source }) => {
    const previous = await Task.findOne(filter).lean();
    if (!previous) return null;

    const statusChanged = changes.taskStatus !== undefined && changes.taskStatus !== previous.taskStatus;
    const editedFields = Object.keys(changes).filter((key) => key !== 'taskStatus' && !sameValue(changes[key], previous[key]));

    const update = { ...changes, updatedBy: user._id };
    if (statusChanged) {
        // completedAt marks when the task reached Done; leaving Done clears it
        update.completedAt = changes.taskStatus === 'Done' ? new Date() : null;
    }

    const task = await Task.findOneAndUpdate({ ...filter, _id: previous._id }, update, { returnDocument: 'after', runValidators: true })
        .populate('assignee', 'fullName emailAddress profilePicture')
        .populate('updatedBy', 'fullName');
    if (!task) return null;

    const projectId = task.projectReference.toString();

    // Write Mongo FIRST -> delete Redis cache SECOND
    await delCache(`tasks:project:${projectId}`);
    await delCache(`dash:stats:${idOf(user.workspace)}`);

    // One audit entry per update: a status move reads as such; other edits list what changed.
    if (statusChanged || editedFields.length > 0) {
        await logActivity(user._id, user.workspace, statusChanged ? `Updated Task to ${task.taskStatus}` : 'Edited Task', 'Task', task._id, {
            taskName: task.taskName,
            newStatus: task.taskStatus,
            ...(statusChanged && { previousStatus: previous.taskStatus }),
            ...(editedFields.length > 0 && { fields: editedFields }),
            projectId,
            ...(source && { source }),
        });
    }

    getIO().to(projectId).emit('task-updated', task);
    return task;
};
