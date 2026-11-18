import { beforeEach, describe, expect, it } from 'vitest';
import { seed } from './fixtures.js';
import { signIn } from './helpers.js';
import Task from '../models/task.model.js';
import Activity from '../models/activity.model.js';

describe('task updates', () => {
    let f;

    beforeEach(async () => {
        f = await seed();
    });

    const latestActivity = () => Activity.findOne({ entityId: f.task._id }).sort({ createdAt: -1 }).lean();

    it('logs a status move with the previous status', async () => {
        const max = await signIn('member@acme.test');
        await max.patch(`/api/tasks/${f.task._id}`).send({ taskStatus: 'Review' });
        const entry = await latestActivity();
        expect(entry.action).toBe('Updated Task to Review');
        expect(entry.metadata).toMatchObject({ taskName: 'Write copy', previousStatus: 'To-Do', newStatus: 'Review' });
    });

    it('logs edits by field, and nothing when nothing changed', async () => {
        const pm = await signIn('pm@acme.test');
        await pm.patch(`/api/tasks/${f.task._id}`).send({ priority: 'Urgent', taskName: 'Write launch copy', taskStatus: 'To-Do' });
        const entry = await latestActivity();
        expect(entry.action).toBe('Edited Task');
        expect(entry.metadata.fields.sort()).toEqual(['priority', 'taskName']);

        const before = await Activity.countDocuments();
        await pm.patch(`/api/tasks/${f.task._id}`).send({ priority: 'Urgent' });
        expect(await Activity.countDocuments()).toBe(before);
    });

    it('sets completedAt on Done and clears it when the task is reopened', async () => {
        const max = await signIn('member@acme.test');
        await max.patch(`/api/tasks/${f.task._id}`).send({ taskStatus: 'Done' });
        expect((await Task.findById(f.task._id)).completedAt).toBeInstanceOf(Date);
        await max.patch(`/api/tasks/${f.task._id}`).send({ taskStatus: 'Review' });
        expect((await Task.findById(f.task._id)).completedAt).toBeNull();
    });

    it('names the task in comment activity', async () => {
        const max = await signIn('member@acme.test');
        await max.post(`/api/comments/task/${f.task._id}`).send({ commentContent: 'On it' });
        const entry = await Activity.findOne({ action: 'Added Comment' }).lean();
        expect(entry.metadata.taskName).toBe('Write copy');
    });
});
