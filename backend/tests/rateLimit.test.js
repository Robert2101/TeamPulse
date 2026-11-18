import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// One proxy hop in front of the API, as on a typical host. Must be set before app.js loads.
vi.hoisted(() => { process.env.TRUST_PROXY = '1'; });

vi.mock('../config/redis.js', async (importOriginal) => ({
    ...(await importOriginal()),
    checkRateLimit: vi.fn(async () => ({ success: true })),
}));

const { checkRateLimit } = await import('../config/redis.js');
const { seed } = await import('./fixtures.js');
const { app, signIn } = await import('./helpers.js');

const keys = () => checkRateLimit.mock.calls.map(([key]) => key);
const login = (forwardedFor) => request(app).post('/api/auth/login')
    .set('X-Forwarded-For', forwardedFor)
    .send({ emailAddress: 'member@acme.test', password: 'wrong' });

describe('rate limiting behind a proxy', () => {
    let f;

    beforeAll(async () => {
        f = await seed();
    });

    beforeEach(() => {
        checkRateLimit.mockClear();
    });

    it('gives each client IP its own login bucket', async () => {
        await login('203.0.113.7');
        await login('198.51.100.9');
        expect(keys()).toEqual(['auth:203.0.113.7', 'auth:198.51.100.9']);
    });

    it('ignores addresses a client prepends to X-Forwarded-For', async () => {
        await login('6.6.6.6, 203.0.113.7');
        expect(keys()).toEqual(['auth:203.0.113.7']);
    });

    it('keys file routes by account, not by IP', async () => {
        const max = await signIn('member@acme.test');
        checkRateLimit.mockClear();
        await max.get(`/api/files?entityType=Project&entityId=${f.project._id}`);
        expect(keys()).toEqual([`file:read:${f.users.member._id}`]);
    });

    it('answers 429 once the bucket is empty', async () => {
        checkRateLimit.mockResolvedValueOnce({ success: false });
        const res = await login('203.0.113.7');
        expect(res.status).toBe(429);
    });
});
