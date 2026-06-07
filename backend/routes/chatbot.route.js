import express from 'express';
import rateLimit from 'express-rate-limit';
import { askChatbot, getChatHistory } from '../controllers/chatbot.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

const chatbotLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 20, // per user
    keyGenerator: (req) => req.dbUser?._id?.toString() || req.ip,
    message: { message: 'Chatbot limit reached. Try again in an hour.' }
});

router.post('/ask', protectRoute, chatbotLimiter, askChatbot);
router.get('/history', protectRoute, getChatHistory);

export default router;