import User from '../models/user.model.js';
import Role from '../models/role.model.js';
import Workspace from '../models/workspace.model.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';

export const signup = async (req, res) => {
    try {
        const { fullName, emailAddress, password, isCreatingWorkspace, workspaceName, inviteCode } = req.body;

        const existingUser = await User.findOne({ emailAddress });
        if (existingUser) return res.status(400).json({ message: "User already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let workspaceId;
        let roleId;

        // Generate a new User ID ahead of time so the Workspace can reference it
        const newUserId = new mongoose.Types.ObjectId();

        if (isCreatingWorkspace) {
            if (!workspaceName) return res.status(400).json({ message: "Workspace name is required" });

            const adminRole = await Role.findOne({ roleName: 'Admin' });
            roleId = adminRole._id;

            // Generate workspace ID beforehand
            workspaceId = new mongoose.Types.ObjectId();

            // Create workspace directly with the pre-generated User ID as the owner
            await Workspace.create({
                _id: workspaceId,
                workspaceName,
                owner: newUserId
            });

        } else {
            if (!inviteCode) return res.status(400).json({ message: "Invite code is required to join" });

            const workspace = await Workspace.findOne({ inviteCode: inviteCode.toUpperCase() });
            if (!workspace) return res.status(404).json({ message: "Invalid invite code" });

            // ENFORCING PRINCIPLE OF LEAST PRIVILEGE
            // Everyone who joins via a generic invite code is assigned the absolutely lowest default role: Stakeholder (Read-only Viewer).
            const defaultRole = await Role.findOne({ roleName: 'Stakeholder' });
            roleId = defaultRole._id;
            workspaceId = workspace._id;
        }

        // Create the user with the pre-generated ID
        const newUser = await User.create({
            _id: newUserId,
            fullName,
            emailAddress,
            password: hashedPassword,
            role: roleId,
            workspace: workspaceId
        });

        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        logger.error(`Signup Error: ${error.message}`);
        res.status(500).json({ message: "Error creating user" });
    }
};

export const login = async (req, res) => {
    try {
        const { emailAddress, password } = req.body;

        const user = await User.findOne({ emailAddress }).select('+password');
        if (!user) return res.status(401).json({ message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });
        
        const populatedUser = await User.findById(user._id).populate('role').populate('workspace');
        res.status(200).json({ message: "Login successful", user: populatedUser });
    } catch (error) {
        logger.error(`Login Error Detail: ${error.message}`);
        res.status(500).json({ message: "Server error during login" });
    }
};

export const logout = (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });
    res.status(200).json({ message: "Logged out successfully" });
};

export const checkAuth = async (req, res) => {
    try {
        // req.dbUser is already populated by your protectRoute middleware!
        // We just return it to the frontend to update Zustand
        res.status(200).json({
            authenticated: true,
            user: req.dbUser
        });
    } catch (error) {
        res.status(500).json({ message: "Error checking auth status" });
    }
};

export const getWorkspaceUsers = async (req, res) => {
    try {
        // Only return users in the same workspace
        const users = await User.find({ workspace: req.dbUser.workspace._id })
                                .populate('role')
                                .select('-password');
        res.status(200).json(users);
    } catch (error) {
        logger.error(`Get Workspace Users Error: ${error.message}`);
        res.status(500).json({ message: "Failed to fetch workspace users" });
    }
};

export const updateUserRole = async (req, res) => {
    try {
        // Security check: Only Admin can change roles!
        if (req.dbUser.role.roleName !== 'Admin') {
            return res.status(403).json({ message: "Only Admins can change user roles" });
        }

        const { userId } = req.params;
        const { roleName } = req.body; // e.g. "Project Manager", "Team Member"

        // Prevent modifying the Admin's own role (you don't want to accidentally lock yourself out)
        if (userId === req.dbUser._id.toString()) {
            return res.status(400).json({ message: "Cannot modify your own Admin role" });
        }

        // Find the new role ID
        const requestedRole = await Role.findOne({ roleName });
        if (!requestedRole) {
            return res.status(404).json({ message: "Role not found" });
        }

        // Ensure the target user actually belongs to THIS admin's workspace
        const targetUser = await User.findOne({ _id: userId, workspace: req.dbUser.workspace._id });
        if (!targetUser) {
            return res.status(404).json({ message: "User not found in your workspace" });
        }

        targetUser.role = requestedRole._id;
        await targetUser.save();

        res.status(200).json({ message: "User role updated successfully" });
    } catch (error) {
        logger.error(`Update Role Error: ${error.message}`);
        res.status(500).json({ message: "Failed to update user role" });
    }
};