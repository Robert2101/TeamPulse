import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { delCache } from '../config/redis.js';
import { disconnectUser } from '../socket/socket.js';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

const isProduction = () => process.env.NODE_ENV === 'production';

/**
 * Options shared by setting and clearing the auth cookie (they must match for clearCookie to work).
 * Production defaults to SameSite=None for a frontend on another site. When the app and API share a
 * site (e.g. behind one proxy, as in docker compose) set COOKIE_SAME_SITE=lax; COOKIE_SECURE=false
 * only for plain-http local stacks.
 */
export const authCookieOptions = () => {
    const sameSite = process.env.COOKIE_SAME_SITE || (isProduction() ? 'none' : 'lax');
    return {
        httpOnly: true,
        secure: sameSite === 'none' || (isProduction() && process.env.COOKIE_SECURE !== 'false'),
        sameSite,
    };
};

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

// What the client may see about the signed-in user: never tokenVersion, and the workspace
// invite code only for Admins (they're the ones who share it).
export const toClientUser = (user) => {
    const plain = typeof user?.toObject === 'function' ? user.toObject() : { ...user };
    delete plain.tokenVersion;
    delete plain.password;
    if (plain.role?.roleName !== 'Admin' && plain.workspace?.inviteCode) {
        plain.workspace = { ...plain.workspace };
        delete plain.workspace.inviteCode;
    }
    return plain;
};
