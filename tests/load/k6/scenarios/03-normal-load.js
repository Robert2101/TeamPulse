/**
 * ══════════════════════════════════════════════════════════════════════════════
 *  03 — NORMAL LOAD TEST
 * ══════════════════════════════════════════════════════════════════════════════
 *  Purpose : Simulate realistic concurrent user activity with ramp-up / down.
 *  Stages  : 0 → 10 VUs (30 s) → 20 VUs (2 min) → 0 (30 s)
 *
 *  Run:
 *    k6 run tests/load/k6/scenarios/03-normal-load.js
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { group, sleep } from 'k6';
import { performSetup } from '../helpers/auth.js';
import { authGet } from '../helpers/http.js';
import { checkResponse, checkJsonArray } from '../helpers/checks.js';
import { NORMAL_THRESHOLDS } from '../config/thresholds.js';
import { randomItem } from '../helpers/data.js';
import {
    projectsListDuration, projectDetailDuration, tasksByProjectDuration,
    dashboardStatsDuration, myTasksDuration, commentsByTaskDuration,
    activityLogsDuration, checkAuthDuration, cacheReadDuration,
} from '../helpers/metrics.js';

export const options = {
    stages: [
        { duration: '30s',  target: 10 },
        { duration: '2m',   target: 20 },
        { duration: '30s',  target: 0  },
    ],
    thresholds: NORMAL_THRESHOLDS,
};

export function setup() {
    return performSetup();
}

export default function (data) {
    var base = data.baseUrl;
    var tok  = data.token;

    // Simulate a realistic user session: browse projects → drill into one →
    // check tasks → read comments → glance at dashboard.

    group('Browse: auth check', function () {
        var res = authGet(base + '/api/auth/check-auth', tok, {
            endpoint: '/api/auth/check-auth', workload: 'normal', cached: 'yes',
        });
        checkResponse(res, 'check-auth');
        checkAuthDuration.add(res.timings.duration);
        cacheReadDuration.add(res.timings.duration);
    });
    sleep(Math.random() * 1 + 0.5);

    group('Browse: list projects', function () {
        var res = authGet(base + '/api/projects', tok, {
            endpoint: '/api/projects', workload: 'normal', cached: 'yes',
        });
        checkResponse(res, 'list-projects');
        checkJsonArray(res, 'list-projects');
        projectsListDuration.add(res.timings.duration);
        cacheReadDuration.add(res.timings.duration);
    });
    sleep(Math.random() * 1 + 0.5);

    // Pick a random project to drill into
    var pid = randomItem(data.projectIds) || data.projectId;
    if (pid) {
        group('Drill: project detail', function () {
            var res = authGet(base + '/api/projects/' + pid, tok, {
                endpoint: '/api/projects/:id', workload: 'normal', cached: 'yes',
            });
            checkResponse(res, 'project-detail');
            projectDetailDuration.add(res.timings.duration);
            cacheReadDuration.add(res.timings.duration);
        });
        sleep(Math.random() * 1 + 0.5);

        group('Drill: project tasks', function () {
            var res = authGet(base + '/api/tasks/project/' + pid, tok, {
                endpoint: '/api/tasks/project/:projectId', workload: 'normal', cached: 'yes',
            });
            checkResponse(res, 'project-tasks');
            checkJsonArray(res, 'project-tasks');
            tasksByProjectDuration.add(res.timings.duration);
            cacheReadDuration.add(res.timings.duration);
        });
        sleep(Math.random() * 1 + 0.5);

        group('Drill: activity logs', function () {
            var res = authGet(base + '/api/activities/' + pid, tok, {
                endpoint: '/api/activities/:entityId', workload: 'normal', cached: 'yes',
            });
            checkResponse(res, 'activity-logs');
            activityLogsDuration.add(res.timings.duration);
            cacheReadDuration.add(res.timings.duration);
        });
        sleep(Math.random() * 0.5 + 0.3);
    }

    // Check a task's comments
    var tid = randomItem(data.taskIds) || data.taskId;
    if (tid) {
        group('Drill: task comments', function () {
            var res = authGet(base + '/api/comments/task/' + tid, tok, {
                endpoint: '/api/comments/task/:taskId', workload: 'normal', cached: 'no',
            });
            checkResponse(res, 'task-comments');
            checkJsonArray(res, 'task-comments');
            commentsByTaskDuration.add(res.timings.duration);
        });
        sleep(Math.random() * 0.5 + 0.3);
    }

    group('Dashboard stats', function () {
        var res = authGet(base + '/api/tasks/stats', tok, {
            endpoint: '/api/tasks/stats', workload: 'normal', cached: 'yes',
        });
        checkResponse(res, 'dashboard-stats');
        dashboardStatsDuration.add(res.timings.duration);
        cacheReadDuration.add(res.timings.duration);
    });
    sleep(Math.random() * 0.5 + 0.3);

    group('My tasks', function () {
        var res = authGet(base + '/api/tasks/mine', tok, {
            endpoint: '/api/tasks/mine', workload: 'normal', cached: 'no',
        });
        checkResponse(res, 'my-tasks');
        checkJsonArray(res, 'my-tasks');
        myTasksDuration.add(res.timings.duration);
    });

    sleep(Math.random() * 2 + 1); // think time between iterations
}
