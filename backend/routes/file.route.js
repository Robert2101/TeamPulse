import express from 'express';
import rateLimit from 'express-rate-limit';
import { protectRoute } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import { uploadFile, getFilesByEntity, deleteFile } from '../controllers/file.controller.js';

const router = express.Router();

// Allow 30 uploads per 15 minutes per IP
const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { message: 'Too many file upload requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Allow 100 reads per 15 minutes per IP
const readLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { message: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/upload', uploadLimiter, protectRoute, upload.single('file'), uploadFile);
router.get('/', readLimiter, protectRoute, getFilesByEntity);
router.delete('/:fileId', readLimiter, protectRoute, deleteFile);

export default router;
