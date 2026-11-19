import express from 'express';
import { startDemo, switchDemoPersona } from '../controllers/demo.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';
import { rateLimit } from '../middleware/rateLimit.middleware.js';

const router = express.Router();

// Each sandbox is ~100 documents, so starts are limited per client IP.
const demoStartLimiter = rateLimit({
    name: 'demo', limit: 12, window: '1 h',
    message: 'Too many demo workspaces from your network in the last hour. Please try again later.',
});

router.post('/start', demoStartLimiter, startDemo);
router.post('/switch', protectRoute, switchDemoPersona);

export default router;
