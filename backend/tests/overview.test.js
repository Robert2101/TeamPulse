import { beforeEach, describe, expect, it } from 'vitest';
import { seed } from './fixtures.js';
import { signIn } from './helpers.js';
import Activity from '../models/activity.model.js';

describe('overview data', () => {
    let f;

    beforeEach(async () => {
        f = await seed();
    });

    it('returns tasks from accessible projects only', async () => {
        const admin = await signIn('admin@acme.test');
        const otto = await signIn('outsider@acme.test');
        const max = await signIn('member@acme.test');
        expect((await admin.get('/api/tasks/overview')).body.map((t) => t.taskName)).toEqual(['Write copy']);
        expect((await max.get('/api/tasks/overview')).body).toHaveLength(1);
        expect((await otto.get('/api/tasks/overview')).body).toHaveLength(0);
    });

    it('counts each project\'s activity per day for the last 14 days', async () => {
        const max = await signIn('member@acme.test');
        await max.patch(`/api/tasks/${f.task._id}`).send({ taskStatus: 'Review' });
        await max.post(`/api/comments/task/${f.task._id}`).send({ commentContent: 'Ready for a look' });
        await Activity.create({ user: f.users.pm._id, workspace: f.acme._id, action: 'Created Task', entityType: 'Task', entityId: f.task._id, metadata: { project: f.project._id.toString() }, createdAt: new Date(Date.now() - 3 * 86400000) });
        await Activity.create({ user: f.users.pm._id, workspace: f.acme._id, action: 'Created Task', entityType: 'Task', entityId: f.task._id, metadata: { project: f.project._id.toString() }, createdAt: new Date(Date.now() - 40 * 86400000) });

        const res = await max.get('/api/projects/pulse');
        expect(res.status).toBe(200);
        expect(res.body.days).toHaveLength(14);
        const series = res.body.pulse[f.project._id.toString()];
        expect(series.at(-1)).toBe(2); // today's status move and comment
        expect(series.reduce((a, b) => a + b, 0)).toBe(3); // the 40-day-old event is outside the window
        expect(res.body.pulse[f.betaProject._id.toString()]).toBeUndefined();
    });
});
