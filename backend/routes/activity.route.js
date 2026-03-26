import express from 'express';
import { getActivityLogs } from '../controllers/activity.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/:entityId', protectRoute, getActivityLogs);

export default router;