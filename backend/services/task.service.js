import Task from '../models/task.model.js';
import { logActivity } from '../utils/activityLogger.js';
import { getIO } from '../socket/socket.js';
import { delCache } from '../config/redis.js';
import { idOf } from '../utils/projectAccess.js';

export const TASK_STATUSES = Task.schema.path('taskStatus').enumValues;

/**
 * The one write path for task updates, shared by the REST API and the AI assistant.
 * Applies `changes` (already authorized and allow-listed by the caller) to the task matching `filter`,
 * then runs every side effect an update needs: completedAt, cache invalidation, the audit log and the
 * realtime broadcast. Returns the populated task, or null when nothing matched the filter.
 */
export const applyTaskUpdate = async ({ filter, changes, user, source }) => {
    const update = { ...changes, updatedBy: user._id };
    if (update.taskStatus === 'Done') {
        update.completedAt = new Date();
    }

    const task = await Task.findOneAndUpdate(filter, update, { returnDocument: 'after', runValidators: true })
        .populate('assignee', 'fullName emailAddress')
        .populate('updatedBy', 'fullName');
    if (!task) return null;

    const projectId = task.projectReference.toString();

    // Write Mongo FIRST -> delete Redis cache SECOND
    await delCache(`tasks:project:${projectId}`);
    await delCache(`dash:stats:${idOf(user.workspace)}`);

    await logActivity(user._id, user.workspace, `Updated Task to ${task.taskStatus}`, 'Task', task._id, {
        taskName: task.taskName,
        newStatus: task.taskStatus,
        projectId,
        ...(source && { source }),
    });

    getIO().to(projectId).emit('task-updated', task);
    return task;
};
