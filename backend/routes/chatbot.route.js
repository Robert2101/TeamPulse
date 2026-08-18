import express from 'express';
import { askChatbot, getChatHistory } from '../controllers/chatbot.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';
import { checkRateLimit } from '../config/redis.js';

const router = express.Router();

const chatbotRateLimiter = async (req, res, next) => {
    const identifier = req.dbUser?._id?.toString() || req.ip || 'anonymous';
    const limitResult = await checkRateLimit(`chatbot:${identifier}`, 20, "1 h");
    if (!limitResult.success) {
        return res.status(429).json({ message: 'Chatbot limit reached. Try again in an hour.' });
    }
    next();
};

router.post('/ask', protectRoute, chatbotRateLimiter, askChatbot);
router.get('/history', protectRoute, getChatHistory);

export default router;