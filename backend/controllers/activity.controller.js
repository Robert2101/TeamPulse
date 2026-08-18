import Activity from '../models/activity.model.js';
import Task from '../models/task.model.js';
import Comment from '../models/comment.model.js';
import Project from '../models/project.model.js';
import logger from '../utils/logger.js';
import { getCache, setCache } from '../config/redis.js';

export const getActivityLogs = async (req, res) => {
    try {
        const { entityId: projectId } = req.params;
        const cacheKey = `activity:${projectId}`;

        const cached = await getCache(cacheKey);
        if (cached) {
            return res.status(200).json(cached);
        }

        // RBAC Check: Check if user actually belongs to this project
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found." });
        }

        const isAdmin = req.dbUser.role.roleName === 'Admin';
        const isManager = project.projectManager ? project.projectManager.toString() === req.dbUser._id.toString() : false;
        const isMember = Array.isArray(project.assignedTeamMembers) && project.assignedTeamMembers.some(id => id.toString() === req.dbUser._id.toString());

        if (!isAdmin && !isManager && !isMember) {
            logger.warn(`Security Alert: User ${req.dbUser.emailAddress} attempted to read logs of an unauthorized project.`);
            return res.status(403).json({ message: "Access Denied." });
        }

        const tasks = await Task.find({ projectReference: projectId, workspace: req.dbUser.workspace }).select('_id').lean();
        const taskIds = tasks.map(t => t._id);

        const comments = await Comment.find({ task: { $in: taskIds }, workspace: req.dbUser.workspace }).select('_id').lean();
        const commentIds = comments.map(c => c._id);

        const allRelatedIds = [projectId, ...taskIds, ...commentIds];

        const activities = await Activity.find({ entityId: { $in: allRelatedIds }, workspace: req.dbUser.workspace })
            .populate('user', 'fullName profilePicture emailAddress')
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        await setCache(cacheKey, activities, 30); // 30s TTL

        res.status(200).json(activities);
    } catch (error) {
        logger.error(`Error fetching activity logs: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: "Internal server error." });
    }
};