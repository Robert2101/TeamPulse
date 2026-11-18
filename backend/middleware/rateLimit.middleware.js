import { checkRateLimit } from '../config/redis.js';

/**
 * Sliding-window rate limit backed by Upstash (fails open when Redis is unavailable).
 * - keyBy 'ip': uses req.ip, which is only the real client address because app.js sets `trust proxy`.
 * - keyBy 'user': one bucket per account; must run after protectRoute.
 */
export const rateLimit = ({ name, limit, window, keyBy = 'ip', message }) => async (req, res, next) => {
    const id = keyBy === 'user' ? req.dbUser?._id?.toString() : req.ip;
    const result = await checkRateLimit(`${name}:${id || 'anonymous'}`, limit, window);
    if (!result.success) {
        return res.status(429).json({ message });
    }
    next();
};
