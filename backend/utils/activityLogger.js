import Activity from '../models/activity.model.js';
import User from '../models/user.model.js';
import logger from './logger.js';

export const logActivity = async (userId, workspaceId, action, entityType, entityId, metadata = {}) => {
    try {
        await Activity.create({
            user: userId,
            workspace: workspaceId,
            action,
            entityType,
            entityId,
            metadata
        });
    } catch (error) {
        logger.error(`Failed to log activity: ${error.message}`);
    }
};