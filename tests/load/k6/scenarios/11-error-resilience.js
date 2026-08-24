/**
 * ══════════════════════════════════════════════════════════════════════════════
 *  11 — ERROR / RESILIENCE TEST
 * ══════════════════════════════════════════════════════════════════════════════
 *  Purpose : Validate the application returns correct error responses under
 *            expected failure conditions. Does NOT intentionally damage data.
 *  VUs     : 5
 *  Duration: 1 min
 *
 *  Tested failure scenarios:
 *    • 401 — Request with no auth cookie
 *    • 401 — Request with invalid/garbage JWT
 *    • 404 — Request with non-existent MongoDB ObjectId
 *    • 400 — Request with missing required fields
 *
 *  Run:
 *    k6 run tests/load/k6/scenarios/11-error-resilience.js
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { group, sleep } from 'k6';
import http from 'k6/http';
import { check } from 'k6';
import { performSetup } from '../helpers/auth.js';
import { authGet, authPost, unauthGet, badAuthGet } from '../helpers/http.js';
import { ERROR_THRESHOLDS } from '../config/thresholds.js';

// Fake but valid-format MongoDB ObjectId for 404 testing
var FAKE_ID = '000000000000000000000000';

export const options = {
    scenarios: {
        error_resilience: {
            executor: 'constant-vus',
            vus: 5,
            duration: '1m',
        },
    },
    thresholds: ERROR_THRESHOLDS,
};

export function setup() {
    return performSetup();
}

export default function (data) {
    var base = data.baseUrl;
    var tok  = data.token;

    // ── 401: No auth cookie ──────────────────────────────────────────────────
    group('error: no auth — projects', function () {
        var res = unauthGet(base + '/api/projects', {
            endpoint: '/api/projects', workload: 'error', error_type: 'no_auth',
        });
        check(res, {
            'no-auth: returns 401': function (r) { return r.status === 401; },
        });
    });
    sleep(0.2);

    group('error: no auth — tasks', function () {
        var res = unauthGet(base + '/api/tasks/mine', {
            endpoint: '/api/tasks/mine', workload: 'error', error_type: 'no_auth',
        });
        check(res, {
            'no-auth tasks: returns 401': function (r) { return r.status === 401; },
        });
    });
    sleep(0.2);

    // ── 401: Invalid JWT ─────────────────────────────────────────────────────
    group('error: bad token — projects', function () {
        var res = badAuthGet(base + '/api/projects', {
            endpoint: '/api/projects', workload: 'error', error_type: 'bad_token',
        });
        check(res, {
            'bad-token: returns 401': function (r) { return r.status === 401; },
        });
    });
    sleep(0.2);

    group('error: bad token — check-auth', function () {
        var res = badAuthGet(base + '/api/auth/check-auth', {
            endpoint: '/api/auth/check-auth', workload: 'error', error_type: 'bad_token',
        });
        check(res, {
            'bad-token auth: returns 401': function (r) { return r.status === 401; },
        });
    });
    sleep(0.2);

    // ── 404: Non-existent resource ───────────────────────────────────────────
    group('error: 404 — project', function () {
        var res = authGet(base + '/api/projects/' + FAKE_ID, tok, {
            endpoint: '/api/projects/:id', workload: 'error', error_type: 'not_found',
        });
        check(res, {
            'fake-project: returns 404': function (r) { return r.status === 404; },
        });
    });
    sleep(0.2);

    group('error: 404 — tasks by project', function () {
        var res = authGet(base + '/api/tasks/project/' + FAKE_ID, tok, {
            endpoint: '/api/tasks/project/:projectId', workload: 'error', error_type: 'not_found',
        });
        check(res, {
            'fake-project-tasks: returns 404': function (r) { return r.status === 404; },
        });
    });
    sleep(0.2);

    group('error: 404 — comments by task', function () {
        var res = authGet(base + '/api/comments/task/' + FAKE_ID, tok, {
            endpoint: '/api/comments/task/:taskId', workload: 'error', error_type: 'not_found',
        });
        check(res, {
            'fake-task-comments: returns 404': function (r) { return r.status === 404; },
        });
    });
    sleep(0.2);

    // ── 400: Missing required fields ─────────────────────────────────────────
    group('error: 400 — create project no name', function () {
        var res = authPost(base + '/api/projects',
            { projectDescription: 'missing projectName' },
            tok,
            { endpoint: '/api/projects', workload: 'error', error_type: 'bad_request' }
        );
        check(res, {
            'no-name project: returns 400': function (r) { return r.status === 400; },
        });
    });
    sleep(0.2);

    group('error: 400 — create task no name', function () {
        var res = authPost(base + '/api/tasks',
            { taskDescription: 'missing taskName and projectReference' },
            tok,
            { endpoint: '/api/tasks', workload: 'error', error_type: 'bad_request' }
        );
        check(res, {
            'no-name task: returns 400': function (r) { return r.status === 400; },
        });
    });
    sleep(0.2);

    group('error: 400 — create comment empty', function () {
        if (data.taskId) {
            var res = authPost(base + '/api/comments/task/' + data.taskId,
                { commentContent: '' },
                tok,
                { endpoint: '/api/comments/task/:taskId', workload: 'error', error_type: 'bad_request' }
            );
            check(res, {
                'empty comment: returns 400': function (r) { return r.status === 400; },
            });
        }
    });
    sleep(0.2);

    // ── 400: Files without required query params ─────────────────────────────
    group('error: 400 — files missing params', function () {
        var res = authGet(base + '/api/files', tok, {
            endpoint: '/api/files', workload: 'error', error_type: 'bad_request',
        });
        check(res, {
            'files no params: returns 400': function (r) { return r.status === 400; },
        });
    });

    sleep(Math.random() * 0.5 + 0.3);
}
