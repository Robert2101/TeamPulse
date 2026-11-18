import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { seed } from './fixtures.js';
import { app, signIn } from './helpers.js';
import cloudinary from '../config/cloudinary.js';
import User from '../models/user.model.js';
import Workspace from '../models/workspace.model.js';
import Project from '../models/project.model.js';
import Task from '../models/task.model.js';
import Comment from '../models/comment.model.js';
import FileAsset from '../models/fileAsset.model.js';

vi.mock('../config/cloudinary.js', () => import('./mocks/cloudinary.js'));

const attach = (f, entityType, entityId, cloudinaryId) => FileAsset.create({
    url: `https://res.cloudinary.test/${cloudinaryId}`, name: `${cloudinaryId}.txt`, fileType: 'text/plain', size: 1,
    cloudinaryId, workspace: f.acme._id, uploadedBy: f.users.pm._id, entityType, entityId,
});

const signup = (body) => request(app).post('/api/auth/signup').send({
    fullName: 'New Person', emailAddress: 'new@company.test', password: 'password123', ...body,
});

describe('data integrity', () => {
    let f;

    beforeEach(async () => {
        f = await seed();
        cloudinary.uploader.destroy.mockClear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('does not leave a workspace behind when creating its owner fails', async () => {
        vi.spyOn(User, 'create').mockRejectedValueOnce(new Error('insert failed'));
        const res = await signup({ isCreatingWorkspace: true, workspaceName: 'Orphan Co' });
        expect(res.status).toBe(500);
        expect(await Workspace.exists({ workspaceName: 'Orphan Co' })).toBeNull();
    });

    it('answers "already exists" when two signups race for one email', async () => {
        await User.init(); // make sure the unique index exists
        await signup({ inviteCode: 'ACME01' });
        vi.spyOn(User, 'findOne').mockResolvedValueOnce(null); // the second request missed the first
        const res = await signup({ inviteCode: 'ACME01' });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/already exists/);
    });

    it('deletes a project with its tasks, comments, file records and stored files', async () => {
        await attach(f, 'Project', f.project._id, 'project-file');
        await attach(f, 'Task', f.task._id, 'task-file');
        await attach(f, 'Comment', f.comment._id, 'comment-file');
        await attach(f, 'Task', f.betaTask._id, 'beta-file');

        const pm = await signIn('pm@acme.test');
        expect((await pm.delete(`/api/projects/${f.project._id}`)).status).toBe(200);

        expect(await Project.exists({ _id: f.project._id })).toBeNull();
        expect(await Task.countDocuments({ projectReference: f.project._id })).toBe(0);
        expect(await Comment.exists({ _id: f.comment._id })).toBeNull();
        expect((await FileAsset.find()).map((file) => file.cloudinaryId)).toEqual(['beta-file']);

        const destroyed = cloudinary.uploader.destroy.mock.calls.map(([publicId]) => publicId).sort();
        expect(destroyed).toEqual(['comment-file', 'project-file', 'task-file']);
        expect(await Task.exists({ _id: f.betaTask._id })).toBeTruthy();
    });

    it('deletes a task with its comments and attachments', async () => {
        await attach(f, 'Task', f.task._id, 'task-file');
        await attach(f, 'Comment', f.comment._id, 'comment-file');

        const pm = await signIn('pm@acme.test');
        expect((await pm.delete(`/api/tasks/${f.task._id}`)).status).toBe(200);

        expect(await Comment.exists({ task: f.task._id })).toBeNull();
        expect(await FileAsset.countDocuments()).toBe(0);
        expect(cloudinary.uploader.destroy).toHaveBeenCalledTimes(2);
    });
});
