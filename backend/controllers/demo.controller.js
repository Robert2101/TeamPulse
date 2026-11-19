import User from '../models/user.model.js';
import logger from '../utils/logger.js';
import { issueSession, toClientUser } from '../utils/session.js';
import { csrfTokenFor } from '../middleware/csrf.middleware.js';
import { createSandbox, purgeExpiredSandboxes, PERSONAS } from '../services/demo.service.js';

const sessionPayload = async (res, userId) => {
    const user = await User.findById(userId).select('-password +tokenVersion').populate('role').populate('workspace');
    issueSession(res, user);
    return { user: toClientUser(user), csrfToken: csrfTokenFor(user._id, user.tokenVersion) };
};

// POST /api/demo/start { persona } — builds a private sandbox and signs the visitor in as that persona.
export const startDemo = async (req, res) => {
    const persona = req.body?.persona || 'admin';
    if (!PERSONAS[persona]) {
        return res.status(400).json({ message: "Unknown demo role." });
    }
    try {
        const { userId, workspaceId } = await createSandbox({ persona });
        purgeExpiredSandboxes().catch((error) => logger.warn(`Sandbox purge failed: ${error.message}`));
        logger.info(`Demo sandbox ${workspaceId} created (${persona})`);
        res.status(201).json(await sessionPayload(res, userId));
    } catch (error) {
        logger.error(`Demo start error: ${error.message}`);
        res.status(500).json({ message: "Couldn't create a demo workspace. Please try again." });
    }
};

// POST /api/demo/switch { persona } — signs in as another persona of the caller's own sandbox.
export const switchDemoPersona = async (req, res) => {
    try {
        const workspace = req.dbUser.workspace;
        if (!workspace?.isDemo) {
            return res.status(403).json({ message: "Switching roles is only available in demo workspaces." });
        }
        const persona = req.body?.persona;
        const target = PERSONAS[persona] && await User.findOne({ workspace: workspace._id, demoPersona: persona }).select('_id');
        if (!target) {
            return res.status(404).json({ message: "That role isn't part of this demo." });
        }
        res.status(200).json(await sessionPayload(res, target._id));
    } catch (error) {
        logger.error(`Demo switch error: ${error.message}`);
        res.status(500).json({ message: "Couldn't switch roles. Please try again." });
    }
};
