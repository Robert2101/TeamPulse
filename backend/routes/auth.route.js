import express from 'express';
import rateLimit from 'express-rate-limit';
import { signup, login, logout, checkAuth, getWorkspaceUsers, updateUserRole, updateUserStatus, updateProfile } from '../controllers/auth.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: { message: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.post('/logout', logout);

// This is the endpoint you call in App.jsx useEffect
router.get('/check-auth', protectRoute, checkAuth);
router.put('/profile', protectRoute, updateProfile);

// Workspace Administration Routes
router.get('/workspace/users', protectRoute, getWorkspaceUsers);
router.put('/workspace/users/:userId/role', protectRoute, updateUserRole);
router.put('/workspace/users/:userId/status', protectRoute, updateUserStatus);

export default router;