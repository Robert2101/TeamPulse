import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { seed } from './fixtures.js';
import { app, asSession, signIn } from './helpers.js';

const cookieFrom = (res) => res.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');

describe('session revocation', () => {
    let f;

    beforeEach(async () => {
        f = await seed();
    });

    it('rejects the old cookie after logout', async () => {
        const max = await signIn('member@acme.test');
        expect((await max.get('/api/auth/check-auth')).status).toBe(200);

        const out = await max.post('/api/auth/logout');
        expect(out.status).toBe(200);
        expect(out.headers['set-cookie'].join(';')).toMatch(/token=;/);

        expect((await max.get('/api/auth/check-auth')).status).toBe(401);
    });

    it('keeps the current session but ends the others when the password changes', async () => {
        const laptop = await signIn('member@acme.test');
        const phone = await signIn('member@acme.test');

        const res = await laptop.put('/api/auth/profile').send({ password: 'a-new-password' });
        expect(res.status).toBe(200);
        const renewed = asSession({ ...laptop, cookie: cookieFrom(res) });

        expect((await renewed.get('/api/auth/check-auth')).status).toBe(200);
        expect((await phone.get('/api/auth/check-auth')).status).toBe(401);
        expect((await laptop.get('/api/auth/check-auth')).status).toBe(401);
    });

    it('signs a user out when an Admin changes their role', async () => {
        const max = await signIn('member@acme.test');
        const admin = await signIn('admin@acme.test');
        await admin.put(`/api/auth/workspace/users/${f.users.member._id}/role`).send({ roleName: 'Stakeholder' });
        expect((await max.get('/api/auth/check-auth')).status).toBe(401);
    });

    it('ignores logout cookies that were not signed by the server', async () => {
        const max = await signIn('member@acme.test');
        const forged = jwt.sign({ userId: f.users.member._id, tokenVersion: 0 }, 'not-the-secret');
        await request(app).post('/api/auth/logout').set('Cookie', `token=${forged}`);
        expect((await max.get('/api/auth/check-auth')).status).toBe(200);
    });

    it('still accepts tokens issued before token versions existed', async () => {
        const legacy = jwt.sign({ userId: f.users.member._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        const res = await request(app).get('/api/auth/check-auth').set('Cookie', `token=${legacy}`);
        expect(res.status).toBe(200);
        expect(res.body.user.tokenVersion).toBeUndefined();
    });
});
