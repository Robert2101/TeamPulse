import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { seed } from './fixtures.js';
import { app, signIn } from './helpers.js';

describe('authentication', () => {
    let f;

    beforeEach(async () => {
        f = await seed();
    });

    it('gives the same answer for a wrong password and an unknown email', async () => {
        const wrongPassword = await request(app).post('/api/auth/login').send({ emailAddress: 'member@acme.test', password: 'nope' });
        const unknownEmail = await request(app).post('/api/auth/login').send({ emailAddress: 'ghost@acme.test', password: 'nope' });
        expect(wrongPassword.status).toBe(401);
        expect(unknownEmail.status).toBe(401);
        expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
    });

    it('sets an httpOnly session cookie and never returns the password hash', async () => {
        const res = await request(app).post('/api/auth/login').send({ emailAddress: 'member@acme.test', password: 'password123' });
        expect(res.status).toBe(200);
        expect(res.headers['set-cookie'].join(';')).toMatch(/token=.+HttpOnly/i);
        expect(res.body.user.password).toBeUndefined();

        const max = await signIn('member@acme.test');
        const me = await max.get('/api/auth/check-auth');
        expect(me.status).toBe(200);
        expect(me.body.user.emailAddress).toBe('member@acme.test');
        expect(me.body.user.password).toBeUndefined();
    });

    it('rejects requests without a session', async () => {
        expect((await request(app).get('/api/auth/check-auth')).status).toBe(401);
        expect((await request(app).get('/api/projects')).status).toBe(401);
    });

    it('locks out deactivated users, including their open sessions', async () => {
        const max = await signIn('member@acme.test');
        const admin = await signIn('admin@acme.test');
        const res = await admin.put(`/api/auth/workspace/users/${f.users.member._id}/status`).send({ status: 'Inactive' });
        expect(res.status).toBe(200);

        expect((await max.get('/api/projects')).status).toBe(403);
        const login = await request(app).post('/api/auth/login').send({ emailAddress: 'member@acme.test', password: 'password123' });
        expect(login.status).toBe(403);
    });
});
