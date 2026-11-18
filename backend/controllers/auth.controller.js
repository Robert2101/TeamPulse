import User from '../models/user.model.js';
import Role from '../models/role.model.js';
import Workspace, { generateInviteCode } from '../models/workspace.model.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';
import { delCache } from '../config/redis.js';
import { authCookieOptions, issueSession, revokeSessions } from '../utils/session.js';
import { csrfTokenFor } from '../middleware/csrf.middleware.js';
import { withTransaction } from '../utils/transaction.js';

// What the client may see about the signed-in user: never tokenVersion, and the workspace
// invite code only for Admins (they're the ones who share it).
const toClientUser = (user) => {
    const plain = typeof user?.toObject === 'function' ? user.toObject() : { ...user };
    delete plain.tokenVersion;
    delete plain.password;
    if (plain.role?.roleName !== 'Admin' && plain.workspace?.inviteCode) {
        plain.workspace = { ...plain.workspace };
        delete plain.workspace.inviteCode;
    }
    return plain;
};

export const signup = async (req, res) => {
    try {
        const { fullName, emailAddress, password, isCreatingWorkspace, workspaceName, inviteCode } = req.body;

        if (!fullName?.trim() || !emailAddress?.trim() || !password) {
            return res.status(400).json({ message: "Name, email and password are required" });
        }

        const existingUser = await User.findOne({ emailAddress });
        if (existingUser) return res.status(400).json({ message: "User already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let workspaceId;
        let roleId;
        let newWorkspace = null;

        // Generate a new User ID ahead of time so the Workspace can reference it
        const newUserId = new mongoose.Types.ObjectId();

        if (isCreatingWorkspace) {
            if (!workspaceName?.trim()) return res.status(400).json({ message: "Workspace name is required" });

            const adminRole = await Role.findOne({ roleName: 'Admin' });
            roleId = adminRole._id;

            // Generate workspace ID beforehand; the workspace is created together with its owner below
            workspaceId = new mongoose.Types.ObjectId();
            newWorkspace = { _id: workspaceId, workspaceName, owner: newUserId };

        } else {
            if (!inviteCode) return res.status(400).json({ message: "Invite code is required to join" });

            const workspace = await Workspace.findOne({ inviteCode: String(inviteCode).trim().toUpperCase() });
            if (!workspace) return res.status(404).json({ message: "Invalid invite code" });

            // ENFORCING PRINCIPLE OF LEAST PRIVILEGE
            // Everyone who joins via a generic invite code is assigned the absolutely lowest default role: Stakeholder (Read-only Viewer).
            const defaultRole = await Role.findOne({ roleName: 'Stakeholder' });
            roleId = defaultRole._id;
            workspaceId = workspace._id;
        }

        // Workspace and owner commit together: a failed user insert (e.g. a duplicate-email race)
        // can no longer leave an orphan workspace behind.
        await withTransaction(async (session) => {
            if (newWorkspace) {
                await Workspace.create([newWorkspace], { session });
            }
            await User.create([{
                _id: newUserId,
                fullName,
                emailAddress,
                password: hashedPassword,
                role: roleId,
                workspace: workspaceId
            }], { session });
        });

        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        if (error.code === 11000 && error.keyPattern?.emailAddress) {
            return res.status(400).json({ message: "User already exists" });
        }
        logger.error(`Signup Error: ${error.message}`);
        res.status(500).json({ message: "Error creating user" });
    }
};

export const login = async (req, res) => {
    try {
        const { emailAddress, password } = req.body;

        const user = await User.findOne({ emailAddress }).select('+password +tokenVersion');
        if (!user) return res.status(401).json({ message: "Invalid credentials" });

        if (user.status === 'Inactive') {
            return res.status(403).json({ message: "Your account has been deactivated. Please contact your administrator." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

        await User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });

        issueSession(res, user);

        const populatedUser = await User.findById(user._id).select('-password').populate('role').populate('workspace');
        res.status(200).json({ message: "Login successful", user: toClientUser(populatedUser), csrfToken: csrfTokenFor(user._id, user.tokenVersion) });
    } catch (error) {
        logger.error(`Login Error Detail: ${error.message}`);
        res.status(500).json({ message: "Server error during login" });
    }
};

// Not behind protectRoute, so an expired session can still log out. Revoking bumps tokenVersion,
// which ends every session of the account: a copied cookie stops working too.
export const logout = async (req, res) => {
    const token = req.cookies?.token;
    if (token) {
        try {
            // verify, not decode: a forged cookie must not be able to log someone else out
            const { userId } = jwt.verify(token, process.env.JWT_SECRET);
            await revokeSessions(userId);
        } catch (error) {
            logger.info(`Logout without a valid session: ${error.message}`);
        }
    }
    res.clearCookie('token', authCookieOptions());
    res.status(200).json({ message: "Logged out successfully" });
};

export const checkAuth = async (req, res) => {
    try {
        // req.dbUser is already populated by protectRoute
        res.status(200).json({
            authenticated: true,
            user: toClientUser(req.dbUser),
            csrfToken: csrfTokenFor(req.dbUser._id, req.dbUser.tokenVersion)
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

        // New permissions start from a fresh sign-in (also clears the cached session)
        await revokeSessions(userId);

        res.status(200).json({ message: "User role updated successfully" });
    } catch (error) {
        logger.error(`Update Role Error: ${error.message}`);
        res.status(500).json({ message: "Failed to update user role" });
    }
};

export const updateUserStatus = async (req, res) => {
    try {
        if (req.dbUser.role.roleName !== 'Admin') {
            return res.status(403).json({ message: "Only Admins can change user status" });
        }

        const { userId } = req.params;
        const { status } = req.body; // "Active" or "Inactive"

        if (userId === req.dbUser._id.toString()) {
            return res.status(400).json({ message: "Cannot deactivate your own Admin account" });
        }

        if (!['Active', 'Inactive'].includes(status)) {
            return res.status(400).json({ message: "Invalid status value. Must be 'Active' or 'Inactive'" });
        }

        const targetUser = await User.findOne({ _id: userId, workspace: req.dbUser.workspace._id });
        if (!targetUser) {
            return res.status(404).json({ message: "User not found in your workspace" });
        }

        targetUser.status = status;
        await targetUser.save();

        if (status === 'Inactive') {
            // Kill existing tokens and live sockets, so reactivation doesn't revive old sessions
            await revokeSessions(userId);
        } else {
            await delCache(`session:user:${userId}`);
        }

        res.status(200).json({ message: `User status updated to ${status}` });
    } catch (error) {
        logger.error(`Update Status Error: ${error.message}`);
        res.status(500).json({ message: "Failed to update user status" });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { fullName, emailAddress, phoneNumber, password } = req.body;
        const user = await User.findById(req.dbUser._id);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (fullName) user.fullName = fullName;
        if (emailAddress) user.emailAddress = emailAddress;
        if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;

        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();

        // Invalidate session cache for the user
        await delCache(`session:user:${user._id}`);

        let tokenVersion = req.dbUser.tokenVersion;
        if (password) {
            // A new password ends every other session; this one continues with a fresh cookie
            tokenVersion = await revokeSessions(user._id);
            issueSession(res, { _id: user._id, tokenVersion });
        }

        const populatedUser = await User.findById(user._id).select('-password').populate('role').populate('workspace');
        res.status(200).json({ message: "Profile updated successfully", user: toClientUser(populatedUser), csrfToken: csrfTokenFor(user._id, tokenVersion) });
    } catch (error) {
        logger.error(`Update Profile Error: ${error.message}`);
        res.status(500).json({ message: "Failed to update profile" });
    }
};

// Admins can rotate the invite code, e.g. after it leaked; the old code stops working immediately.
export const regenerateInviteCode = async (req, res) => {
    try {
        if (req.dbUser.role.roleName !== 'Admin') {
            return res.status(403).json({ message: "Only Admins can change the invite code" });
        }

        const workspaceId = req.dbUser.workspace?._id || req.dbUser.workspace;
        let workspace = null;
        for (let attempt = 0; attempt < 5 && !workspace; attempt++) {
            try {
                workspace = await Workspace.findByIdAndUpdate(
                    workspaceId,
                    { inviteCode: generateInviteCode() },
                    { returnDocument: 'after' }
                );
            } catch (error) {
                if (error.code !== 11000) throw error; // code already taken: try another one
            }
        }
        if (!workspace) {
            return res.status(503).json({ message: "Couldn't generate a new code. Please try again." });
        }

        // Cached sessions of the workspace's Admins still hold the old code
        const adminRole = await Role.findOne({ roleName: 'Admin' }).select('_id').lean();
        const admins = await User.find({ workspace: workspaceId, role: adminRole?._id }).select('_id').lean();
        await Promise.all(admins.map((admin) => delCache(`session:user:${admin._id}`)));

        logger.info(`Invite code regenerated for workspace ${workspaceId} by User ID: ${req.dbUser._id}`);
        res.status(200).json({ message: "Invite code regenerated", inviteCode: workspace.inviteCode });
    } catch (error) {
        logger.error(`Regenerate Invite Code Error: ${error.message}`);
        res.status(500).json({ message: "Failed to regenerate the invite code" });
    }
};
