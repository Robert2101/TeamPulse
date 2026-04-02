import Project from '../models/project.model.js';
import User from '../models/user.model.js';
import logger from '../utils/logger.js';
import Task from '../models/task.model.js';
import Comment from '../models/comment.model.js';
import { logActivity } from '../utils/activityLogger.js'; 

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

        await logActivity(req.dbUser._id, 'Created Project', 'Project', savedProject._id, { projectName });

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
            .lean(); // Use lean to modify data

        // RBAC: Hide budget from regular team members/stakeholders
        const sanitizedProjects = projects.map(p => {
            if (!isAdmin && p.projectManager._id.toString() !== req.dbUser._id.toString()) {
                delete p.budget;
            }
            return p;
        });

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
        const updateData = req.body;

        const project = await Project.findOne({ _id: id, workspace: req.dbUser.workspace });
        if (!project) {
            return res.status(404).json({ message: "Project not found." });
        }

        const isAdmin = req.dbUser.role.roleName === 'Admin';
        const isManager = project.projectManager.toString() === req.dbUser._id.toString();

        if (!isAdmin && !isManager) {
            logger.warn(`Security Alert: User ${req.dbUser.emailAddress} attempted to update Project ${id} without authorization.`);
            return res.status(403).json({ message: "Access Denied. Only the Project Manager or an Admin can update this project." });
        }

        // Resolve emails to ObjectIds safely if frontend passes an array containing emails or user objects
        if (updateData.assignedTeamMembers && Array.isArray(updateData.assignedTeamMembers)) {
            const resolvedMembers = [];
            for (const member of updateData.assignedTeamMembers) {
                if (typeof member === 'string' && member.includes('@')) {
                    const userByEmail = await User.findOne({ emailAddress: member.toLowerCase() });
                    if (!userByEmail) {
                        return res.status(400).json({ message: `User with email ${member} not found. Ensure they are registered.` });
                    }
                    resolvedMembers.push(userByEmail._id);
                } else if (typeof member === 'object' && member._id) {
                    resolvedMembers.push(member._id);
                } else {
                    resolvedMembers.push(member);
                }
            }
            updateData.assignedTeamMembers = resolvedMembers;
        }

        const updatedProject = await Project.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('projectManager', 'fullName emailAddress profilePicture')
            .populate('assignedTeamMembers', 'fullName emailAddress profilePicture');

        await logActivity(req.dbUser._id, 'Updated Project', 'Project', updatedProject._id, { projectName: updatedProject.projectName });

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

        const isAdmin = req.dbUser.role.roleName === 'Admin';
        const isManager = project.projectManager.toString() === req.dbUser._id.toString();

        if (!isAdmin && !isManager) {
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

        await logActivity(req.dbUser._id, 'Deleted Project', 'Project', id, { projectName: project.projectName });

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

        const project = await Project.findOne({ _id: id, workspace: req.dbUser.workspace })
            .populate('projectManager', 'fullName emailAddress profilePicture')
            .populate('assignedTeamMembers', 'fullName emailAddress profilePicture')
            .lean(); // Use lean

        if (!project) {
            return res.status(404).json({ message: "Project not found." });
        }

        const isAdmin = req.dbUser.role.roleName === 'Admin';
        // Handle case where projectManager might be null/undefined or populated
        const pmId = project.projectManager ? project.projectManager._id.toString() : null;
        const isManager = pmId === req.dbUser._id.toString();
        const isMember = project.assignedTeamMembers.some(member =>
            member._id.toString() === req.dbUser._id.toString()
        );

        if (!isAdmin && !isManager && !isMember) {
            return res.status(403).json({ message: "Access Denied. You do not have permission to view this project." });
        }

        // RBAC: Hide budget from regular team members/stakeholders
        if (!isAdmin && !isManager) {
            delete project.budget;
        }

        res.status(200).json(project);
    } catch (error) {
        logger.error(`Error fetching project (ID: ${req.params.id}): ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: "Internal server error while fetching project." });
    }
};