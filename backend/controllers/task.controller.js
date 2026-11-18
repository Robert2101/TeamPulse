import Task from '../models/task.model.js';
import Project from '../models/project.model.js';
import logger from '../utils/logger.js';
import { logActivity } from '../utils/activityLogger.js';
import { getIO } from '../socket/socket.js';
import { getCache, setCache, delCache } from '../config/redis.js';
import { canAccessProject, canManageProject } from '../utils/projectAccess.js';
import { pick } from '../utils/pick.js';
import { applyTaskUpdate } from '../services/task.service.js';
import { withTransaction } from '../utils/transaction.js';
import { deleteTasksCascade, destroyStoredFiles } from '../services/cleanup.service.js';

// Fields a PATCH may change. Members of a project may only move tasks between columns.
const MANAGER_TASK_FIELDS = ['taskName', 'taskDescription', 'assignee', 'dueDate', 'priority', 'taskStatus'];
const MEMBER_TASK_FIELDS = ['taskStatus'];

export const createTask = async (req, res) => {
    try {
        const { taskName, taskDescription, projectReference, assignee, dueDate, priority } = req.body;

        if (!taskName || !projectReference) {
            return res.status(400).json({ message: "Task name and Project Reference are required." });
        }

        const project = await Project.findOne({ _id: projectReference, workspace: req.dbUser.workspace });
        if (!project) {
            return res.status(404).json({ message: "Project not found in your workspace." });
        }

        if (!canAccessProject(project, req.dbUser)) {
            logger.warn(`Security Alert: User ${req.dbUser.emailAddress} attempted to create a task in an unauthorized project.`);
            return res.status(403).json({ message: "Access Denied. You cannot create tasks in a project you do not belong to." });
        }

        // Next number for the project's task keys (APP-12); $inc is atomic, so concurrent creates can't collide.
        const counter = await Project.findOneAndUpdate(
            { _id: project._id },
            { $inc: { taskCounter: 1 } },
            { returnDocument: 'after', projection: { taskCounter: 1 } }
        );

        const newTask = new Task({
            number: counter.taskCounter,
            taskName,
            taskDescription,
            projectReference,
            workspace: req.dbUser.workspace,
            assignee: assignee || null,
            dueDate,
            priority,
            taskStatus: "To-Do",
            createdBy: req.dbUser._id
        });

        const savedTask = await newTask.save();
        const workspaceId = req.dbUser.workspace?._id?.toString() || req.dbUser.workspace?.toString();

        // Write Mongo FIRST -> invalidate Redis cache keys SECOND
        await delCache(`tasks:project:${projectReference}`);
        await delCache(`dash:stats:${workspaceId}`);

        await logActivity(req.dbUser._id, req.dbUser.workspace, 'Created Task', 'Task', savedTask._id, { taskName, project: projectReference });

        logger.info(`Task created: '${taskName}' in Project '${projectReference}' by User ID: ${req.dbUser._id}`);

        const populatedTask = await Task.findById(savedTask._id).populate('assignee', 'fullName emailAddress');

        if (!populatedTask) {
            logger.warn(`Race condition: Task ${savedTask._id} was deleted before it could be populated.`);
            return res.status(201).json({ message: "Task created successfully", task: savedTask });
        }

        getIO().to(populatedTask.projectReference.toString()).emit('task-created', populatedTask);
        res.status(201).json({ message: "Task created successfully", task: populatedTask });

    } catch (error) {
        logger.error(`Error creating task: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: "Internal server error while creating task." });
    }
};

export const getTasksByProject = async (req, res) => {
    try {
        const { projectId } = req.params;

        // 1. MUST perform Project lookup & Workspace/RBAC authorization check FIRST
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found." });
        }

        const userWs = req.dbUser.workspace?._id?.toString() || req.dbUser.workspace?.toString();
        const projectWs = project.workspace?._id?.toString() || project.workspace?.toString();
        if (userWs !== projectWs) {
            logger.warn(`Cross-tenant security alert: User ${req.dbUser.emailAddress} attempted to access Project ${projectId} from another workspace.`);
            return res.status(403).json({ message: "Access Denied. Project belongs to another workspace." });
        }

        if (!canAccessProject(project, req.dbUser)) {
            logger.warn(`Unauthorized task access attempt by User ${req.dbUser.emailAddress} on Project ${projectId}`);
            return res.status(403).json({ message: "Access Denied. You are not a member of this project." });
        }

        // 2. Authorization passed: NOW check Upstash Redis cache
        const cacheKey = `tasks:project:${projectId}`;
        const cached = await getCache(cacheKey);
        if (cached) {
            return res.status(200).json(cached);
        }

        // 3. Cache miss: fetch from MongoDB and populate cache
        const tasks = await Task.find({ projectReference: projectId, workspace: req.dbUser.workspace })
            .populate('assignee', 'fullName emailAddress profilePicture')
            .populate('createdBy', 'fullName')
            .populate('updatedBy', 'fullName')
            .sort({ createdAt: -1 })
            .lean();

        await setCache(cacheKey, tasks, 30); // 30s TTL

        res.status(200).json(tasks);

    } catch (error) {
        logger.error(`Error fetching tasks for project ${req.params.projectId}: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: "Internal server error while fetching tasks." });
    }
};

export const getDashboardStats = async (req, res) => {
    try {
        const workspaceId = req.dbUser.workspace?._id?.toString() || req.dbUser.workspace?.toString();
        const cacheKey = `dash:stats:${workspaceId}`;

        const cached = await getCache(cacheKey);
        if (cached) {
            return res.status(200).json(cached);
        }

        // Single query over workspace tasks (collapses N+1 queries)
        const allTasks = await Task.find({ workspace: req.dbUser.workspace })
            .select('taskStatus priority')
            .lean();

        const stats = {
            todo: allTasks.filter(t => t.taskStatus === 'To-Do').length,
            inProgress: allTasks.filter(t => t.taskStatus === 'In-Progress').length,
            review: allTasks.filter(t => t.taskStatus === 'Review').length,
            done: allTasks.filter(t => t.taskStatus === 'Done').length,
            urgent: allTasks.filter(t => t.priority === 'Urgent' && t.taskStatus !== 'Done').length,
            total: allTasks.length
        };

        await setCache(cacheKey, stats, 45); // 45s TTL

        res.status(200).json(stats);
    } catch (error) {
        logger.error(`Error fetching dashboard stats: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: "Internal server error while fetching dashboard stats." });
    }
};

export const getMyTasks = async (req, res) => {
    try {
        const tasks = await Task.find({ assignee: req.dbUser._id, workspace: req.dbUser.workspace })
            .populate('projectReference', 'projectName key')
            .sort({ dueDate: 1 });
        res.status(200).json(tasks);
    } catch (error) {
        logger.error(`Error fetching user tasks: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: "Internal server error while fetching user tasks." });
    }
};

export const updateTask = async (req, res) => {
    try {
        const { id } = req.params;

        const task = await Task.findOne({ _id: id, workspace: req.dbUser.workspace });
        if (!task) {
            return res.status(404).json({ message: "Task not found." });
        }

        const project = await Project.findById(task.projectReference);
        if (!project) {
            return res.status(404).json({ message: "Associated project not found." });
        }

        if (!canAccessProject(project, req.dbUser)) {
            logger.warn(`Security Alert: User ${req.dbUser.emailAddress} attempted to update Task ${id} in an unauthorized project.`);
            return res.status(403).json({ message: "Access Denied. You cannot update tasks in a project you do not belong to." });
        }

        // S-04: allow-list the body so protected fields (and `$set`-style operators) can't be mass-assigned
        const changes = pick(req.body, canManageProject(project, req.dbUser) ? MANAGER_TASK_FIELDS : MEMBER_TASK_FIELDS);

        const updatedTask = await applyTaskUpdate({
            filter: { _id: id, workspace: req.dbUser.workspace },
            changes,
            user: req.dbUser,
        });
        if (!updatedTask) {
            return res.status(404).json({ message: "Task not found." });
        }

        logger.info(`Task updated: '${updatedTask.taskName}' (ID: ${id}) by User ID: ${req.dbUser._id}`);
        res.status(200).json({ message: "Task updated successfully", task: updatedTask });

    } catch (error) {
        if (error.name === 'ValidationError' || error.name === 'CastError') {
            return res.status(400).json({ message: error.message });
        }
        logger.error(`Error updating task (ID: ${req.params.id}): ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: "Internal server error while updating task." });
    }
};

export const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;

        const task = await Task.findOne({ _id: id, workspace: req.dbUser.workspace });
        if (!task) {
            return res.status(404).json({ message: "Task not found." });
        }

        const project = await Project.findById(task.projectReference);
        if (!project) {
            return res.status(404).json({ message: "Associated project not found." });
        }

        if (!canManageProject(project, req.dbUser)) {
            logger.warn(`Security Alert: User ${req.dbUser.emailAddress} attempted to delete Task ${id} without authorization.`);
            return res.status(403).json({ message: "Access Denied. Only the Project Manager or an Admin can delete tasks." });
        }

        // Task, its comments and their file records go together; stored files after the commit
        const files = await withTransaction((session) => deleteTasksCascade([task._id], session));
        await destroyStoredFiles(files);

        const workspaceId = req.dbUser.workspace?._id?.toString() || req.dbUser.workspace?.toString();

        // Write Mongo FIRST -> delete Redis cache SECOND
        await delCache(`tasks:project:${task.projectReference}`);
        await delCache(`dash:stats:${workspaceId}`);

        await logActivity(req.dbUser._id, req.dbUser.workspace, 'Deleted Task', 'Task', id, { taskName: task.taskName, projectId: task.projectReference.toString() });

        getIO().to(task.projectReference.toString()).emit('task-deleted', { taskId: id });

        logger.info(`Cascade Delete Executed: Task '${task.taskName}' and its comments deleted by User ID: ${req.dbUser._id}`);
        res.status(200).json({ message: "Task and associated comments deleted successfully." });

    } catch (error) {
        logger.error(`Error deleting task (ID: ${req.params.id}): ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: "Internal server error while deleting task." });
    }
};