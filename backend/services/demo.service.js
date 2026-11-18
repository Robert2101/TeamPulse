import crypto from 'node:crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Workspace, { generateInviteCode } from '../models/workspace.model.js';
import User from '../models/user.model.js';
import Project from '../models/project.model.js';
import Task from '../models/task.model.js';
import Comment from '../models/comment.model.js';
import FileAsset from '../models/fileAsset.model.js';
import Activity from '../models/activity.model.js';
import ChatbotInteraction from '../models/chatbotInteraction.model.js';
import { ensureRoles } from '../utils/roles.js';
import { withTransaction } from '../utils/transaction.js';
import { delCache, delWorkspaceCacheKeys } from '../config/redis.js';
import { destroyStoredFiles } from './cleanup.service.js';
import logger from '../utils/logger.js';
import { DEMO_FILE_PREFIX, isDemoAsset } from '../utils/demoAssets.js';
import { COMPANY, PERSONAS, PEOPLE, FILES, PROJECTS, CHATS } from '../demo/template.js';

export const SANDBOX_TTL_HOURS = 24;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const STATUS_PATH = ['In-Progress', 'Review', 'Done'];
const oid = () => new mongoose.Types.ObjectId();

/**
 * Builds the Fernway workspace from the template, in memory, with every date relative to `now`.
 * sandbox: a per-visitor demo (expires, unique emails); otherwise a persistent workspace (local seed)
 * with emails from `emailFor(personKey)`.
 */
export const buildWorkspace = async ({ now = new Date(), sandbox = true, passwordHash, emailFor, assetOrigin }) => {
    const roles = await ensureRoles();
    const at = (hoursAgo) => new Date(now.getTime() - hoursAgo * HOUR);
    const inDays = (days) => new Date(now.getTime() + days * DAY);
    const workspaceId = oid();
    const tag = workspaceId.toString().slice(-6);
    const origin = (assetOrigin || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');

    const users = Object.entries(PEOPLE).map(([key, person]) => ({
        _id: oid(),
        key,
        fullName: person.fullName,
        jobTitle: person.jobTitle,
        emailAddress: emailFor ? emailFor(key) : `${key}+${tag}@${COMPANY.domain}`,
        password: passwordHash,
        role: roles[person.role]._id,
        workspace: workspaceId,
        status: 'Active',
        demoPersona: Object.entries(PERSONAS).find(([, k]) => k === key)?.[0],
        joiningDate: at(24 * 120),
        lastLogin: at(2 + Object.keys(PEOPLE).indexOf(key) * 3),
    }));
    const userId = Object.fromEntries(users.map((u) => [u.key, u._id]));

    const workspace = {
        _id: workspaceId,
        workspaceName: COMPANY.name,
        owner: userId.maya,
        inviteCode: generateInviteCode(),
        isDemo: sandbox,
        ...(sandbox && { expiresAt: new Date(now.getTime() + SANDBOX_TTL_HOURS * HOUR) }),
        createdAt: at(3000),
    };

    const projects = [];
    const tasks = [];
    const comments = [];
    const files = [];
    const activities = [];
    const lastTouched = new Map(); // task id -> hours ago of its latest event, used as updatedAt
    const log = (who, action, entityType, entityId, hoursAgo, metadata = {}) => {
        activities.push({ user: userId[who], workspace: workspaceId, action, entityType, entityId, metadata, createdAt: at(hoursAgo) });
        const taskId = metadata.taskId?.toString() ?? (entityType === 'Task' ? entityId.toString() : null);
        if (taskId) lastTouched.set(taskId, Math.min(lastTouched.get(taskId) ?? Infinity, hoursAgo));
    };
    const fileDoc = (key, who, hoursAgo, entityType, entityId) => {
        const file = FILES[key];
        const doc = {
            _id: oid(), url: `${origin}${file.path}`, name: file.name, fileType: file.fileType, size: file.size,
            cloudinaryId: `${DEMO_FILE_PREFIX}${file.name}`, cloudinaryResourceType: 'raw',
            workspace: workspaceId, uploadedBy: userId[who], entityType, entityId, createdAt: at(hoursAgo),
        };
        files.push(doc);
        return doc;
    };

    log('maya', 'Created Workspace', 'User', userId.maya, 3000);

    for (const p of PROJECTS) {
        const projectId = oid();
        const projectRef = projectId.toString();
        projects.push({
            _id: projectId, key: p.key, projectName: p.projectName, projectDescription: p.projectDescription,
            projectStatus: p.projectStatus, priority: p.priority, projectType: p.projectType, clientName: p.clientName,
            budget: p.budget, startDate: inDays(p.start), endDate: inDays(p.end), workspace: workspaceId,
            projectManager: userId[p.manager], createdBy: userId.maya, assignedTeamMembers: p.members.map((m) => userId[m]),
            taskCounter: p.tasks.length, createdAt: at(p.h),
        });
        log('maya', 'Created Project', 'Project', projectId, p.h, { projectName: p.projectName });

        p.tasks.forEach((t, index) => {
            const taskId = oid();
            const meta = { taskName: t.title, projectId: projectRef };
            const actor = t.assignee || p.manager;
            const task = {
                _id: taskId, number: index + 1, taskName: t.title, taskDescription: t.description,
                projectReference: projectId, workspace: workspaceId, assignee: t.assignee ? userId[t.assignee] : null,
                dueDate: inDays(t.due), priority: t.priority, taskStatus: t.status, createdBy: userId[p.manager],
                updatedBy: userId[actor], comments: [], attachments: [], createdAt: at(t.h),
                ...(t.status === 'Done' && { completedAt: at(t.doneH ?? 24) }),
            };
            tasks.push(task);
            log(p.manager, 'Created Task', 'Task', taskId, t.h, meta);

            // Walk the task to its current column, like a team would have.
            const steps = STATUS_PATH.slice(0, STATUS_PATH.indexOf(t.status) + 1);
            const end = t.doneH ?? Math.max(4, t.h * 0.15);
            steps.forEach((status, i) => {
                const hoursAgo = t.h - ((t.h - end) * (i + 1)) / steps.length;
                log(actor, `Updated Task to ${status}`, 'Task', taskId, hoursAgo, { ...meta, previousStatus: i === 0 ? 'To-Do' : steps[i - 1], newStatus: status });
            });
            (t.edits || []).forEach((e) => log(e.by, 'Edited Task', 'Task', taskId, e.h, { ...meta, fields: e.fields }));

            (t.files || []).forEach((f) => {
                const doc = fileDoc(f.file, f.by, f.h, 'Task', taskId);
                task.attachments.push(doc._id);
                log(f.by, 'Uploaded File', 'Task', taskId, f.h, { ...meta, fileName: doc.name, fileId: doc._id });
            });

            (t.thread || []).forEach(([who, text, hoursAgo, opts = {}]) => {
                const commentId = oid();
                const comment = {
                    _id: commentId, commentContent: text, author: userId[who], task: taskId, workspace: workspaceId,
                    attachments: [], pinned: Boolean(opts.pinned), edited: Boolean(opts.edited),
                    ...(opts.edited && { editTimestamp: at(Math.max(hoursAgo - 2, 0.5)) }),
                    createdAt: at(hoursAgo),
                };
                (opts.files || []).forEach((key) => {
                    const doc = fileDoc(key, who, hoursAgo, 'Comment', commentId);
                    comment.attachments.push(doc._id);
                    log(who, 'Uploaded File', 'Comment', commentId, hoursAgo, { ...meta, fileName: doc.name, fileId: doc._id });
                });
                comments.push(comment);
                task.comments.push(commentId);
                log(who, 'Added Comment', 'Comment', commentId, hoursAgo, { ...meta, taskId });
            });
        });
    }

    for (const task of tasks) task.updatedAt = at(lastTouched.get(task._id.toString()) ?? 0);

    const chats = Object.entries(CHATS).flatMap(([who, exchanges]) => exchanges.map((c) => ({
        user: userId[who], query: c.query, responseGenerated: c.reply, classifiedIntent: c.intent, createdAt: at(c.h),
    })));

    const personaIds = Object.fromEntries(Object.entries(PERSONAS).map(([persona, key]) => [persona, userId[key]]));
    return { workspace, users: users.map(({ key, ...u }) => u), projects, tasks, comments, files, activities, chats, personaIds };
};

/** Inserts a built workspace in one transaction, so a failure leaves nothing half-made. */
export const insertWorkspace = (data) => withTransaction(async (session) => {
    await Workspace.create([data.workspace], { session });
    await User.insertMany(data.users, { session });
    await Project.insertMany(data.projects, { session });
    await Task.insertMany(data.tasks, { session });
    await Comment.insertMany(data.comments, { session });
    await FileAsset.insertMany(data.files, { session });
    await Activity.insertMany(data.activities, { session });
    await ChatbotInteraction.insertMany(data.chats, { session });
});

/** A private copy of the demo company for one visitor. Returns the id of the persona to sign in as. */
export const createSandbox = async ({ persona = 'admin', now = new Date() } = {}) => {
    if (!PERSONAS[persona]) throw Object.assign(new Error('Unknown demo persona'), { status: 400 });
    // Nobody signs in to a sandbox with a password; sessions are issued directly.
    const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString('base64url'), 10);
    const data = await buildWorkspace({ now, sandbox: true, passwordHash });
    await insertWorkspace(data);
    return { workspaceId: data.workspace._id, userId: data.personaIds[persona] };
};

/** Deletes a sandbox and everything in it, including files visitors uploaded to Cloudinary. */
export const purgeSandbox = async (workspaceId) => {
    const userIds = (await User.find({ workspace: workspaceId }).select('_id').lean()).map((u) => u._id);
    const uploads = (await FileAsset.find({ workspace: workspaceId }).lean()).filter((f) => !isDemoAsset(f));
    await withTransaction(async (session) => {
        await Activity.deleteMany({ workspace: workspaceId }, { session });
        await Comment.deleteMany({ workspace: workspaceId }, { session });
        await Task.deleteMany({ workspace: workspaceId }, { session });
        await FileAsset.deleteMany({ workspace: workspaceId }, { session });
        await Project.deleteMany({ workspace: workspaceId }, { session });
        await ChatbotInteraction.deleteMany({ user: { $in: userIds } }, { session });
        await User.deleteMany({ workspace: workspaceId }, { session });
        await Workspace.deleteOne({ _id: workspaceId, isDemo: true }, { session });
    });
    await destroyStoredFiles(uploads);
    await Promise.all(userIds.map((id) => delCache(`session:user:${id}`)));
    await delWorkspaceCacheKeys(workspaceId.toString());
};

/** Purges sandboxes past their expiry. Safe to run often; runs on startup, on a timer and on demo starts. */
export const purgeExpiredSandboxes = async ({ now = new Date(), limit = 25 } = {}) => {
    const expired = await Workspace.find({ isDemo: true, expiresAt: { $lt: now } }).select('_id').limit(limit).lean();
    for (const { _id } of expired) {
        try {
            await purgeSandbox(_id);
        } catch (error) {
            logger.warn(`Failed to purge demo sandbox ${_id}: ${error.message}`);
        }
    }
    if (expired.length) logger.info(`Purged ${expired.length} expired demo sandbox(es)`);
    return expired.length;
};

export { PERSONAS };
