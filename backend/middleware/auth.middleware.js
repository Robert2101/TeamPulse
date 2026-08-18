import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import logger from '../utils/logger.js';
import { getCache, setCache } from '../config/redis.js';

export const protectRoute = async (req, res, next) => {
    try {
        const token = req.cookies.token; 

        if (!token) {
            return res.status(401).json({ message: "Unauthorized. Please log in." });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const cacheKey = `session:user:${decoded.userId}`;

        let user = await getCache(cacheKey);

        if (!user) {
            user = await User.findById(decoded.userId)
                .select('-password')
                .populate('role')
                .populate('workspace')
                .lean();

            if (!user) {
                return res.status(401).json({ message: "User no longer exists." });
            }

            await setCache(cacheKey, user, 900); // 15 min TTL (900s)
        }

        if (user.status === 'Inactive') {
            return res.status(403).json({ message: "Your account has been deactivated. Please contact your administrator." });
        }

        req.dbUser = user;
        next();
    } catch (error) {
        logger.error(`Auth Middleware Error: ${error.message}`);
        return res.status(401).json({ message: "Invalid or expired token." });
    }
};

export const requirePermission = (requiredPermission) => {
    return (req, res, next) => {
        // req.dbUser is populated by protectRoute above
        if (!req.dbUser || !req.dbUser.role) {
            return res.status(403).json({ message: "Access Denied. Role not found." });
        }
        if (req.dbUser.role[requiredPermission] !== true) {
            logger.warn(`Permission Denied: User ${req.dbUser.emailAddress} tried to access ${requiredPermission}`);
            return res.status(403).json({
                message: `Access Denied. Missing required permission: ${requiredPermission}`
            });
        }

        next();
    };
};