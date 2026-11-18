import cloudinary from '../config/cloudinary.js';
import FileAsset from '../models/fileAsset.model.js';
import Task from '../models/task.model.js';
import Comment from '../models/comment.model.js';
import Project from '../models/project.model.js';
import User from '../models/user.model.js';
import logger from '../utils/logger.js';
import { logActivity } from '../utils/activityLogger.js';
import { getIO } from '../socket/socket.js';
import { canAccessProject } from '../utils/projectAccess.js';

const PROJECT_SCOPED = ['Task', 'Comment', 'Project'];

// The project a Task, Comment or Project file belongs to, looked up inside the caller's workspace.
const findOwningProject = async (entityType, entityId, workspace) => {
    let projectId = entityId;
    if (entityType === 'Task') {
        const task = await Task.findOne({ _id: entityId, workspace }).select('projectReference').lean();
        projectId = task?.projectReference;
    } else if (entityType === 'Comment') {
        const comment = await Comment.findOne({ _id: entityId, workspace }).select('task').lean();
        const task = comment && await Task.findOne({ _id: comment.task, workspace }).select('projectReference').lean();
        projectId = task?.projectReference;
    }
    return projectId ? Project.findOne({ _id: projectId, workspace }).lean() : null;
};

export const uploadFile = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file provided." });
        const { entityType, entityId } = req.body;

        if (!entityType || !entityId) return res.status(400).json({ message: "entityType and entityId are required." });
        if (!["Task", "Comment", "User", "Project"].includes(entityType)) return res.status(400).json({ message: "Invalid entityType." });

        let finalEntityId = entityId;
        let projectIdToBroadcast = null;

        if (entityType === 'User') {
            finalEntityId = req.dbUser._id.toString(); // IDOR FIX: Users can only upload their own profile pic
        } else {
            // Task and comment attachments need the same project access as the project itself.
            const project = await findOwningProject(entityType, entityId, req.dbUser.workspace);
            if (!project) {
                return res.status(404).json({ message: `Target ${entityType.toLowerCase()} not found in your workspace.` });
            }
            if (!canAccessProject(project, req.dbUser)) {
                return res.status(403).json({ message: "Access Denied. You cannot upload files to this project." });
            }
            projectIdToBroadcast = project._id;
        }

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
            workspace: req.dbUser.workspace,
            uploadedBy: req.dbUser._id,
            entityType,
            entityId: finalEntityId,
        });

        if (entityType === 'Task') {
            await Task.updateOne({ _id: finalEntityId }, { $push: { attachments: fileAsset._id } });
        } else if (entityType === 'Comment') {
            await Comment.updateOne({ _id: finalEntityId }, { $push: { attachments: fileAsset._id } });
        } else if (entityType === 'Project') {
            await Project.updateOne({ _id: finalEntityId }, { $push: { assets: fileAsset._id } });
        } else if (entityType === 'User') {
            await User.findByIdAndUpdate(finalEntityId, { profilePicture: uploadResult.secure_url });
        }

        const populated = await fileAsset.populate('uploadedBy', 'fullName');

        await logActivity(req.dbUser._id, req.dbUser.workspace, 'Uploaded File', entityType, finalEntityId, { fileName: req.file.originalname, fileId: fileAsset._id });

        if (projectIdToBroadcast) {
            getIO().to(projectIdToBroadcast.toString()).emit('file-uploaded', { entityType, entityId: finalEntityId, file: populated });
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

        // RBAC: project files are visible only to people with access to that project
        if (PROJECT_SCOPED.includes(entityType)) {
            const project = await findOwningProject(entityType, entityId, req.dbUser.workspace);
            if (project && !canAccessProject(project, req.dbUser)) {
                return res.status(403).json({ message: "Access Denied." });
            }
        }

        const files = await FileAsset.find({ entityType, entityId, workspace: req.dbUser.workspace })
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

        const userWs = req.dbUser.workspace?._id?.toString() || req.dbUser.workspace?.toString();
        const fileWs = file.workspace?._id?.toString() || file.workspace?.toString();

        if (userWs !== fileWs) {
            return res.status(403).json({ message: "Access Denied. File belongs to another workspace." });
        }

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
        await logActivity(req.dbUser._id, req.dbUser.workspace, 'Deleted File', file.entityType, file.entityId, { fileName: file.name });

        if (projectIdToBroadcast) {
            getIO().to(projectIdToBroadcast.toString()).emit('file-deleted', { entityType: file.entityType, entityId: file.entityId, fileId });
        }

        res.status(200).json({ message: "File deleted successfully." });

    } catch (error) {
        logger.error(`File delete error: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: "Internal server error." });
    }
};