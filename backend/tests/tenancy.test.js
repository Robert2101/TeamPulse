import { beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { seed } from './fixtures.js';
import { signIn } from './helpers.js';
import Task from '../models/task.model.js';
import Comment from '../models/comment.model.js';
import Project from '../models/project.model.js';
import FileAsset from '../models/fileAsset.model.js';

// An Admin of workspace Beta must not be able to read or change anything in workspace Acme.
describe('tenant isolation', () => {
    let f;
    let bob;
    let file;

    beforeAll(async () => {
        f = await seed();
        file = await FileAsset.create({
            url: 'https://example.test/a.png', name: 'a.png', fileType: 'image/png', size: 1, cloudinaryId: 'a',
            workspace: f.acme._id, uploadedBy: f.users.pm._id, entityType: 'Project', entityId: f.project._id,
        });
        bob = await signIn('admin@beta.test');
    });

    const denied = (res) => expect([403, 404]).toContain(res.status);

    it('hides other workspaces\' projects', async () => {
        denied(await bob.get(`/api/projects/${f.project._id}`));
        denied(await bob.put(`/api/projects/${f.project._id}`).send({ projectName: 'pwned' }));
        denied(await bob.delete(`/api/projects/${f.project._id}`));
        const list = await bob.get('/api/projects');
        expect(list.status).toBe(200);
        expect(list.body.map((p) => p._id)).not.toContain(f.project._id.toString());
    });

    it('blocks tasks in other workspaces', async () => {
        denied(await bob.get(`/api/tasks/project/${f.project._id}`));
        denied(await bob.post('/api/tasks').send({ taskName: 'x', projectReference: f.project._id }));
        denied(await bob.patch(`/api/tasks/${f.task._id}`).send({ taskStatus: 'Done' }));
        denied(await bob.delete(`/api/tasks/${f.task._id}`));
    });

    it('blocks comments in other workspaces', async () => {
        denied(await bob.get(`/api/comments/task/${f.task._id}`));
        denied(await bob.post(`/api/comments/task/${f.task._id}`).send({ commentContent: 'hi' }));
        denied(await bob.patch(`/api/comments/${f.comment._id}`).send({ commentContent: 'edited' }));
        denied(await bob.delete(`/api/comments/${f.comment._id}`));
    });

    it('blocks activity and files in other workspaces', async () => {
        denied(await bob.get(`/api/activities/${f.project._id}`));
        const files = await bob.get(`/api/files?entityType=Project&entityId=${f.project._id}`);
        if (files.status === 200) expect(files.body).toHaveLength(0);
        else denied(files);
    });

    // Answering 403 for "exists, but elsewhere" and 404 for "doesn't exist" would let anyone probe which ids
    // exist in other tenants. Another workspace's id must get exactly the answer a made-up id gets.
    it("answers another workspace's ids exactly like ids that don't exist", async () => {
        const nowhere = new mongoose.Types.ObjectId();
        const probes = [
            (id) => bob.get(`/api/projects/${id}`),
            (id) => bob.get(`/api/tasks/project/${id}`),
            (id) => bob.get(`/api/activities/${id}`),
            (id) => bob.patch(`/api/tasks/${id}`).send({ taskStatus: 'Done' }),
            (id) => bob.delete(`/api/tasks/${id}`),
            (id) => bob.get(`/api/comments/task/${id}`),
            (id) => bob.delete(`/api/files/${id}`),
        ];
        const realIds = [f.project._id, f.project._id, f.project._id, f.task._id, f.task._id, f.task._id, file._id];
        for (const [i, probe] of probes.entries()) {
            const [elsewhere, missing] = await Promise.all([probe(realIds[i]), probe(nowhere)]);
            expect({ status: elsewhere.status, body: elsewhere.body }, `probe ${i}`).toEqual({ status: missing.status, body: missing.body });
            expect(elsewhere.status, `probe ${i}`).toBe(404);
        }
    });

    it('left workspace Acme untouched', async () => {
        const [project, task, comment] = await Promise.all([
            Project.findById(f.project._id), Task.findById(f.task._id), Comment.findById(f.comment._id),
        ]);
        expect(project.projectName).toBe('Acme Launch');
        expect(task.taskStatus).toBe('To-Do');
        expect(comment.commentContent).toBe('First!');
    });
});
