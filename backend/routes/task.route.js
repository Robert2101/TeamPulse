import express from 'express';
import {
    createTask,
    getTasksByProject,
    updateTask,
    deleteTask,
    getMyTasks
} from '../controllers/task.controller.js';
import { protectRoute, requirePermission } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protectRoute);

router.post('/', requirePermission('manageTasks'), createTask);
router.get('/project/:projectId', getTasksByProject);
router.get('/mine', getMyTasks);
router.patch('/:id', requirePermission('manageTasks'), updateTask);
router.delete('/:id', requirePermission('manageTasks'), deleteTask);

export default router;