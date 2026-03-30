import express from 'express';
import { askChatbot, getChatHistory } from '../controllers/chatbot.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/ask', protectRoute, askChatbot);
router.get('/history', protectRoute, getChatHistory);

export default router;