import express from 'express';
import { askChatbot } from '../controllers/chatbot.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/ask', protectRoute, askChatbot);

export default router;