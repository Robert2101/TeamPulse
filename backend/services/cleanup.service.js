import Task from '../models/task.model.js';
import Comment from '../models/comment.model.js';
import FileAsset from '../models/fileAsset.model.js';
import cloudinary from '../config/cloudinary.js';
import logger from '../utils/logger.js';
import { isDemoAsset } from '../utils/demoAssets.js';

/**
 * Deletes tasks with their comments and the file records attached to either. Returns the deleted
 * FileAssets so the caller can remove the stored files once the transaction has committed
 * (Cloudinary can't take part in a database transaction).
 */
export const deleteTasksCascade = async (taskIds, session) => {
    if (taskIds.length === 0) return [];

    const comments = await Comment.find({ task: { $in: taskIds } }).select('_id').session(session).lean();
    const commentIds = comments.map((comment) => comment._id);
    const files = await FileAsset.find({
        $or: [
            { entityType: 'Task', entityId: { $in: taskIds } },
            { entityType: 'Comment', entityId: { $in: commentIds } },
        ],
    }).session(session).lean();

    await FileAsset.deleteMany({ _id: { $in: files.map((file) => file._id) } }, { session });
    await Comment.deleteMany({ _id: { $in: commentIds } }, { session });
    await Task.deleteMany({ _id: { $in: taskIds } }, { session });
    return files;
};

/** Best-effort removal of stored files from Cloudinary, a few at a time. Failures are logged, never thrown. */
export const destroyStoredFiles = async (allFiles) => {
    const files = allFiles.filter((file) => !isDemoAsset(file));
    for (let i = 0; i < files.length; i += 10) {
        const batch = files.slice(i, i + 10);
        const results = await Promise.allSettled(batch.map((file) =>
            cloudinary.uploader.destroy(file.cloudinaryId, { resource_type: file.cloudinaryResourceType || 'raw' })
        ));
        results.forEach((result, j) => {
            if (result.status === 'rejected') {
                logger.warn(`Cloudinary cleanup failed for ${batch[j].cloudinaryId}: ${result.reason?.message}`);
            }
        });
    }
};
