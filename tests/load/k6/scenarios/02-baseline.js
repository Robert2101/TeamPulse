/**
 * ══════════════════════════════════════════════════════════════════════════════
 *  02 — BASELINE TEST
 * ══════════════════════════════════════════════════════════════════════════════
 *  Purpose : Establish normal single-user latency for every testable endpoint.
 *            Results form the reference line for all other scenarios.
 *  VUs     : 2
 *  Duration: 1 min
 *
 *  Run:
 *    k6 run tests/load/k6/scenarios/02-baseline.js
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { group, sleep } from 'k6';
import { performSetup } from '../helpers/auth.js';
import { authGet } from '../helpers/http.js';
import { checkResponse, checkJsonArray } from '../helpers/checks.js';
import { BASELINE_THRESHOLDS } from '../config/thresholds.js';
import {
    checkAuthDuration, projectsListDuration, projectDetailDuration,
    tasksByProjectDuration, dashboardStatsDuration, myTasksDuration,
    commentsByTaskDuration, activityLogsDuration, workspaceUsersDuration,
    chatHistoryDuration, filesByEntityDuration, cacheReadDuration,
} from '../helpers/metrics.js';

export const options = {
    scenarios: {
        baseline: {
            executor: 'constant-vus',
            vus: 2,
            duration: '1m',
        },
    },
    thresholds: BASELINE_THRESHOLDS,
};

export function setup() {
    return performSetup();
}

export default function (data) {
    var base = data.baseUrl;
    var tok  = data.token;

    // ── Auth ─────────────────────────────────────────────────────────────────
    group('GET /api/auth/check-auth', function () {
        var res = authGet(base + '/api/auth/check-auth', tok, {
            endpoint: '/api/auth/check-auth', workload: 'baseline', cached: 'yes',
        });
        checkResponse(res, 'check-auth');
        checkAuthDuration.add(res.timings.duration);
        cacheReadDuration.add(res.timings.duration);
    });
    sleep(0.3);

    // ── Projects ─────────────────────────────────────────────────────────────
    group('GET /api/projects', function () {
        var res = authGet(base + '/api/projects', tok, {
            endpoint: '/api/projects', workload: 'baseline', cached: 'yes',
        });
        checkResponse(res, 'list-projects');
        checkJsonArray(res, 'list-projects');
        projectsListDuration.add(res.timings.duration);
        cacheReadDuration.add(res.timings.duration);
    });
    sleep(0.3);

    if (data.projectId) {
        group('GET /api/projects/:id', function () {
            var res = authGet(base + '/api/projects/' + data.projectId, tok, {
                endpoint: '/api/projects/:id', workload: 'baseline', cached: 'yes',
            });
            checkResponse(res, 'get-project');
            projectDetailDuration.add(res.timings.duration);
            cacheReadDuration.add(res.timings.duration);
        });
        sleep(0.3);
    }

    // ── Tasks ────────────────────────────────────────────────────────────────
    group('GET /api/tasks/stats', function () {
        var res = authGet(base + '/api/tasks/stats', tok, {
            endpoint: '/api/tasks/stats', workload: 'baseline', cached: 'yes',
        });
        checkResponse(res, 'dashboard-stats');
        dashboardStatsDuration.add(res.timings.duration);
        cacheReadDuration.add(res.timings.duration);
    });
    sleep(0.3);

    if (data.projectId) {
        group('GET /api/tasks/project/:projectId', function () {
            var res = authGet(base + '/api/tasks/project/' + data.projectId, tok, {
                endpoint: '/api/tasks/project/:projectId', workload: 'baseline', cached: 'yes',
            });
            checkResponse(res, 'tasks-by-project');
            checkJsonArray(res, 'tasks-by-project');
            tasksByProjectDuration.add(res.timings.duration);
            cacheReadDuration.add(res.timings.duration);
        });
        sleep(0.3);
    }

    group('GET /api/tasks/mine', function () {
        var res = authGet(base + '/api/tasks/mine', tok, {
            endpoint: '/api/tasks/mine', workload: 'baseline', cached: 'no',
        });
        checkResponse(res, 'my-tasks');
        checkJsonArray(res, 'my-tasks');
        myTasksDuration.add(res.timings.duration);
    });
    sleep(0.3);

    // ── Comments ─────────────────────────────────────────────────────────────
    if (data.taskId) {
        group('GET /api/comments/task/:taskId', function () {
            var res = authGet(base + '/api/comments/task/' + data.taskId, tok, {
                endpoint: '/api/comments/task/:taskId', workload: 'baseline', cached: 'no',
            });
            checkResponse(res, 'comments-by-task');
            checkJsonArray(res, 'comments-by-task');
            commentsByTaskDuration.add(res.timings.duration);
        });
        sleep(0.3);
    }

    // ── Activities ───────────────────────────────────────────────────────────
    if (data.projectId) {
        group('GET /api/activities/:entityId', function () {
            var res = authGet(base + '/api/activities/' + data.projectId, tok, {
                endpoint: '/api/activities/:entityId', workload: 'baseline', cached: 'yes',
            });
            checkResponse(res, 'activity-logs');
            activityLogsDuration.add(res.timings.duration);
            cacheReadDuration.add(res.timings.duration);
        });
        sleep(0.3);
    }

    // ── Workspace users ──────────────────────────────────────────────────────
    group('GET /api/auth/workspace/users', function () {
        var res = authGet(base + '/api/auth/workspace/users', tok, {
            endpoint: '/api/auth/workspace/users', workload: 'baseline', cached: 'no',
        });
        checkResponse(res, 'workspace-users');
        checkJsonArray(res, 'workspace-users');
        workspaceUsersDuration.add(res.timings.duration);
    });
    sleep(0.3);

    // ── Chatbot history ──────────────────────────────────────────────────────
    group('GET /api/chatbot/history', function () {
        var res = authGet(base + '/api/chatbot/history', tok, {
            endpoint: '/api/chatbot/history', workload: 'baseline', cached: 'no',
        });
        checkResponse(res, 'chat-history');
        chatHistoryDuration.add(res.timings.duration);
    });
    sleep(0.3);

    // ── Files ────────────────────────────────────────────────────────────────
    if (data.taskId) {
        group('GET /api/files?entityType=Task', function () {
            var res = authGet(
                base + '/api/files?entityType=Task&entityId=' + data.taskId,
                tok,
                { endpoint: '/api/files', workload: 'baseline', cached: 'no' }
            );
            checkResponse(res, 'files-by-entity');
            filesByEntityDuration.add(res.timings.duration);
        });
        sleep(0.3);
    }

    sleep(1);
}
