import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import morgan from 'morgan';
import cookieParser from 'cookie-parser'; 
import cors from 'cors';
import { createServer } from 'http';
import { initSocket } from './socket/socket.js';
import logger from './utils/logger.js';

import authRoutes from './routes/auth.route.js'; 
import projectRoutes from './routes/project.route.js';
import taskRoutes from './routes/task.route.js';
import commentRoutes from './routes/comment.route.js';
import chatbotRoutes from './routes/chatbot.route.js';
import activityRoutes from './routes/activity.route.js';
import fileRoutes from './routes/file.route.js';

dotenv.config();
const app = express();

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true, // MUST BE TRUE to allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());
app.use(cookieParser()); // Populates req.cookies
app.use(morgan(':method :url :status - :response-time ms', {
    stream: { write: (message) => logger.info(message.trim()) }
}));

const httpServer = createServer(app);
initSocket(httpServer);

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

const PORT = process.env.PORT || 5001;

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        logger.info('Connected to MongoDB successfully');
        httpServer.listen(PORT, () => logger.info(`Server is running on port ${PORT}`));
    })
    .catch((err) => logger.error(`MongoDB connection error: ${err.message}`));