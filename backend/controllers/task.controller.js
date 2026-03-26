import Task from '../models/task.model.js';
import Project from '../models/project.model.js';
import Comment from '../models/comment.model.js';
import logger from '../utils/logger.js';
import { logActivity } from '../utils/activityLogger.js';
import { getIO } from '../socket/socket.js';

export const createTask = async (req, res) => {
    try {
        const { taskName, taskDescription, projectReference, assignee, dueDate, priority } = req.body;

        if (!taskName || !projectReference) {
            return res.status(400).json({ message: "Task name and Project Reference are required." });
        }

        const project = await Project.findById(projectReference);
        if (!project) {
            return res.status(404).json({ message: "Project not found." });
        }

        const isAdmin = req.dbUser.role.roleName === 'Admin';
        const isManager = project.projectManager.toString() === req.dbUser._id.toString();
        const isMember = project.assignedTeamMembers.includes(req.dbUser._id);

        if (!isAdmin && !isManager && !isMember) {
            logger.warn(`Security Alert: User ${req.dbUser.emailAddress} attempted to create a task in an unauthorized project.`);
            return res.status(403).json({ message: "Access Denied. You cannot create tasks in a project you do not belong to." });
        }

        const newTask = new Task({
            taskName,
            taskDescription,
            projectReference,
            assignee: assignee || null,
            dueDate,
            priority,
            taskStatus: "To-Do",
            createdBy: req.dbUser._id
        });

        const savedTask = await newTask.save();

        await logActivity(req.dbUser._id, 'Created Task', 'Task', savedTask._id, { taskName, project: projectReference });

        logger.info(`Task created: '${taskName}' in Project '${projectReference}' by User ID: ${req.dbUser._id}`);

        //  FIX: Populate it before sending it back and broadcasting it
        const populatedTask = await Task.findById(savedTask._id).populate('assignee', 'fullName emailAddress');

        if (!populatedTask) {
            logger.warn(`Race condition: Task ${savedTask._id} was deleted before it could be populated.`);
            return res.status(201).json({ message: "Task created successfully", task: savedTask });
        }

        // FIX: Emit 'task-created' (your frontend ProjectBoard listens for this, not 'task-updated')
        getIO().to(populatedTask.projectReference.toString()).emit('task-created', populatedTask);

        // FIX: Return populatedTask in the response so the creator sees the assignee instantly
        res.status(201).json({ message: "Task created successfully", task: populatedTask });

    } catch (error) {
        logger.error(`Error creating task: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: "Internal server error while creating task." });
    }
};

export const getTasksByProject = async (req, res) => {
    try {
        const { projectId } = req.params;

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found." });
        }

        const isAdmin = req.dbUser.role.roleName === 'Admin';
        const isManager = project.projectManager.toString() === req.dbUser._id.toString();
        const isMember = project.assignedTeamMembers.includes(req.dbUser._id);

        if (!isAdmin && !isManager && !isMember) {
            logger.warn(`Unauthorized task access attempt by User ${req.dbUser.emailAddress} on Project ${projectId}`);
            return res.status(403).json({ message: "Access Denied. You are not a member of this project." });
        }

        const tasks = await Task.find({ projectReference: projectId })
            .populate('assignee', 'fullName emailAddress profilePicture')
            .populate('createdBy', 'fullName')
            .sort({ createdAt: -1 });

        res.status(200).json(tasks);

    } catch (error) {
        logger.error(`Error fetching tasks for project ${req.params.projectId}: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: "Internal server error while fetching tasks." });
    }
};

export const updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const task = await Task.findById(id);
        if (!task) {
            return res.status(404).json({ message: "Task not found." });
        }

        const project = await Project.findById(task.projectReference);
        if (!project) {
            return res.status(404).json({ message: "Associated project not found." });
        }

        const isAdmin = req.dbUser.role.roleName === 'Admin';
        const isManager = project.projectManager.toString() === req.dbUser._id.toString();
        const isMember = project.assignedTeamMembers.includes(req.dbUser._id);

        if (!isAdmin && !isManager && !isMember) {
            logger.warn(`Security Alert: User ${req.dbUser.emailAddress} attempted to update Task ${id} in an unauthorized project.`);
            return res.status(403).json({ message: "Access Denied. You cannot update tasks in a project you do not belong to." });
        }

        updateData.updatedBy = req.dbUser._id;

        if (updateData.taskStatus === "Done") {
            updateData.completedAt = new Date();
        }

        const updatedTask = await Task.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        const populatedTask = await Task.findById(updatedTask._id).populate('assignee', 'fullName emailAddress');

        await logActivity(req.dbUser._id, `Updated Task to ${populatedTask.taskStatus}`, 'Task', populatedTask._id, {
            taskName: populatedTask.taskName,
            newStatus: populatedTask.taskStatus
        });

        logger.info(`Task updated: '${populatedTask.taskName}' (ID: ${id}) by User ID: ${req.dbUser._id}`);
        getIO().to(populatedTask.projectReference.toString()).emit('task-updated', populatedTask);
        res.status(200).json({ message: "Task updated successfully", task: populatedTask });

    } catch (error) {
        logger.error(`Error updating task (ID: ${req.params.id}): ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: "Internal server error while updating task." });
    }
};

export const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;

        const task = await Task.findById(id);
        if (!task) {
            return res.status(404).json({ message: "Task not found." });
        }

        const project = await Project.findById(task.projectReference);
        if (!project) {
            return res.status(404).json({ message: "Associated project not found." });
        }

        const isAdmin = req.dbUser.role.roleName === 'Admin';
        const isManager = project.projectManager.toString() === req.dbUser._id.toString();

        if (!isAdmin && !isManager) {
            logger.warn(`Security Alert: User ${req.dbUser.emailAddress} attempted to delete Task ${id} without authorization.`);
            return res.status(403).json({ message: "Access Denied. Only the Project Manager or an Admin can delete tasks." });
        }

        await Task.findByIdAndDelete(id);

        await Comment.deleteMany({ task: id });

        await logActivity(req.dbUser._id, 'Deleted Task', 'Task', id, { taskName: task.taskName });

        logger.info(`Cascade Delete Executed: Task '${task.taskName}' and its comments deleted by User ID: ${req.dbUser._id}`);
        res.status(200).json({ message: "Task and associated comments deleted successfully." });

    } catch (error) {
        logger.error(`Error deleting task (ID: ${req.params.id}): ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: "Internal server error while deleting task." });
    }
};