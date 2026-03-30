import Activity from '../models/activity.model.js';
import Task from '../models/task.model.js';
import Comment from '../models/comment.model.js';
import Project from '../models/project.model.js';
import logger from '../utils/logger.js';

export const getActivityLogs = async (req, res) => {
    try {
        const { entityId: projectId } = req.params;

        // RBAC FIX: Check if user actually belongs to this project
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found." });
        }

        const isAdmin = req.dbUser.role.roleName === 'Admin';
        const isManager = project.projectManager.toString() === req.dbUser._id.toString();
        const isMember = project.assignedTeamMembers.includes(req.dbUser._id);

        if (!isAdmin && !isManager && !isMember) {
            logger.warn(`Security Alert: User ${req.dbUser.emailAddress} attempted to read logs of an unauthorized project.`);
            return res.status(403).json({ message: "Access Denied." });
        }


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