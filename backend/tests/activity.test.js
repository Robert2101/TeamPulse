import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/cloudinary.js', () => import('./mocks/cloudinary.js'));
vi.mock('../config/redis.js', async (importOriginal) => ({
    ...(await importOriginal()),
    delCache: vi.fn(async () => true),
}));

const { delCache } = await import('../config/redis.js');
const { seed } = await import('./fixtures.js');
const { signIn } = await import('./helpers.js');
const { default: User } = await import('../models/user.model.js');

describe('activity tracking', () => {
    let f;
    let max;
    let auditKey;

    beforeEach(async () => {
        f = await seed();
        max = await signIn('member@acme.test');
        auditKey = `activity:${f.project._id}`;
        delCache.mockClear();
    });

    it('refreshes the project audit log after comment events', async () => {
        const added = await max.post(`/api/comments/task/${f.task._id}`).send({ commentContent: 'Hello' });
        expect(added.status).toBe(201);
        expect(delCache).toHaveBeenCalledWith(auditKey);

        delCache.mockClear();
        await max.patch(`/api/comments/${added.body.comment._id}`).send({ commentContent: 'Edited' });
        expect(delCache).toHaveBeenCalledWith(auditKey);

        delCache.mockClear();
        await max.delete(`/api/comments/${added.body.comment._id}`);
        expect(delCache).toHaveBeenCalledWith(auditKey);
    });

    it('refreshes the project audit log after file events', async () => {
        const uploaded = await max.post('/api/files/upload')
            .field('entityType', 'Task')
            .field('entityId', f.task._id.toString())
            .attach('file', Buffer.from('hi'), { filename: 'a.txt', contentType: 'text/plain' });
        expect(uploaded.status).toBe(201);
        expect(delCache).toHaveBeenCalledWith(auditKey);

        delCache.mockClear();
        await max.delete(`/api/files/${uploaded.body.file._id}`);
        expect(delCache).toHaveBeenCalledWith(auditKey);
    });

    it('records the last login time', async () => {
        const before = Date.now();
        await signIn('pm@acme.test');
        const pm = await User.findById(f.users.pm._id);
        expect(pm.lastLogin.getTime()).toBeGreaterThanOrEqual(before);
    });
});
