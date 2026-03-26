import express from 'express';
import { signup, login, logout, checkAuth } from '../controllers/auth.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);

// This is the endpoint you call in App.jsx useEffect
router.get('/check-auth', protectRoute, checkAuth);

export default router;