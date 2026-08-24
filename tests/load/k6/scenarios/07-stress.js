/**
 * ══════════════════════════════════════════════════════════════════════════════
 *  07 — STRESS TEST
 * ══════════════════════════════════════════════════════════════════════════════
 *  Purpose : Progressively increase VUs until the system degrades.
 *            Identify the breaking point and observe error rates / latency.
 *  Stages  : 0 → 10 → 30 → 50 → 80 → 0 VUs
 *
 *  Run:
 *    k6 run tests/load/k6/scenarios/07-stress.js
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { group, sleep } from 'k6';
import { performSetup } from '../helpers/auth.js';
import { authGet } from '../helpers/http.js';
import { checkResponse, checkJsonArray } from '../helpers/checks.js';
import { STRESS_THRESHOLDS } from '../config/thresholds.js';
import { randomItem } from '../helpers/data.js';
import {
    projectsListDuration, tasksByProjectDuration, dashboardStatsDuration,
    checkAuthDuration, cacheReadDuration,
} from '../helpers/metrics.js';

export const options = {
    stages: [
        { duration: '1m',  target: 10 },
        { duration: '2m',  target: 30 },
        { duration: '2m',  target: 50 },
        { duration: '1m',  target: 80 },
        { duration: '2m',  target: 0  },
    ],
    thresholds: STRESS_THRESHOLDS,
};

export function setup() {
    return performSetup();
}

export default function (data) {
    var base = data.baseUrl;
    var tok  = data.token;
    var pid  = randomItem(data.projectIds) || data.projectId;

    // High-frequency mix of the most common endpoints.

    group('stress: check-auth', function () {
        var res = authGet(base + '/api/auth/check-auth', tok, {
            endpoint: '/api/auth/check-auth', workload: 'stress', cached: 'yes',
        });
        checkResponse(res, 'check-auth');
        checkAuthDuration.add(res.timings.duration);
        cacheReadDuration.add(res.timings.duration);
    });
    sleep(0.1);

    group('stress: projects', function () {
        var res = authGet(base + '/api/projects', tok, {
            endpoint: '/api/projects', workload: 'stress', cached: 'yes',
        });
        checkResponse(res, 'projects');
        projectsListDuration.add(res.timings.duration);
        cacheReadDuration.add(res.timings.duration);
    });
    sleep(0.1);

    if (pid) {
        group('stress: tasks', function () {
            var res = authGet(base + '/api/tasks/project/' + pid, tok, {
                endpoint: '/api/tasks/project/:projectId', workload: 'stress', cached: 'yes',
            });
            checkResponse(res, 'tasks');
            tasksByProjectDuration.add(res.timings.duration);
            cacheReadDuration.add(res.timings.duration);
        });
        sleep(0.1);
    }

    group('stress: dashboard', function () {
        var res = authGet(base + '/api/tasks/stats', tok, {
            endpoint: '/api/tasks/stats', workload: 'stress', cached: 'yes',
        });
        checkResponse(res, 'dashboard');
        dashboardStatsDuration.add(res.timings.duration);
        cacheReadDuration.add(res.timings.duration);
    });
    sleep(0.1);

    group('stress: my tasks', function () {
        var res = authGet(base + '/api/tasks/mine', tok, {
            endpoint: '/api/tasks/mine', workload: 'stress', cached: 'no',
        });
        checkResponse(res, 'my-tasks');
    });

    sleep(Math.random() * 0.5 + 0.2);
}
