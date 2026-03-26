import User from '../models/user.model.js';
import Role from '../models/role.model.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger.js';

export const signup = async (req, res) => {
    try {
        const { fullName, emailAddress, password } = req.body;

        const existingUser = await User.findOne({ emailAddress });
        if (existingUser) return res.status(400).json({ message: "User already exists" });

        const teamRole = await Role.findOne({ roleName: 'Team Member' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            fullName,
            emailAddress,
            password: hashedPassword,
            role: teamRole._id
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
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });
        // FIX: Fetch and send the FULL populated user so RBAC works instantly!
        const populatedUser = await User.findById(user._id).populate('role');
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
        sameSite: 'strict'
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