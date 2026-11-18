import express from 'express';
import { askChatbot, getChatHistory } from '../controllers/chatbot.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';
import { rateLimit } from '../middleware/rateLimit.middleware.js';

const router = express.Router();

const chatbotRateLimiter = rateLimit({
    name: 'chatbot', limit: 20, window: '1 h', keyBy: 'user',
    message: 'Chatbot limit reached. Try again in an hour.',
});

router.post('/ask', protectRoute, chatbotRateLimiter, askChatbot);
router.get('/history', protectRoute, getChatHistory);

export default router;