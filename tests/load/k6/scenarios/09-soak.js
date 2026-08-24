/**
 * ══════════════════════════════════════════════════════════════════════════════
 *  09 — SOAK / ENDURANCE TEST
 * ══════════════════════════════════════════════════════════════════════════════
 *  Purpose : Sustained moderate load for an extended period to detect:
 *            • Memory leaks
 *            • Connection pool exhaustion
 *            • Gradual latency creep
 *            • MongoDB cursor leaks
 *            • Redis connection issues
 *  VUs     : 10
 *  Duration: 15 min (configurable — increase for production soak tests)
 *
 *  Run:
 *    k6 run tests/load/k6/scenarios/09-soak.js
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { group, sleep } from 'k6';
import { performSetup } from '../helpers/auth.js';
import { authGet } from '../helpers/http.js';
import { checkResponse, checkJsonArray } from '../helpers/checks.js';
import { SOAK_THRESHOLDS } from '../config/thresholds.js';
import { randomItem } from '../helpers/data.js';
import {
    projectsListDuration, projectDetailDuration, tasksByProjectDuration,
    dashboardStatsDuration, myTasksDuration, commentsByTaskDuration,
    activityLogsDuration, checkAuthDuration, cacheReadDuration,
    workspaceUsersDuration,
} from '../helpers/metrics.js';

export const options = {
    scenarios: {
        soak: {
            executor: 'constant-vus',
            vus: 10,
            duration: '15m',
        },
    },
    thresholds: SOAK_THRESHOLDS,
};

export function setup() {
    return performSetup();
}

export default function (data) {
    var base = data.baseUrl;
    var tok  = data.token;
    var pid  = randomItem(data.projectIds) || data.projectId;
    var tid  = randomItem(data.taskIds) || data.taskId;

    // Full user workflow — simulates a real session over extended time.

    group('soak: check-auth', function () {
        var res = authGet(base + '/api/auth/check-auth', tok, {
            endpoint: '/api/auth/check-auth', workload: 'soak', cached: 'yes',
        });
        checkResponse(res, 'check-auth');
        checkAuthDuration.add(res.timings.duration);
        cacheReadDuration.add(res.timings.duration);
    });
    sleep(0.5);

    group('soak: projects', function () {
        var res = authGet(base + '/api/projects', tok, {
            endpoint: '/api/projects', workload: 'soak', cached: 'yes',
        });
        checkResponse(res, 'projects');
        checkJsonArray(res, 'projects');
        projectsListDuration.add(res.timings.duration);
        cacheReadDuration.add(res.timings.duration);
    });
    sleep(0.5);

    if (pid) {
        group('soak: project detail', function () {
            var res = authGet(base + '/api/projects/' + pid, tok, {
                endpoint: '/api/projects/:id', workload: 'soak', cached: 'yes',
            });
            checkResponse(res, 'project-detail');
            projectDetailDuration.add(res.timings.duration);
            cacheReadDuration.add(res.timings.duration);
        });
        sleep(0.5);

        group('soak: tasks', function () {
            var res = authGet(base + '/api/tasks/project/' + pid, tok, {
                endpoint: '/api/tasks/project/:projectId', workload: 'soak', cached: 'yes',
            });
            checkResponse(res, 'tasks');
            checkJsonArray(res, 'tasks');
            tasksByProjectDuration.add(res.timings.duration);
            cacheReadDuration.add(res.timings.duration);
        });
        sleep(0.5);

        group('soak: activity', function () {
            var res = authGet(base + '/api/activities/' + pid, tok, {
                endpoint: '/api/activities/:entityId', workload: 'soak', cached: 'yes',
            });
            checkResponse(res, 'activity');
            activityLogsDuration.add(res.timings.duration);
            cacheReadDuration.add(res.timings.duration);
        });
        sleep(0.5);
    }

    group('soak: dashboard', function () {
        var res = authGet(base + '/api/tasks/stats', tok, {
            endpoint: '/api/tasks/stats', workload: 'soak', cached: 'yes',
        });
        checkResponse(res, 'dashboard');
        dashboardStatsDuration.add(res.timings.duration);
        cacheReadDuration.add(res.timings.duration);
    });
    sleep(0.5);

    group('soak: my tasks', function () {
        var res = authGet(base + '/api/tasks/mine', tok, {
            endpoint: '/api/tasks/mine', workload: 'soak', cached: 'no',
        });
        checkResponse(res, 'my-tasks');
        myTasksDuration.add(res.timings.duration);
    });
    sleep(0.5);

    if (tid) {
        group('soak: comments', function () {
            var res = authGet(base + '/api/comments/task/' + tid, tok, {
                endpoint: '/api/comments/task/:taskId', workload: 'soak', cached: 'no',
            });
            checkResponse(res, 'comments');
            commentsByTaskDuration.add(res.timings.duration);
        });
        sleep(0.5);
    }

    // Every ~5th iteration, also check workspace users and files
    if (__ITER % 5 === 0) {
        group('soak: workspace users', function () {
            var res = authGet(base + '/api/auth/workspace/users', tok, {
                endpoint: '/api/auth/workspace/users', workload: 'soak', cached: 'no',
            });
            checkResponse(res, 'workspace-users');
            workspaceUsersDuration.add(res.timings.duration);
        });
        sleep(0.3);
    }

    sleep(Math.random() * 2 + 1); // realistic inter-session think time
}
