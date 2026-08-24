/**
 * ══════════════════════════════════════════════════════════════════════════════
 *  01 — SMOKE TEST
 * ══════════════════════════════════════════════════════════════════════════════
 *  Purpose : Verify the k6 infrastructure, auth flow, and core endpoints work.
 *  VUs     : 1
 *  Duration: 30 s
 *
 *  Run:
 *    k6 run tests/load/k6/scenarios/01-smoke.js
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { group, sleep } from 'k6';
import { performSetup } from '../helpers/auth.js';
import { authGet } from '../helpers/http.js';
import { checkResponse, checkJsonArray, checkHasField } from '../helpers/checks.js';
import { SMOKE_THRESHOLDS } from '../config/thresholds.js';
import {
    checkAuthDuration, projectsListDuration, tasksByProjectDuration,
    dashboardStatsDuration, cacheReadDuration,
} from '../helpers/metrics.js';

export const options = {
    vus: 1,
    duration: '30s',
    thresholds: SMOKE_THRESHOLDS,
};

export function setup() {
    return performSetup();
}

export default function (data) {
    var base = data.baseUrl;
    var tok  = data.token;

    group('Auth check', function () {
        var res = authGet(base + '/api/auth/check-auth', tok, {
            endpoint: '/api/auth/check-auth', workload: 'smoke', cached: 'yes',
        });
        checkResponse(res, 'check-auth');
        checkHasField(res, 'check-auth', 'authenticated');
        checkAuthDuration.add(res.timings.duration);
        cacheReadDuration.add(res.timings.duration);
    });

    sleep(0.5);

    group('List projects', function () {
        var res = authGet(base + '/api/projects', tok, {
            endpoint: '/api/projects', workload: 'smoke', cached: 'yes',
        });
        checkResponse(res, 'list-projects');
        checkJsonArray(res, 'list-projects');
        projectsListDuration.add(res.timings.duration);
        cacheReadDuration.add(res.timings.duration);
    });

    sleep(0.5);

    if (data.projectId) {
        group('Get project by ID', function () {
            var res = authGet(base + '/api/projects/' + data.projectId, tok, {
                endpoint: '/api/projects/:id', workload: 'smoke', cached: 'yes',
            });
            checkResponse(res, 'get-project');
            cacheReadDuration.add(res.timings.duration);
        });

        sleep(0.5);

        group('Tasks for project', function () {
            var res = authGet(base + '/api/tasks/project/' + data.projectId, tok, {
                endpoint: '/api/tasks/project/:projectId', workload: 'smoke', cached: 'yes',
            });
            checkResponse(res, 'tasks-by-project');
            checkJsonArray(res, 'tasks-by-project');
            tasksByProjectDuration.add(res.timings.duration);
            cacheReadDuration.add(res.timings.duration);
        });

        sleep(0.5);

        group('Activity logs', function () {
            var res = authGet(base + '/api/activities/' + data.projectId, tok, {
                endpoint: '/api/activities/:entityId', workload: 'smoke', cached: 'yes',
            });
            checkResponse(res, 'activity-logs');
            cacheReadDuration.add(res.timings.duration);
        });

        sleep(0.5);
    }

    group('Dashboard stats', function () {
        var res = authGet(base + '/api/tasks/stats', tok, {
            endpoint: '/api/tasks/stats', workload: 'smoke', cached: 'yes',
        });
        checkResponse(res, 'dashboard-stats');
        dashboardStatsDuration.add(res.timings.duration);
        cacheReadDuration.add(res.timings.duration);
    });

    sleep(0.5);

    if (data.taskId) {
        group('Comments for task', function () {
            var res = authGet(base + '/api/comments/task/' + data.taskId, tok, {
                endpoint: '/api/comments/task/:taskId', workload: 'smoke', cached: 'no',
            });
            checkResponse(res, 'comments-by-task');
            checkJsonArray(res, 'comments-by-task');
        });

        sleep(0.5);
    }

    group('My tasks', function () {
        var res = authGet(base + '/api/tasks/mine', tok, {
            endpoint: '/api/tasks/mine', workload: 'smoke', cached: 'no',
        });
        checkResponse(res, 'my-tasks');
        checkJsonArray(res, 'my-tasks');
    });

    sleep(1);
}
