import Project from '../models/project.model.js';
import User from '../models/user.model.js';
import logger from '../utils/logger.js';
import Task from '../models/task.model.js';
import Comment from '../models/comment.model.js';
import { logActivity } from '../utils/activityLogger.js';
import { getCache, setCache, delCache, delWorkspaceCacheKeys } from '../config/redis.js';
import { canAccessProject, canManageProject } from '../utils/projectAccess.js';
import { pick } from '../utils/pick.js';

// Fields a PUT may change; only Admins may also reassign the Project Manager.
const PROJECT_FIELDS = [
    'projectName', 'projectDescription', 'budget', 'clientName', 'startDate', 'endDate',
    'priority', 'projectStatus', 'projectType', 'assignedTeamMembers',
];

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

        const project = await Project.findOne({ _id: id, workspace: req.dbUser.workspace });
        if (!project) {
            return res.status(404).json({ message: "Project not found." });
        }

        if (!canManageProject(project, req.dbUser)) {
            logger.warn(`Security Alert: User ${req.dbUser.emailAddress} attempted to delete Project ${id} without authorization.`);
            return res.status(403).json({ message: "Access Denied. Only the Project Manager or an Admin can delete this project." });
        }

        await Project.findByIdAndDelete(id);

        const tasks = await Task.find({ projectReference: id, workspace: req.dbUser.workspace });
        const taskIds = tasks.map(task => task._id);

        await Task.deleteMany({ projectReference: id });

        if (taskIds.length > 0) {
            await Comment.deleteMany({ task: { $in: taskIds } });
        }

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