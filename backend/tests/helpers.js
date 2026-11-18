import { createServer } from 'node:http';
import request from 'supertest';
import app from '../app.js';
import { initSocket } from '../socket/socket.js';
import { PASSWORD } from './fixtures.js';

// Controllers broadcast through getIO(), so Socket.IO needs a server even when nothing listens.
export const httpServer = createServer(app);
initSocket(httpServer);

export { app };

const sessionHeaders = (session) => {
    const headers = { Cookie: session.cookie };
    if (session.csrfToken) headers['X-CSRF-Token'] = session.csrfToken;
    return headers;
};

/** A signed-in API client: every request carries the session cookie. */
export const asSession = (session) => {
    const call = (method) => (url) => request(app)[method](url).set(sessionHeaders(session));
    return {
        ...session,
        get: call('get'),
        post: call('post'),
        put: call('put'),
        patch: call('patch'),
        delete: call('delete'),
    };
};

export const signIn = async (emailAddress, password = PASSWORD) => {
    const res = await request(app).post('/api/auth/login').send({ emailAddress, password });
    if (res.status !== 200) throw new Error(`Login failed for ${emailAddress}: ${res.status} ${JSON.stringify(res.body)}`);
    const cookie = res.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');
    return asSession({ cookie, csrfToken: res.body.csrfToken, user: res.body.user });
};
