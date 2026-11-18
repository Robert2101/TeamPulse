import express from 'express';
import { signup, login, logout, checkAuth, getWorkspaceUsers, updateUserRole, updateUserStatus, updateProfile } from '../controllers/auth.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';
import { rateLimit } from '../middleware/rateLimit.middleware.js';

const router = express.Router();

const authRateLimiter = rateLimit({
    name: 'auth', limit: 10, window: '15 m',
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
});

router.post('/signup', authRateLimiter, signup);
router.post('/login', authRateLimiter, login);
router.post('/logout', logout);

// This is the endpoint you call in App.jsx useEffect
router.get('/check-auth', protectRoute, checkAuth);
router.put('/profile', protectRoute, updateProfile);

// Workspace Administration Routes
router.get('/workspace/users', protectRoute, getWorkspaceUsers);
router.put('/workspace/users/:userId/role', protectRoute, updateUserRole);
router.put('/workspace/users/:userId/status', protectRoute, updateUserStatus);

export default router;