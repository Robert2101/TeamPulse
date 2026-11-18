import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';

vi.mock('../config/cloudinary.js', () => import('./mocks/cloudinary.js'));

const { app, asSession } = await import('./helpers.js');
const { default: cloudinary } = await import('../config/cloudinary.js');
const { purgeExpiredSandboxes, SANDBOX_TTL_HOURS } = await import('../services/demo.service.js');
const { default: Workspace } = await import('../models/workspace.model.js');
const { default: User } = await import('../models/user.model.js');
const { default: Task } = await import('../models/task.model.js');
const { default: Project } = await import('../models/project.model.js');
const { default: Activity } = await import('../models/activity.model.js');
const { default: FileAsset } = await import('../models/fileAsset.model.js');

const cookieFrom = (res) => res.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');
const startDemo = async (persona = 'admin') => {
    const res = await request(app).post('/api/demo/start').send({ persona });
    expect(res.status).toBe(201);
    return asSession({ cookie: cookieFrom(res), csrfToken: res.body.csrfToken, user: res.body.user });
};

describe('demo sandboxes', () => {
    beforeEach(async () => {
        await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
        cloudinary.uploader.destroy.mockClear();
    });

    it('builds a private, populated workspace and signs the visitor in as the chosen role', async () => {
        const lucas = await startDemo('member');
        expect(lucas.user).toMatchObject({ fullName: 'Lucas Moreau', role: { roleName: 'Team Member' }, workspace: { workspaceName: 'Fernway', isDemo: true } });

        const me = await lucas.get('/api/auth/check-auth');
        expect(me.status).toBe(200);
        const mine = await lucas.get('/api/tasks/mine');
        expect(mine.body.map((t) => `${t.projectReference.key}-${t.number}`)).toEqual(expect.arrayContaining(['APP-1', 'APP-2']));
        expect(mine.body.some((t) => new Date(t.dueDate) < new Date() && t.taskStatus !== 'Done')).toBe(true); // something overdue to show

        const ws = await Workspace.findById(lucas.user.workspace._id);
        expect(ws.expiresAt.getTime() - Date.now()).toBeGreaterThan((SANDBOX_TTL_HOURS - 1) * 3600 * 1000);
        expect(await Activity.countDocuments({ workspace: ws._id })).toBeGreaterThan(40);
    });

    it('keeps every visitor in their own sandbox', async () => {
        const first = await startDemo('admin');
        const second = await startDemo('admin');
        expect(first.user.workspace._id).not.toBe(second.user.workspace._id);

        const theirProjects = await second.get('/api/projects');
        const projectId = theirProjects.body[0]._id;
        expect((await first.get(`/api/projects/${projectId}`)).status).toBe(404);
        expect((await first.get(`/api/tasks/project/${projectId}`)).status).toBe(404);
    });

    it('switches between the personas of the same sandbox only', async () => {
        const maya = await startDemo('admin');
        const res = await maya.post('/api/demo/switch').send({ persona: 'stakeholder' });
        expect(res.status).toBe(200);
        const grace = asSession({ cookie: cookieFrom(res), csrfToken: res.body.csrfToken });
        const me = await grace.get('/api/auth/check-auth');
        expect(me.body.user).toMatchObject({ fullName: 'Grace Liu', role: { roleName: 'Stakeholder' } });
        expect(me.body.user.workspace._id).toBe(maya.user.workspace._id);

        // Stakeholders follow the Partner API project only, and can't create projects.
        const projects = await grace.get('/api/projects');
        expect(projects.body.map((p) => p.projectName)).toEqual(['Partner API']);
        expect((await grace.post('/api/projects').send({ projectName: 'Nope' })).status).toBe(403);

        expect((await maya.post('/api/demo/switch').send({ persona: 'ceo' })).status).toBe(404);
    });

    it('refuses persona switching and invite codes outside their purpose', async () => {
        const maya = await startDemo('admin');
        const inviteCode = (await maya.get('/api/auth/check-auth')).body.user.workspace.inviteCode;
        const join = await request(app).post('/api/auth/signup').send({ fullName: 'Visitor', emailAddress: 'v@example.com', password: 'password123', inviteCode });
        expect(join.status).toBe(400);
        expect(await User.exists({ emailAddress: 'v@example.com' })).toBeNull();
    });

    it('numbers new tasks after the template ones', async () => {
        const daniel = await startDemo('manager');
        const project = (await daniel.get('/api/projects')).body.find((p) => p.key === 'APP');
        const created = await daniel.post('/api/tasks').send({ taskName: 'Dark mode', projectReference: project._id });
        expect(created.status).toBe(201);
        expect(created.body.task.number).toBe(9);
        expect((await Project.findById(project._id)).taskCounter).toBe(9);
    });

    it('purges expired sandboxes completely, sparing the static demo files', async () => {
        const lucas = await startDemo('member');
        const workspaceId = lucas.user.workspace._id;
        const task = await Task.findOne({ workspace: workspaceId, number: 1 });
        await lucas.post('/api/files/upload')
            .field('entityType', 'Task').field('entityId', task._id.toString())
            .attach('file', Buffer.from('notes'), { filename: 'notes.txt', contentType: 'text/plain' });

        await Workspace.updateOne({ _id: workspaceId }, { expiresAt: new Date(Date.now() - 1000) });
        expect(await purgeExpiredSandboxes()).toBe(1);

        for (const Model of [Workspace, User, Project, Task, Activity, FileAsset]) {
            expect(await Model.countDocuments(Model === Workspace ? { _id: workspaceId } : { workspace: workspaceId })).toBe(0);
        }
        expect(cloudinary.uploader.destroy).toHaveBeenCalledTimes(1); // the visitor's upload, not the demo assets
        expect((await lucas.get('/api/auth/check-auth')).status).toBe(401);
    });

    it('discards the sandbox when the visitor leaves', async () => {
        const maya = await startDemo('admin');
        expect((await maya.post('/api/auth/logout')).status).toBe(200);
        expect(await Workspace.exists({ _id: maya.user.workspace._id })).toBeNull();
        expect(await Task.countDocuments({ workspace: maya.user.workspace._id })).toBe(0);
    });

    it('rejects unknown roles', async () => {
        expect((await request(app).post('/api/demo/start').send({ persona: 'root' })).status).toBe(400);
    });
});
