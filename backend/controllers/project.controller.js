import mongoose from 'mongoose';
import Project from '../models/project.model.js';
import Activity from '../models/activity.model.js';
import User from '../models/user.model.js';
import logger from '../utils/logger.js';
import Task from '../models/task.model.js';
import FileAsset from '../models/fileAsset.model.js';
import { logActivity } from '../utils/activityLogger.js';
import { getCache, setCache, delCache, delWorkspaceCacheKeys } from '../config/redis.js';
import { canAccessProject, canManageProject } from '../utils/projectAccess.js';
import { pick } from '../utils/pick.js';
import { withTransaction } from '../utils/transaction.js';
import { deleteTasksCascade, destroyStoredFiles } from '../services/cleanup.service.js';
import { demoLocked, isDemoUser } from '../utils/demo.js';

// Fields a PUT may change; only Admins may also reassign the Project Manager.
const PROJECT_FIELDS = [
    'projectName', 'projectDescription', 'budget', 'clientName', 'startDate', 'endDate',
    'priority', 'projectStatus', 'projectType', 'assignedTeamMembers',
];

// Task-key prefix from the project name: initials for several words ("Mobile app 3.0" -> MA3),
// the first letters for one word ("Website" -> WEB), made unique within the workspace.
const projectKeyFor = async (name, workspace) => {
    const words = name.toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
    const base = (words.length > 1 ? words.slice(0, 3).map((w) => w[0]).join('') : (words[0] || 'PRJ').slice(0, 3)) || 'PRJ';
    const taken = new Set((await Project.find({ workspace }).select('key').lean()).map((p) => p.key));
    if (!taken.has(base)) return base;
    for (let n = 2; n < 100; n++) if (!taken.has(`${base}${n}`)) return `${base}${n}`;
    return `${base}${Date.now() % 1000}`;
};

export const createProject = async (req, res) => {
    try {
        const {
            projectName, projectDescription, budget, clientName,
            startDate, endDate, priority, projectType, assignedTeamMembers
        } = req.body;

        if (!projectName) {
            return res.status(400).json({ message: "Project name is required." });
        }
        const existingProject = await Project.findOne({
            projectName,
            projectManager: req.dbUser._id
        });
        if (existingProject) {
            return res.status(400).json({ message: "A project with this name already exists." });
        }

        if (endDate && startDate && endDate < startDate) {
            return res.status(400).json({
                message: "End date must be after start date"
            });
        }

        if (assignedTeamMembers && Array.isArray(assignedTeamMembers) && assignedTeamMembers.length > 0) {
            const userWs = req.dbUser.workspace?._id || req.dbUser.workspace;
            const validUsers = await User.find({
                _id: { $in: assignedTeamMembers },
                workspace: userWs
            }).select('_id');
            if (validUsers.length !== assignedTeamMembers.length) {
                return res.status(400).json({ message: "One or more assigned team members do not belong to your workspace." });
            }
        }

        const newProject = new Project({
            key: await projectKeyFor(projectName, req.dbUser.workspace?._id || req.dbUser.workspace),
            projectName,
            projectDescription,
            budget,
            clientName,
            startDate,
            endDate,
            priority,
            projectType,
            assignedTeamMembers,
            workspace: req.dbUser.workspace,
            projectManager: req.dbUser._id,
            createdBy: req.dbUser._id
        });

        const savedProject = await newProject.save();
        const workspaceId = req.dbUser.workspace?._id?.toString() || req.dbUser.workspace?.toString();

        // Write Mongo FIRST -> delete Redis cache keys SECOND
        await delWorkspaceCacheKeys(workspaceId);

        await logActivity(req.dbUser._id, req.dbUser.workspace, 'Created Project', 'Project', savedProject._id, { projectName });

        logger.info(`Project created: '${projectName}' by User ID: ${req.dbUser._id}`);
        res.status(201).json({ message: "Project created successfully", project: savedProject });

    } catch (error) {
        logger.error(`Error creating project: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: "Internal server error while creating project." });
    }
};

export const getAllProjects = async (req, res) => {
    try {
        const isAdmin = req.dbUser.role.roleName === 'Admin';
        const bucket = isAdmin ? 'admin' : req.dbUser._id.toString();
        const workspaceId = req.dbUser.workspace?._id?.toString() || req.dbUser.workspace?.toString();
        const cacheKey = `projects:list:${workspaceId}:${bucket}`;

        const cached = await getCache(cacheKey);
        if (cached) {
            return res.status(200).json(cached);
        }

        let query = {};
        if (!isAdmin) {
            query = {
                $or: [
                    { projectManager: req.dbUser._id },
                    { assignedTeamMembers: req.dbUser._id }
                ]
            };
        }

        query.workspace = req.dbUser.workspace;
        const projects = await Project.find(query)
            .populate('projectManager', 'fullName emailAddress profilePicture')
            .populate('assignedTeamMembers', 'fullName emailAddress')
            .sort({ createdAt: -1 })
            .lean();

        // RBAC: Hide budget from regular team members/stakeholders
        const sanitizedProjects = projects.map(p => {
            if (!canManageProject(p, req.dbUser)) {
                delete p.budget;
            }
            return p;
        });

        await setCache(cacheKey, sanitizedProjects, 60, workspaceId);

        logger.info(`Projects fetched by User ID: ${req.dbUser._id} (Admin: ${isAdmin})`);
        res.status(200).json(sanitizedProjects);

    } catch (error) {
        logger.error(`Error fetching projects: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: "Internal server error while fetching projects." });
    }
};

export const updateProject = async (req, res) => {
    try {
        const { id } = req.params;

        const project = await Project.findOne({ _id: id, workspace: req.dbUser.workspace });
        if (!project) {
            return res.status(404).json({ message: "Project not found." });
        }

        if (!canManageProject(project, req.dbUser)) {
            logger.warn(`Security Alert: User ${req.dbUser.emailAddress} attempted to update Project ${id} without authorization.`);
            return res.status(403).json({ message: "Access Denied. Only the Project Manager or an Admin can update this project." });
        }

        // S-04: allow-list the body so protected fields (and `$set`-style operators) can't be mass-assigned
        const isAdmin = req.dbUser.role.roleName === 'Admin';
        const updateData = pick(req.body, isAdmin ? [...PROJECT_FIELDS, 'projectManager'] : PROJECT_FIELDS);

        if (updateData.projectManager) {
            const newManager = await User.exists({ _id: updateData.projectManager, workspace: req.dbUser.workspace?._id || req.dbUser.workspace });
            if (!newManager) {
                return res.status(400).json({ message: "The new Project Manager must belong to your workspace." });
            }
        }

        // Resolve emails to ObjectIds safely if frontend passes an array containing emails or user objects
        if (updateData.assignedTeamMembers && Array.isArray(updateData.assignedTeamMembers)) {
            const userWs = req.dbUser.workspace?._id || req.dbUser.workspace;
            const resolvedMembers = [];
            for (const member of updateData.assignedTeamMembers) {
                if (typeof member === 'string' && member.includes('@')) {
                    const userByEmail = await User.findOne({ emailAddress: member.toLowerCase(), workspace: userWs });
                    if (!userByEmail) {
                        return res.status(400).json({ message: `User with email ${member} not found in your workspace.` });
                    }
                    resolvedMembers.push(userByEmail._id);
                } else {
                    const memberId = typeof member === 'object' && member._id ? member._id : member;
                    const validUser = await User.findOne({ _id: memberId, workspace: userWs });
                    if (!validUser) {
                        return res.status(400).json({ message: `User ID ${memberId} does not belong to your workspace.` });
                    }
                    resolvedMembers.push(validUser._id);
                }
            }
            updateData.assignedTeamMembers = resolvedMembers;
        }

        const updatedProject = await Project.findByIdAndUpdate(
            id,
            updateData,
            { returnDocument: 'after', runValidators: true }
        ).populate('projectManager', 'fullName emailAddress profilePicture')
            .populate('assignedTeamMembers', 'fullName emailAddress profilePicture');

        const workspaceId = req.dbUser.workspace?._id?.toString() || req.dbUser.workspace?.toString();

        // Write Mongo FIRST -> delete Redis cache keys SECOND
        await delCache(`project:${workspaceId}:${id}`);
        await delWorkspaceCacheKeys(workspaceId);

        await logActivity(req.dbUser._id, req.dbUser.workspace, 'Updated Project', 'Project', updatedProject._id, { projectName: updatedProject.projectName });

        logger.info(`Project updated: '${updatedProject.projectName}' (ID: ${id}) by User ID: ${req.dbUser._id}`);
        res.status(200).json({ message: "Project updated successfully", project: updatedProject });

    } catch (error) {
        logger.error(`Error updating project (ID: ${req.params.id}): ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: "Internal server error while updating project." });
    }
};

export const deleteProject = async (req, res) => {
    try {
        const { id } = req.params;
        if (isDemoUser(req.dbUser)) return demoLocked(res, 'Deleting projects');

        const project = await Project.findOne({ _id: id, workspace: req.dbUser.workspace });
        if (!project) {
            return res.status(404).json({ message: "Project not found." });
        }

        if (!canManageProject(project, req.dbUser)) {
            logger.warn(`Security Alert: User ${req.dbUser.emailAddress} attempted to delete Project ${id} without authorization.`);
            return res.status(403).json({ message: "Access Denied. Only the Project Manager or an Admin can delete this project." });
        }

        // Project, tasks, comments and file records go together or not at all
        const { taskIds, files } = await withTransaction(async (session) => {
            const tasks = await Task.find({ projectReference: id, workspace: req.dbUser.workspace }).select('_id').session(session).lean();
            const taskIds = tasks.map(task => task._id);
            const taskFiles = await deleteTasksCascade(taskIds, session);

            const projectFiles = await FileAsset.find({ entityType: 'Project', entityId: id }).session(session).lean();
            await FileAsset.deleteMany({ entityType: 'Project', entityId: id }, { session });
            await Project.deleteOne({ _id: id, workspace: req.dbUser.workspace }, { session });

            return { taskIds, files: [...taskFiles, ...projectFiles] };
        });

        // Stored files can only be removed after the commit
        await destroyStoredFiles(files);

        const workspaceId = req.dbUser.workspace?._id?.toString() || req.dbUser.workspace?.toString();

        // Write Mongo FIRST -> delete Redis cache keys SECOND
        await delCache(`project:${workspaceId}:${id}`);
        await delCache(`tasks:project:${id}`);
        await delWorkspaceCacheKeys(workspaceId);

        await logActivity(req.dbUser._id, req.dbUser.workspace, 'Deleted Project', 'Project', id, { projectName: project.projectName });

        logger.info(`Cascade Delete Executed: Project '${project.projectName}' (ID: ${id}), ${taskIds.length} tasks, and related comments deleted by User ID: ${req.dbUser._id}`);
        res.status(200).json({ message: "Project, associated tasks, and comments deleted successfully." });

    } catch (error) {
        logger.error(`Error deleting project (ID: ${req.params.id}): ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: "Internal server error while deleting project." });
    }
};

export const getProjectById = async (req, res) => {
    try {
        const { id } = req.params;
        const workspaceId = req.dbUser.workspace?._id?.toString() || req.dbUser.workspace?.toString();

        // 1. MUST perform Workspace-scoped Project lookup FIRST to guarantee tenant boundary
        const project = await Project.findOne({ _id: id, workspace: req.dbUser.workspace })
            .populate('projectManager', 'fullName emailAddress profilePicture')
            .populate('assignedTeamMembers', 'fullName emailAddress profilePicture')
            .lean();

        if (!project) {
            return res.status(404).json({ message: "Project not found in your workspace." });
        }

        const isManager = canManageProject(project, req.dbUser);

        if (!canAccessProject(project, req.dbUser)) {
            return res.status(403).json({ message: "Access Denied. You do not have permission to view this project." });
        }

        // 2. Authorization passed: Check Redis cache
        const cacheKey = `project:${workspaceId}:${id}`;
        const cached = await getCache(cacheKey);
        if (cached) {
            const copy = JSON.parse(JSON.stringify(cached));
            if (!isManager) {
                delete copy.budget;
            }
            return res.status(200).json(copy);
        }

        await setCache(cacheKey, project, 90); // 90s TTL

        if (!isManager) {
            delete project.budget;
        }

        res.status(200).json(project);
    } catch (error) {
        logger.error(`Error fetching project (ID: ${req.params.id}): ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: "Internal server error while fetching project." });
    }
};

// Projects the caller can see: every project for Admins, otherwise the ones they manage or belong to.
export const accessibleProjectFilter = (user) => {
    const workspace = new mongoose.Types.ObjectId(String(user.workspace?._id || user.workspace));
    return user.role?.roleName === 'Admin'
        ? { workspace }
        : { workspace, $or: [{ projectManager: user._id }, { assignedTeamMembers: user._id }] };
};

const PULSE_DAYS = 14;
const dayKey = (date) => date.toISOString().slice(0, 10);

// GET /api/projects/pulse: audit-log events per project per day over the last 14 days (UTC days),
// the "pulse" shown next to each project.
export const getProjectPulse = async (req, res) => {
    try {
        const filter = accessibleProjectFilter(req.dbUser);
        const projectIds = (await Project.find(filter).select('_id').lean()).map((p) => p._id.toString());
        const today = new Date();
        const since = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (PULSE_DAYS - 1)));
        const days = Array.from({ length: PULSE_DAYS }, (_, i) => dayKey(new Date(since.getTime() + i * 86400000)));

        const rows = await Activity.aggregate([
            { $match: { workspace: filter.workspace, createdAt: { $gte: since } } },
            {
                $project: {
                    day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    projectId: {
                        $toString: {
                            $ifNull: ['$metadata.projectId', { $ifNull: ['$metadata.project', {
                                $cond: [{ $eq: ['$entityType', 'Project'] }, '$entityId', null],
                            }] }],
                        },
                    },
                },
            },
            { $match: { projectId: { $in: projectIds } } },
            { $group: { _id: { project: '$projectId', day: '$day' }, count: { $sum: 1 } } },
        ]);

        const pulse = Object.fromEntries(projectIds.map((id) => [id, days.map(() => 0)]));
        for (const { _id, count } of rows) {
            const index = days.indexOf(_id.day);
            if (index >= 0) pulse[_id.project][index] = count;
        }
        res.status(200).json({ days, pulse });
    } catch (error) {
        logger.error(`Error building project pulse: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: "Internal server error while loading activity." });
    }
};
