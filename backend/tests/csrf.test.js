import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { seed } from './fixtures.js';
import { app, asSession, signIn } from './helpers.js';

describe('CSRF protection', () => {
    let f;

    beforeEach(async () => {
        f = await seed();
    });

    it('requires the session\'s token on state-changing requests', async () => {
        const max = await signIn('member@acme.test');
        const withoutToken = asSession({ cookie: max.cookie });
        const forgedToken = asSession({ cookie: max.cookie, csrfToken: 'x'.repeat(43) });

        expect((await withoutToken.patch(`/api/tasks/${f.task._id}`).send({ taskStatus: 'Done' })).status).toBe(403);
        expect((await forgedToken.patch(`/api/tasks/${f.task._id}`).send({ taskStatus: 'Done' })).status).toBe(403);
        expect((await max.patch(`/api/tasks/${f.task._id}`).send({ taskStatus: 'Done' })).status).toBe(200);
    });

    it('does not need a token to read', async () => {
        const max = await signIn('member@acme.test');
        const withoutToken = asSession({ cookie: max.cookie });
        expect((await withoutToken.get('/api/projects')).status).toBe(200);
    });

    it('hands the same token back on check-auth, and a new one after revocation', async () => {
        const max = await signIn('member@acme.test');
        const me = await max.get('/api/auth/check-auth');
        expect(me.body.csrfToken).toBe(max.csrfToken);

        await max.post('/api/auth/logout');
        const again = await signIn('member@acme.test');
        expect(again.csrfToken).not.toBe(max.csrfToken);
    });

    it('does not let one user\'s token work for another', async () => {
        const max = await signIn('member@acme.test');
        const pm = await signIn('pm@acme.test');
        const swapped = asSession({ cookie: pm.cookie, csrfToken: max.csrfToken });
        expect((await swapped.post('/api/tasks').send({ taskName: 'x', projectReference: f.project._id })).status).toBe(403);
    });

    it('rejects form and text bodies on state-changing routes', async () => {
        const res = await request(app).post('/api/auth/login')
            .set('Content-Type', 'text/plain')
            .send(JSON.stringify({ emailAddress: 'member@acme.test', password: 'password123' }));
        expect(res.status).toBe(415);

        const form = await request(app).post('/api/auth/login').type('form').send({ emailAddress: 'member@acme.test' });
        expect(form.status).toBe(415);
    });
});
