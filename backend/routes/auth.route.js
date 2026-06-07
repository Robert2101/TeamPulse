import express from 'express';
import { signup, login, logout, checkAuth, getWorkspaceUsers, updateUserRole, updateUserStatus, updateProfile } from '../controllers/auth.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);

// This is the endpoint you call in App.jsx useEffect
router.get('/check-auth', protectRoute, checkAuth);
router.put('/profile', protectRoute, updateProfile);

// Workspace Administration Routes
router.get('/workspace/users', protectRoute, getWorkspaceUsers);
router.put('/workspace/users/:userId/role', protectRoute, updateUserRole);
router.put('/workspace/users/:userId/status', protectRoute, updateUserStatus);

export default router;