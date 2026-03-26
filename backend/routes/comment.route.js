import express from 'express';
import { addComment, getCommentsByTask, editComment, deleteComment } from '../controllers/comment.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protectRoute);

router.post('/task/:taskId', addComment);
router.get('/task/:taskId', getCommentsByTask);
router.patch('/:id', editComment);
router.delete('/:id', deleteComment);

export default router;