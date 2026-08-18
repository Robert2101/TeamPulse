import express from 'express';
import { signup, login, logout, checkAuth, getWorkspaceUsers, updateUserRole, updateUserStatus, updateProfile } from '../controllers/auth.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';
import { checkRateLimit } from '../config/redis.js';

const router = express.Router();

const authRateLimiter = async (req, res, next) => {
    const identifier = req.ip || req.headers['x-forwarded-for'] || 'anonymous';
    const limitResult = await checkRateLimit(`auth:${identifier}`, 10, "15 m");
    if (!limitResult.success) {
        return res.status(429).json({ message: 'Too many authentication attempts. Please try again after 15 minutes.' });
    }
    next();
};

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