import Comment from '../models/comment.model.js';
import Task from '../models/task.model.js';
import logger from '../utils/logger.js';
import { getIO } from '../socket/socket.js';
import { logActivity } from '../utils/activityLogger.js';

export const addComment = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { commentContent, attachments, visibleTo } = req.body;

        if (!commentContent) {
            return res.status(400).json({ message: "Comment content is required." });
        }

        const task = await Task.findById(taskId).populate('projectReference');
        if (!task) return res.status(404).json({ message: "Task not found." });

        const project = task.projectReference;

        const isAdmin = req.dbUser.role.roleName === 'Admin';
        const isManager = project.projectManager.toString() === req.dbUser._id.toString();
        const isMember = project.assignedTeamMembers.includes(req.dbUser._id);

        if (!isAdmin && !isManager && !isMember) {
            return res.status(403).json({ message: "Access Denied. You cannot comment on this task." });
        }

        const newComment = new Comment({
            commentContent,
            author: req.dbUser._id,
            task: taskId,
            attachments,
            visibleTo
        });

        const savedComment = await newComment.save();
        await savedComment.populate('author', 'fullName profilePicture');

        task.comments.push(savedComment._id);
        await task.save();

        getIO().to(project._id.toString()).emit('new-comment', {
            taskId: taskId,
            comment: savedComment
        });

        await logActivity(req.dbUser._id, 'Added Comment', 'Comment', savedComment._id, { taskId });

        res.status(201).json({ message: "Comment added", comment: savedComment });

    } catch (error) {
        logger.error(`Error adding comment: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: "Internal server error." });
    }
};

export const getCommentsByTask = async (req, res) => {
    try {
        const { taskId } = req.params;

        const task = await Task.findById(taskId).populate('projectReference');
        if (!task) {
            return res.status(404).json({ message: "Task not found." });
        }

        const project = task.projectReference;

        const isAdmin = req.dbUser.role.roleName === 'Admin';
        const isManager = project.projectManager.toString() === req.dbUser._id.toString();
        const isMember = project.assignedTeamMembers.includes(req.dbUser._id);

        if (!isAdmin && !isManager && !isMember) {
            logger.warn(`Security Alert: User ${req.dbUser.emailAddress} attempted to read comments on unauthorized task ${taskId}`);
            return res.status(403).json({ message: "Access Denied. You cannot view comments for this project." });
        }

        const comments = await Comment.find({ task: taskId })
            .populate('author', 'fullName profilePicture')
            .populate('attachments') // FIX: Populate attachments so images render on refresh!
            .sort({ createdAt: 1 });

        res.status(200).json(comments);

    } catch (error) {
        logger.error(`Error fetching comments: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: "Internal server error." });
    }
};

export const editComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { commentContent, pinned } = req.body;

        const comment = await Comment.findById(id);
        if (!comment) return res.status(404).json({ message: "Comment not found." });

        if (comment.author.toString() !== req.dbUser._id.toString() && req.dbUser.role.roleName !== 'Admin') {
            return res.status(403).json({ message: "You can only edit your own comments." });
        }

        if (commentContent) {
            comment.commentContent = commentContent;
            comment.edited = true;
            comment.editTimestamp = new Date();
        }
        if (pinned !== undefined) comment.pinned = pinned;

        let updatedComment = await comment.save();

        updatedComment = await updatedComment.populate('author', 'fullName profilePicture');
        updatedComment = await updatedComment.populate('attachments');

        await logActivity(req.dbUser._id, 'Edited Comment', 'Comment', updatedComment._id, { taskId: comment.task });

        const taskObj = await Task.findById(comment.task);
        if (taskObj) {
            getIO().to(taskObj.projectReference.toString()).emit('comment-edited', updatedComment);
        }

        res.status(200).json({ message: "Comment updated", comment: updatedComment });

    } catch (error) {
        logger.error(`Error updating comment: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: "Internal server error." });
    }
};

export const deleteComment = async (req, res) => {
    try {
        const { id } = req.params;

        const comment = await Comment.findById(id);
        if (!comment) return res.status(404).json({ message: "Comment not found." });

        if (comment.author.toString() !== req.dbUser._id.toString() && req.dbUser.role.roleName !== 'Admin') {
            return res.status(403).json({ message: "You can only delete your own comments." });
        }

        const taskObj = await Task.findById(comment.task); // Fetch task to get projectId for socket

        await Comment.findByIdAndDelete(id);

        await Task.findByIdAndUpdate(comment.task, { $pull: { comments: id } });

        await logActivity(req.dbUser._id, 'Deleted Comment', 'Comment', id, { taskId: comment.task });

        if (taskObj) {
            getIO().to(taskObj.projectReference.toString()).emit('comment-deleted', id);
        }

        res.status(200).json({ message: "Comment deleted successfully." });

    } catch (error) {
        logger.error(`Error deleting comment: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: "Internal server error." });
    }
};