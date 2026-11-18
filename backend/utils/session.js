import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { delCache } from '../config/redis.js';
import { disconnectUser } from '../socket/socket.js';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

const isProduction = () => process.env.NODE_ENV === 'production';

/** Options shared by setting and clearing the auth cookie (they must match for clearCookie to work). */
export const authCookieOptions = () => ({
    httpOnly: true,
    secure: isProduction(),
    sameSite: isProduction() ? 'none' : 'lax',
});

/** Signs a JWT bound to the user's current tokenVersion and sets it as the auth cookie. */
export const issueSession = (res, user) => {
    const token = jwt.sign(
        { userId: user._id, tokenVersion: user.tokenVersion ?? 0 },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );
    res.cookie('token', token, { ...authCookieOptions(), maxAge: SESSION_TTL_MS });
    return token;
};

/**
 * Revokes every token issued to the user so far: bumps tokenVersion (Mongo first), then drops the
 * cached session and any live sockets. Returns the new tokenVersion.
 */
export const revokeSessions = async (userId) => {
    const user = await User.findByIdAndUpdate(
        userId,
        { $inc: { tokenVersion: 1 } },
        { returnDocument: 'after' }
    ).select('+tokenVersion');
    await delCache(`session:user:${userId}`);
    disconnectUser(userId);
    return user?.tokenVersion ?? 0;
};
