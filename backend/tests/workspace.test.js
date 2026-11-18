import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { seed } from './fixtures.js';
import { app, signIn } from './helpers.js';
import Workspace, { generateInviteCode } from '../models/workspace.model.js';
import User from '../models/user.model.js';

const join = (emailAddress, inviteCode) => request(app).post('/api/auth/signup').send({
    fullName: 'Joiner', emailAddress, password: 'password123', inviteCode,
});

describe('workspaces and invite codes', () => {
    beforeEach(async () => {
        await seed();
        await Workspace.syncIndexes();
    });

    it('generates unambiguous 8-character codes', () => {
        const codes = new Set(Array.from({ length: 200 }, generateInviteCode));
        expect(codes.size).toBe(200);
        for (const code of codes) expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    });

    it('lets two companies use the same workspace name', async () => {
        const create = (emailAddress) => request(app).post('/api/auth/signup').send({
            fullName: 'Founder', emailAddress, password: 'password123', isCreatingWorkspace: true, workspaceName: 'Acme',
        });
        expect((await create('one@founders.test')).status).toBe(201);
        expect((await create('two@founders.test')).status).toBe(201);
        expect(await Workspace.countDocuments({ workspaceName: 'Acme' })).toBe(3);
    });

    it('shows the invite code to Admins only', async () => {
        const admin = await signIn('admin@acme.test');
        const member = await signIn('member@acme.test');
        expect((await admin.get('/api/auth/check-auth')).body.user.workspace.inviteCode).toBe('ACME01');
        expect((await member.get('/api/auth/check-auth')).body.user.workspace.inviteCode).toBeUndefined();
        expect(member.user.workspace.inviteCode).toBeUndefined();
    });

    it('lets Admins rotate the code, retiring the old one', async () => {
        const pm = await signIn('pm@acme.test');
        expect((await pm.post('/api/auth/workspace/invite-code')).status).toBe(403);

        const admin = await signIn('admin@acme.test');
        const res = await admin.post('/api/auth/workspace/invite-code');
        expect(res.status).toBe(200);
        expect(res.body.inviteCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);

        expect((await join('late@acme.test', 'ACME01')).status).toBe(404);
        expect((await join('new@acme.test', res.body.inviteCode.toLowerCase())).status).toBe(201);
        const joined = await User.findOne({ emailAddress: 'new@acme.test' }).populate('role');
        expect(joined.role.roleName).toBe('Stakeholder');
    });
});
