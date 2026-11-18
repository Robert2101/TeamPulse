import { beforeEach, describe, expect, it, vi } from 'vitest';
import { seed } from './fixtures.js';
import { signIn } from './helpers.js';
import Project from '../models/project.model.js';
import Task from '../models/task.model.js';

vi.mock('../config/cloudinary.js', () => import('./mocks/cloudinary.js'));

// The role matrix published on the landing page, row by row. "Their projects" means projects the
// person manages or belongs to; the fixture adds an Admin-run project that the PM has no part in.
describe('the published permission matrix', () => {
    let f;
    let adminProject;
    let adminTask;

    beforeEach(async () => {
        f = await seed();
        adminProject = await Project.create({
            projectName: 'Admin-only', workspace: f.acme._id, projectManager: f.users.admin._id, createdBy: f.users.admin._id,
        });
        adminTask = await Task.create({ taskName: 'Admin task', projectReference: adminProject._id, workspace: f.acme._id, createdBy: f.users.admin._id });
        await Project.updateOne({ _id: f.project._id }, { $push: { assignedTeamMembers: f.users.stakeholder._id } });
    });

    it('edit a project and manage its team: Admin anywhere, PM on their projects', async () => {
        const pm = await signIn('pm@acme.test');
        expect((await pm.put(`/api/projects/${f.project._id}`).send({ projectStatus: 'Active' })).status).toBe(200);
        expect((await pm.put(`/api/projects/${adminProject._id}`).send({ projectStatus: 'Active' })).status).toBe(403);
        const admin = await signIn('admin@acme.test');
        expect((await admin.put(`/api/projects/${f.project._id}`).send({ projectStatus: 'On Hold' })).status).toBe(200);
    });

    it('create and move tasks: not on projects the PM has no part in, never for stakeholders', async () => {
        const pm = await signIn('pm@acme.test');
        expect((await pm.post('/api/tasks').send({ taskName: 'x', projectReference: adminProject._id })).status).toBe(403);
        expect((await pm.patch(`/api/tasks/${adminTask._id}`).send({ taskStatus: 'Done' })).status).toBe(403);

        const sue = await signIn('stakeholder@acme.test'); // on the project, but read-only
        expect((await sue.patch(`/api/tasks/${f.task._id}`).send({ taskStatus: 'Done' })).status).toBe(403);
        expect((await sue.post('/api/tasks').send({ taskName: 'x', projectReference: f.project._id })).status).toBe(403);
    });

    it('edit, reassign and delete tasks: managers only', async () => {
        const pm = await signIn('pm@acme.test');
        expect((await pm.delete(`/api/tasks/${adminTask._id}`)).status).toBe(403);
        const max = await signIn('member@acme.test');
        expect((await max.delete(`/api/tasks/${f.task._id}`)).status).toBe(403);
        await max.patch(`/api/tasks/${f.task._id}`).send({ assignee: f.users.outsider._id });
        expect((await Task.findById(f.task._id)).assignee.toString()).toBe(f.users.member._id.toString());
    });

    it('comment and attach files: every role, on their projects', async () => {
        const sue = await signIn('stakeholder@acme.test');
        expect((await sue.post(`/api/comments/task/${f.task._id}`).send({ commentContent: 'Looks good from the client side' })).status).toBe(201);
        const upload = await sue.post('/api/files/upload')
            .field('entityType', 'Task').field('entityId', f.task._id.toString())
            .attach('file', Buffer.from('notes'), { filename: 'notes.txt', contentType: 'text/plain' });
        expect(upload.status).toBe(201);

        const otto = await signIn('outsider@acme.test');
        expect((await otto.post(`/api/comments/task/${f.task._id}`).send({ commentContent: 'hi' })).status).toBe(403);
    });

    it('read the audit log: Admins, and PMs on their projects', async () => {
        const admin = await signIn('admin@acme.test');
        const pm = await signIn('pm@acme.test');
        const max = await signIn('member@acme.test');
        const sue = await signIn('stakeholder@acme.test');
        expect((await admin.get(`/api/activities/${f.project._id}`)).status).toBe(200);
        expect((await pm.get(`/api/activities/${f.project._id}`)).status).toBe(200);
        expect((await pm.get(`/api/activities/${adminProject._id}`)).status).toBe(403);
        expect((await max.get(`/api/activities/${f.project._id}`)).status).toBe(403);
        expect((await sue.get(`/api/activities/${f.project._id}`)).status).toBe(403);
    });

    it('manage members, roles and invite codes: Admins only', async () => {
        const pm = await signIn('pm@acme.test');
        expect((await pm.put(`/api/auth/workspace/users/${f.users.member._id}/status`).send({ status: 'Inactive' })).status).toBe(403);
        expect((await pm.post('/api/auth/workspace/invite-code')).status).toBe(403);
    });
});
