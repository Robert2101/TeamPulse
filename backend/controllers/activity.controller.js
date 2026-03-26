import Activity from '../models/activity.model.js';
import Task from '../models/task.model.js';
import Comment from '../models/comment.model.js';
import logger from '../utils/logger.js';

export const getActivityLogs = async (req, res) => {
    try {
        const { entityId: projectId } = req.params;


        const tasks = await Task.find({ projectReference: projectId }).select('_id');
        const taskIds = tasks.map(t => t._id);

        const comments = await Comment.find({ task: { $in: taskIds } }).select('_id');
        const commentIds = comments.map(c => c._id);

        const allRelatedIds = [projectId, ...taskIds, ...commentIds];

        const activities = await Activity.find({ entityId: { $in: allRelatedIds } })
            .populate('user', 'fullName profilePicture emailAddress')
            .sort({ createdAt: -1 })
            .limit(100);

        res.status(200).json(activities);
    } catch (error) {
        logger.error(`Error fetching activity logs: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: "Internal server error." });
    }
};