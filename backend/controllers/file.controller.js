import cloudinary from '../config/cloudinary.js';
import FileAsset from '../models/fileAsset.model.js';
import Task from '../models/task.model.js';
import Comment from '../models/comment.model.js';
import Project from '../models/project.model.js';
import User from '../models/user.model.js';
import logger from '../utils/logger.js';
import { logActivity } from '../utils/activityLogger.js';
import { getIO } from '../socket/socket.js'; //  NEW: Import socket instance


export const uploadFile = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file provided." });
        const { entityType, entityId } = req.body;

        if (!entityType || !entityId) return res.status(400).json({ message: "entityType and entityId are required." });
        if (!["Task", "Comment", "User", "Project"].includes(entityType)) return res.status(400).json({ message: "Invalid entityType." });

        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: `teampulse/${entityType.toLowerCase()}s`, resource_type: 'auto', use_filename: true, unique_filename: true },
                (error, result) => error ? reject(error) : resolve(result)
            );
            uploadStream.end(req.file.buffer);
        });

        const fileAsset = await FileAsset.create({
            url: uploadResult.secure_url,
            name: req.file.originalname,
            fileType: req.file.mimetype,
            size: req.file.size,
            cloudinaryId: uploadResult.public_id,
            cloudinaryResourceType: uploadResult.resource_type || 'raw',
            uploadedBy: req.dbUser._id,
            entityType,
            entityId,
        });

        let projectIdToBroadcast = null;

        if (entityType === 'Task') {
            const task = await Task.findByIdAndUpdate(entityId, { $push: { attachments: fileAsset._id } });
            if (task) projectIdToBroadcast = task.projectReference;
        } else if (entityType === 'Comment') {
            const comment = await Comment.findByIdAndUpdate(entityId, { $push: { attachments: fileAsset._id } }).populate('task');
            if (comment && comment.task) projectIdToBroadcast = comment.task.projectReference;
        } else if (entityType === 'Project') {
            await Project.findByIdAndUpdate(entityId, { $push: { assets: fileAsset._id } });
            projectIdToBroadcast = entityId;
        } else if (entityType === 'User') {
            await User.findByIdAndUpdate(entityId, { profilePicture: uploadResult.secure_url });
        }

        const populated = await fileAsset.populate('uploadedBy', 'fullName');

        await logActivity(req.dbUser._id, 'Uploaded File', entityType, entityId, { fileName: req.file.originalname, fileId: fileAsset._id });

        if (projectIdToBroadcast) {
            getIO().to(projectIdToBroadcast.toString()).emit('file-uploaded', { entityType, entityId, file: populated });
        }

        res.status(201).json({ message: "File uploaded successfully.", file: populated });

    } catch (error) {
        logger.error(`File upload error: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: "File upload failed." });
    }
};

export const getFilesByEntity = async (req, res) => {
    try {
        const { entityType, entityId } = req.query;
        if (!entityType || !entityId) return res.status(400).json({ message: "entityType and entityId are required." });

        const files = await FileAsset.find({ entityType, entityId })
            .populate('uploadedBy', 'fullName profilePicture')
            .sort({ createdAt: -1 });
        res.status(200).json(files);
    } catch (error) {
        logger.error(`Error fetching files: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: "Internal server error." });
    }
};


export const deleteFile = async (req, res) => {
    try {
        const { fileId } = req.params;
        const file = await FileAsset.findById(fileId);

        if (!file) return res.status(404).json({ message: "File not found." });

        if (file.uploadedBy.toString() !== req.dbUser._id.toString() && req.dbUser.role.roleName !== 'Admin') {
            return res.status(403).json({ message: "You are not authorised to delete this file." });
        }

        await cloudinary.uploader.destroy(file.cloudinaryId, { resource_type: file.cloudinaryResourceType || 'raw' });

        let projectIdToBroadcast = null;

        if (file.entityType === 'Task') {
            const task = await Task.findByIdAndUpdate(file.entityId, { $pull: { attachments: file._id } });
            if (task) projectIdToBroadcast = task.projectReference;
        } else if (file.entityType === 'Comment') {
            const comment = await Comment.findByIdAndUpdate(file.entityId, { $pull: { attachments: file._id } }).populate('task');
            if (comment && comment.task) projectIdToBroadcast = comment.task.projectReference;
        } else if (file.entityType === 'Project') {
            await Project.findByIdAndUpdate(file.entityId, { $pull: { assets: file._id } });
            projectIdToBroadcast = file.entityId;
        }

        await FileAsset.findByIdAndDelete(fileId);
        await logActivity(req.dbUser._id, 'Deleted File', file.entityType, file.entityId, { fileName: file.name });

        if (projectIdToBroadcast) {
            getIO().to(projectIdToBroadcast.toString()).emit('file-deleted', { entityType: file.entityType, entityId: file.entityId, fileId });
        }

        res.status(200).json({ message: "File deleted successfully." });

    } catch (error) {
        logger.error(`File delete error: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: "Internal server error." });
    }
};