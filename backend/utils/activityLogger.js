import Activity from '../models/activity.model.js';
import User from '../models/user.model.js';
import logger from './logger.js';

export const logActivity = async (userId, action, entityType, entityId, metadata = {}) => {
    try {
        const user = await User.findById(userId);
        await Activity.create({
            user: userId,
            workspace: user ? user.workspace : null,
            action,
            entityType,
            entityId,
            metadata
        });
    } catch (error) {
        logger.error(`Failed to log activity: ${error.message}`);
    }
};