import { beforeEach, describe, expect, it } from 'vitest';
import { seed } from './fixtures.js';
import { signIn } from './helpers.js';
import Task from '../models/task.model.js';

describe('role-based access', () => {
    let f;

    beforeEach(async () => {
        f = await seed();
    });

    it('only managers create projects', async () => {
        const member = await signIn('member@acme.test');
        expect((await member.post('/api/projects').send({ projectName: 'Nope' })).status).toBe(403);

        const pm = await signIn('pm@acme.test');
        expect((await pm.post('/api/projects').send({ projectName: 'Yes' })).status).toBe(201);
    });

    it('stakeholders cannot create tasks', async () => {
        const sue = await signIn('stakeholder@acme.test');
        const res = await sue.post('/api/tasks').send({ taskName: 'x', projectReference: f.project._id });
        expect(res.status).toBe(403);
    });

    it('team members outside a project cannot see or add its tasks', async () => {
        const otto = await signIn('outsider@acme.test');
        expect((await otto.get(`/api/tasks/project/${f.project._id}`)).status).toBe(403);
        expect((await otto.post('/api/tasks').send({ taskName: 'x', projectReference: f.project._id })).status).toBe(403);
    });

    it('project members can create tasks; only the PM or an Admin deletes them', async () => {
        const max = await signIn('member@acme.test');
        const created = await max.post('/api/tasks').send({ taskName: 'Member task', projectReference: f.project._id });
        expect(created.status).toBe(201);

        expect((await max.delete(`/api/tasks/${f.task._id}`)).status).toBe(403);
        const pm = await signIn('pm@acme.test');
        expect((await pm.delete(`/api/tasks/${f.task._id}`)).status).toBe(200);
    });

    it('members can change only the status of a task', async () => {
        const max = await signIn('member@acme.test');
        const res = await max.patch(`/api/tasks/${f.task._id}`).send({
            taskStatus: 'Review',
            taskName: 'Renamed',
            priority: 'Urgent',
            workspace: f.beta._id,
            createdBy: f.users.betaAdmin._id,
        });
        expect(res.status).toBe(200);

        const task = await Task.findById(f.task._id);
        expect(task.taskStatus).toBe('Review');
        expect(task.taskName).toBe('Write copy');
        expect(task.priority).toBe('Medium');
        expect(task.workspace.toString()).toBe(f.acme._id.toString());
        expect(task.createdBy.toString()).toBe(f.users.pm._id.toString());
    });

    it('hides the budget from non-managers', async () => {
        const max = await signIn('member@acme.test');
        const asMember = await max.get(`/api/projects/${f.project._id}`);
        expect(asMember.status).toBe(200);
        expect(asMember.body.budget).toBeUndefined();

        const pm = await signIn('pm@acme.test');
        expect((await pm.get(`/api/projects/${f.project._id}`)).body.budget).toBe(5000);
    });

    it('only Admins change roles, and never their own', async () => {
        const pm = await signIn('pm@acme.test');
        const byPm = await pm.put(`/api/auth/workspace/users/${f.users.member._id}/role`).send({ roleName: 'Admin' });
        expect(byPm.status).toBe(403);

        const admin = await signIn('admin@acme.test');
        const self = await admin.put(`/api/auth/workspace/users/${f.users.admin._id}/role`).send({ roleName: 'Stakeholder' });
        expect(self.status).toBe(400);
        const other = await admin.put(`/api/auth/workspace/users/${f.users.member._id}/role`).send({ roleName: 'Project Manager' });
        expect(other.status).toBe(200);
    });
});
