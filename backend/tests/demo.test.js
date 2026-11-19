import { beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';

vi.mock('../config/cloudinary.js', () => import('./mocks/cloudinary.js'));

const { signIn } = await import('./helpers.js');
const { default: cloudinary } = await import('../config/cloudinary.js');
const { DEMO_PASSWORD, resetDemoWorkspace } = await import('../services/demo.service.js');
const { default: Workspace } = await import('../models/workspace.model.js');
const { default: User } = await import('../models/user.model.js');
const { default: Task } = await import('../models/task.model.js');
const { default: Project } = await import('../models/project.model.js');
const { default: FileAsset } = await import('../models/fileAsset.model.js');

const demo = (key) => signIn(`${key}@fernway.example`, DEMO_PASSWORD);

describe('shared demo accounts', () => {
    beforeEach(async () => {
        await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
        cloudinary.uploader.destroy.mockClear();
        await resetDemoWorkspace();
    });

    it('signs in with a real password to a populated workspace', async () => {
        const lucas = await demo('lucas');
        expect(lucas.user).toMatchObject({ fullName: 'Lucas Moreau', role: { roleName: 'Team Member' }, workspace: { workspaceName: 'Fernway', isDemo: true } });
        const mine = await lucas.get('/api/tasks/mine');
        expect(mine.body.map((t) => `${t.projectReference.key}-${t.number}`)).toEqual(expect.arrayContaining(['APP-1', 'APP-2']));
        expect(mine.body.some((t) => new Date(t.dueDate) < new Date() && t.taskStatus !== 'Done')).toBe(true); // something overdue to show
    });

    it("logging out ends only this browser's session, not other visitors' on the same account", async () => {
        const visitorA = await demo('maya');
        const visitorB = await demo('maya');
        expect((await visitorA.post('/api/auth/logout')).status).toBe(200);
        expect((await visitorB.get('/api/auth/check-auth')).status).toBe(200);
    });

    it("blocks what would lock the next visitor out or empty the demo", async () => {
        const maya = await demo('maya');
        const lucas = await User.findOne({ emailAddress: 'lucas@fernway.example' });
        const project = await Project.findOne({ key: 'APP' });

        const blocked = [
            await maya.put('/api/auth/profile').send({ password: 'hijacked123' }),
            await maya.put('/api/auth/profile').send({ emailAddress: 'me@example.com' }),
            await maya.put(`/api/auth/workspace/users/${lucas._id}/role`).send({ roleName: 'Stakeholder' }),
            await maya.put(`/api/auth/workspace/users/${lucas._id}/status`).send({ status: 'Inactive' }),
            await maya.post('/api/auth/workspace/invite-code'),
            await maya.delete(`/api/projects/${project._id}`),
        ];
        for (const res of blocked) {
            expect(res.status).toBe(403);
            expect(res.body.message).toMatch(/turned off for the shared demo accounts/);
        }
        await demo('maya'); // the password still works

        // Everything else is open: moving work, for example.
        const task = await Task.findOne({ projectReference: project._id, taskStatus: 'To-Do' });
        expect((await maya.patch(`/api/tasks/${task._id}`).send({ taskStatus: 'In-Progress' })).status).toBe(200);
    });

    it('the nightly reset undoes visitors\' changes and keeps everyone signed in', async () => {
        const maya = await demo('maya');
        const before = await Workspace.findOne({ isDemo: true });
        const project = await Project.findOne({ key: 'APP' });
        await Task.updateMany({ projectReference: project._id }, { taskStatus: 'Done' });
        await maya.post('/api/tasks').send({ taskName: 'Visitor was here', projectReference: project._id });
        await FileAsset.create({
            url: 'https://example.test/up.png', name: 'up.png', fileType: 'image/png', size: 1, cloudinaryId: 'teampulse/tasks/up',
            workspace: before._id, uploadedBy: maya.user._id, entityType: 'Project', entityId: project._id,
        });

        await resetDemoWorkspace();

        expect(await Workspace.countDocuments({ isDemo: true })).toBe(1);
        expect((await Workspace.findOne({ isDemo: true }))._id).toEqual(before._id);
        expect(await Task.countDocuments({ taskName: 'Visitor was here' })).toBe(0);
        expect(await Task.countDocuments({ taskStatus: { $ne: 'Done' } })).toBeGreaterThan(10);
        expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('teampulse/tasks/up', expect.anything()); // visitor upload removed
        expect((await maya.get('/api/auth/check-auth')).status).toBe(200); // same account id, still signed in
    });

    it('never touches other workspaces', async () => {
        const other = await Workspace.create({ workspaceName: 'Real customer', owner: new mongoose.Types.ObjectId() });
        await resetDemoWorkspace();
        expect(await Workspace.findById(other._id)).not.toBeNull();
    });
});
