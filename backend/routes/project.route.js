import express from 'express';
import {
    createProject,
    getAllProjects,
    updateProject,
    getProjectById,
    deleteProject
} from '../controllers/project.controller.js';
import { protectRoute, requirePermission } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protectRoute);

router.get('/', getAllProjects);
router.get('/:id', getProjectById);

router.post('/', requirePermission('manageProjects'), createProject);
router.put('/:id', requirePermission('manageProjects'), updateProject);
router.delete('/:id', requirePermission('manageProjects'), deleteProject);

export default router;