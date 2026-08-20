import Activity from '../models/activity.model.js';
import logger from './logger.js';
import { delCache, delWorkspaceCacheKeys } from '../config/redis.js';

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

        // Write Mongo FIRST -> delete Redis cache SECOND (Cache Invalidation Funnel)
        const wsId = workspaceId?._id?.toString() || workspaceId?.toString();
        const projectId = metadata.projectId || metadata.project || (entityType === 'Project' ? entityId?.toString() : null);

        if (projectId) {
            await delCache(`activity:${projectId}`);
            await delCache(`tasks:project:${projectId}`);
            // Also invalidate workspace-scoped project detail cache
            if (wsId) {
                await delCache(`project:${wsId}:${projectId}`);
            }
        }

        if (wsId) {
            await delCache(`dash:stats:${wsId}`);
            if (entityType === 'Project') {
                await delWorkspaceCacheKeys(wsId);
            }
        }
    } catch (error) {
        logger.error(`Failed to log activity: ${error.message}`);
    }
};