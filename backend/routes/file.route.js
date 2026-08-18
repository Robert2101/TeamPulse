import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import { uploadFile, getFilesByEntity, deleteFile } from '../controllers/file.controller.js';
import { checkRateLimit } from '../config/redis.js';

const router = express.Router();

const fileUploadLimiter = async (req, res, next) => {
    const identifier = req.ip || req.headers['x-forwarded-for'] || 'anonymous';
    const limitResult = await checkRateLimit(`file:upload:${identifier}`, 30, "15 m");
    if (!limitResult.success) {
        return res.status(429).json({ message: 'Too many file upload requests. Please try again later.' });
    }
    next();
};

const fileReadLimiter = async (req, res, next) => {
    const identifier = req.ip || req.headers['x-forwarded-for'] || 'anonymous';
    const limitResult = await checkRateLimit(`file:read:${identifier}`, 100, "15 m");
    if (!limitResult.success) {
        return res.status(429).json({ message: 'Too many requests. Please try again later.' });
    }
    next();
};

router.post('/upload', fileUploadLimiter, protectRoute, upload.single('file'), uploadFile);
router.get('/', fileReadLimiter, protectRoute, getFilesByEntity);
router.delete('/:fileId', fileReadLimiter, protectRoute, deleteFile);

export default router;
