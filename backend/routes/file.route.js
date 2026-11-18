import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import { uploadFile, getFilesByEntity, deleteFile } from '../controllers/file.controller.js';
import { rateLimit } from '../middleware/rateLimit.middleware.js';

const router = express.Router();

// Keyed per account (after protectRoute) so people sharing an office or proxy IP don't share a bucket.
const fileUploadLimiter = rateLimit({
    name: 'file:upload', limit: 30, window: '15 m', keyBy: 'user',
    message: 'Too many file upload requests. Please try again later.',
});
const fileReadLimiter = rateLimit({
    name: 'file:read', limit: 100, window: '15 m', keyBy: 'user',
    message: 'Too many requests. Please try again later.',
});

router.post('/upload', protectRoute, fileUploadLimiter, upload.single('file'), uploadFile);
router.get('/', protectRoute, fileReadLimiter, getFilesByEntity);
router.delete('/:fileId', protectRoute, fileReadLimiter, deleteFile);

export default router;
