import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io as connect } from 'socket.io-client';
import { seed } from './fixtures.js';
import { httpServer, signIn } from './helpers.js';
import { getIO } from '../socket/socket.js';

const waitFor = async (check, timeout = 3000) => {
    const start = Date.now();
    while (!(await check())) {
        if (Date.now() - start > timeout) throw new Error('Timed out waiting for condition');
        await new Promise((r) => setTimeout(r, 20));
    }
};

describe('socket typing indicators', () => {
    let f;
    let url;
    const sockets = [];

    const open = async (email) => {
        const { cookie } = await signIn(email);
        const socket = connect(url, { extraHeaders: { cookie }, transports: ['websocket'], forceNew: true });
        sockets.push(socket);
        await new Promise((resolve, reject) => {
            socket.on('connect', resolve);
            socket.on('connect_error', reject);
        });
        return socket;
    };

    const joinProject = async (socket, projectId) => {
        socket.emit('join-project', projectId);
        await waitFor(async () => (await getIO().in(projectId).fetchSockets()).some((s) => s.id === socket.id));
    };

    beforeAll(async () => {
        f = await seed();
        await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
        url = `http://127.0.0.1:${httpServer.address().port}`;
    });

    afterAll(async () => {
        sockets.forEach((s) => s.disconnect());
        await new Promise((resolve) => httpServer.close(resolve));
    });

    it('relays only from sockets in the room, with the server-side name', async () => {
        const projectId = f.project._id.toString();
        const pm = await open('pm@acme.test');
        const member = await open('member@acme.test');
        const intruder = await open('member@beta.test');
        await joinProject(pm, projectId);
        await joinProject(member, projectId);

        const received = [];
        pm.on('user-typing', (data) => received.push(data));

        intruder.emit('typing', { projectId, taskId: 'x', userName: 'Fake Person' });
        member.emit('typing', { projectId, taskId: f.task._id.toString(), userName: 'Spoofed Name' });

        await waitFor(() => received.length > 0);
        await new Promise((r) => setTimeout(r, 150));
        expect(received).toHaveLength(1);
        expect(received[0]).toMatchObject({ projectId, taskId: f.task._id.toString(), userName: 'Max Member' });
    });
});
