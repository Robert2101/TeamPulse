import { beforeEach, describe, expect, it, vi } from 'vitest';
import { seed } from './fixtures.js';
import { signIn } from './helpers.js';
import cloudinary from '../config/cloudinary.js';
import FileAsset from '../models/fileAsset.model.js';
import Task from '../models/task.model.js';

vi.mock('../config/cloudinary.js', () => import('./mocks/cloudinary.js'));

const upload = (session, entityType, entityId) => session.post('/api/files/upload')
    .field('entityType', entityType)
    .field('entityId', entityId.toString())
    .attach('file', Buffer.from('hello'), { filename: 'notes.txt', contentType: 'text/plain' });

describe('file uploads', () => {
    let f;

    beforeEach(async () => {
        f = await seed();
        cloudinary.uploader.upload_stream.mockClear();
    });

    it('lets project members attach files to tasks', async () => {
        const max = await signIn('member@acme.test');
        const res = await upload(max, 'Task', f.task._id);
        expect(res.status).toBe(201);
        const task = await Task.findById(f.task._id);
        expect(task.attachments.map(String)).toContain(res.body.file._id);
    });

    it('refuses task and comment attachments from people outside the project', async () => {
        const otto = await signIn('outsider@acme.test');
        const sue = await signIn('stakeholder@acme.test');
        expect((await upload(otto, 'Task', f.task._id)).status).toBe(403);
        expect((await upload(sue, 'Comment', f.comment._id)).status).toBe(403);
        expect(cloudinary.uploader.upload_stream).not.toHaveBeenCalled();
        expect(await FileAsset.countDocuments()).toBe(0);
    });

    it('does not reveal entities in other workspaces', async () => {
        const bea = await signIn('member@beta.test');
        expect((await upload(bea, 'Task', f.task._id)).status).toBe(404);
        expect((await upload(bea, 'Comment', f.comment._id)).status).toBe(404);
        expect(cloudinary.uploader.upload_stream).not.toHaveBeenCalled();
    });
});
