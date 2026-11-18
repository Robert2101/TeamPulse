import express from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import logger from './utils/logger.js';
import { csrfProtection, requireJsonBody } from './middleware/csrf.middleware.js';

import authRoutes from './routes/auth.route.js';
import projectRoutes from './routes/project.route.js';
import taskRoutes from './routes/task.route.js';
import commentRoutes from './routes/comment.route.js';
import chatbotRoutes from './routes/chatbot.route.js';
import activityRoutes from './routes/activity.route.js';
import fileRoutes from './routes/file.route.js';

// The Express app, without a listening server or database connection, so tests can import it directly.
const app = express();

// Behind a hosting proxy, req.ip is the proxy's address unless Express trusts it. Trust exactly
// TRUST_PROXY hops (default 1 in production, none in development) so X-Forwarded-For can't be spoofed.
const proxyHops = Number.parseInt(process.env.TRUST_PROXY ?? (process.env.NODE_ENV === 'production' ? '1' : '0'), 10);
app.set('trust proxy', Number.isNaN(proxyHops) ? 0 : proxyHops);

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true, // MUST BE TRUE to allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-CSRF-Token']
}));

app.use(requireJsonBody);
app.use(express.json());
app.use(cookieParser()); // Populates req.cookies
app.use(csrfProtection);
app.use(morgan(':method :url :status - :response-time ms', {
    stream: { write: (message) => logger.info(message.trim()) }
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/files', fileRoutes);

// Global multer error handler
app.use((err, req, res, next) => {
    if (err.name === 'MulterError' || err.message?.startsWith('File type')) {
        return res.status(400).json({ message: err.message });
    }
    next(err);
});

export default app;
