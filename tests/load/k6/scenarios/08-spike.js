/**
 * ══════════════════════════════════════════════════════════════════════════════
 *  08 — SPIKE TEST
 * ══════════════════════════════════════════════════════════════════════════════
 *  Purpose : Sudden burst of traffic followed by observation of recovery.
 *  Stages  : 5 VUs (30 s) → 50 VUs instantly (10 s ramp) → hold 1 min →
 *            drop to 5 → recover 1 min → 0.
 *
 *  Run:
 *    k6 run tests/load/k6/scenarios/08-spike.js
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { group, sleep } from 'k6';
import { performSetup } from '../helpers/auth.js';
import { authGet } from '../helpers/http.js';
import { checkResponse, checkJsonArray } from '../helpers/checks.js';
import { SPIKE_THRESHOLDS } from '../config/thresholds.js';
import { randomItem } from '../helpers/data.js';
import {
    projectsListDuration, tasksByProjectDuration, dashboardStatsDuration,
    checkAuthDuration, cacheReadDuration,
} from '../helpers/metrics.js';

export const options = {
    stages: [
        { duration: '30s', target: 5  },   // warm-up
        { duration: '10s', target: 50 },   // spike!
        { duration: '1m',  target: 50 },   // hold spike
        { duration: '10s', target: 5  },   // rapid drop
        { duration: '1m',  target: 5  },   // recovery observation
        { duration: '20s', target: 0  },   // cool-down
    ],
    thresholds: SPIKE_THRESHOLDS,
};

export function setup() {
    return performSetup();
}

export default function (data) {
    var base = data.baseUrl;
    var tok  = data.token;
    var pid  = randomItem(data.projectIds) || data.projectId;

    group('spike: check-auth', function () {
        var res = authGet(base + '/api/auth/check-auth', tok, {
            endpoint: '/api/auth/check-auth', workload: 'spike', cached: 'yes',
        });
        checkResponse(res, 'check-auth');
        checkAuthDuration.add(res.timings.duration);
        cacheReadDuration.add(res.timings.duration);
    });
    sleep(0.1);

    group('spike: projects', function () {
        var res = authGet(base + '/api/projects', tok, {
            endpoint: '/api/projects', workload: 'spike', cached: 'yes',
        });
        checkResponse(res, 'projects');
        checkJsonArray(res, 'projects');
        projectsListDuration.add(res.timings.duration);
        cacheReadDuration.add(res.timings.duration);
    });
    sleep(0.1);

    group('spike: dashboard', function () {
        var res = authGet(base + '/api/tasks/stats', tok, {
            endpoint: '/api/tasks/stats', workload: 'spike', cached: 'yes',
        });
        checkResponse(res, 'dashboard');
        dashboardStatsDuration.add(res.timings.duration);
        cacheReadDuration.add(res.timings.duration);
    });
    sleep(0.1);

    if (pid) {
        group('spike: tasks', function () {
            var res = authGet(base + '/api/tasks/project/' + pid, tok, {
                endpoint: '/api/tasks/project/:projectId', workload: 'spike', cached: 'yes',
            });
            checkResponse(res, 'tasks');
            tasksByProjectDuration.add(res.timings.duration);
            cacheReadDuration.add(res.timings.duration);
        });
        sleep(0.1);
    }

    group('spike: my tasks', function () {
        var res = authGet(base + '/api/tasks/mine', tok, {
            endpoint: '/api/tasks/mine', workload: 'spike', cached: 'no',
        });
        checkResponse(res, 'my-tasks');
    });

    sleep(Math.random() * 0.3 + 0.2);
}
