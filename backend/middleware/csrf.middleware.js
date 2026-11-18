import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
// These start a new session (an existing one may be stale); they are rate-limited and accept JSON only.
const EXEMPT_PATHS = new Set(['/api/auth/login', '/api/auth/signup', '/api/demo/start']);

/**
 * CSRF token for a session: an HMAC of the user id and tokenVersion. Only our frontend can read it
 * (it comes back in response bodies, which CORS hides from other origins), and it changes whenever
 * the user's sessions are revoked.
 */
export const csrfTokenFor = (userId, tokenVersion = 0) => crypto
    .createHmac('sha256', process.env.JWT_SECRET)
    .update(`csrf:${userId}:${tokenVersion}`)
    .digest('base64url');

const sameToken = (sent, expected) => {
    const a = Buffer.from(sent ?? '');
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/**
 * The auth cookie is SameSite=None in production, so browsers attach it to cross-site requests.
 * Every state-changing request made with a session must also carry the session's X-CSRF-Token.
 */
export const csrfProtection = (req, res, next) => {
    if (SAFE_METHODS.has(req.method) || EXEMPT_PATHS.has(req.path)) return next();

    const cookie = req.cookies?.token;
    if (!cookie) return next(); // no session: protectRoute answers 401

    let session;
    try {
        session = jwt.verify(cookie, process.env.JWT_SECRET);
    } catch {
        return next(); // invalid or expired: protectRoute answers 401, logout just clears it
    }

    if (!sameToken(req.get('X-CSRF-Token'), csrfTokenFor(session.userId, session.tokenVersion ?? 0))) {
        return res.status(403).json({ message: 'Your session is out of date. Refresh the page and try again.' });
    }
    next();
};

/** Defence in depth: state-changing bodies must be JSON or a multipart upload, never form or text bodies. */
export const requireJsonBody = (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    // An empty POST (e.g. logout) arrives with Content-Length: 0 and no type; that's fine.
    const hasBody = req.headers['transfer-encoding'] !== undefined || Number(req.headers['content-length'] ?? 0) > 0;
    if (hasBody && !req.is('application/json', 'multipart/form-data')) {
        return res.status(415).json({ message: 'Request body must be JSON.' });
    }
    next();
};
