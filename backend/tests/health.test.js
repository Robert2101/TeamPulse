import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from './helpers.js';

describe('health check', () => {
    it('reports the API and database as up, without a session', async () => {
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ status: 'ok', database: 'connected' });
    });
});
