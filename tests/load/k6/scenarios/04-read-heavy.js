/**
 * ══════════════════════════════════════════════════════════════════════════════
 *  04 — READ-HEAVY TEST
 * ══════════════════════════════════════════════════════════════════════════════
 *  Purpose : Sustained read pressure on ALL GET endpoints (cached + uncached).
 *            No writes — pure read throughput measurement.
 *  VUs     : 20
 *  Duration: 3 min
 *
 *  Run:
 *    k6 run tests/load/k6/scenarios/04-read-heavy.js
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { group, sleep } from 'k6';
import { performSetup } from '../helpers/auth.js';
import { authGet } from '../helpers/http.js';
import { checkResponse, checkJsonArray } from '../helpers/checks.js';
import { READ_HEAVY_THRESHOLDS } from '../config/thresholds.js';
import { randomItem } from '../helpers/data.js';
import {
    checkAuthDuration, projectsListDuration, projectDetailDuration,
    tasksByProjectDuration, dashboardStatsDuration, myTasksDuration,
    commentsByTaskDuration, activityLogsDuration, workspaceUsersDuration,
    chatHistoryDuration, cacheReadDuration,
} from '../helpers/metrics.js';

export const options = {
    scenarios: {
        read_heavy: {
            executor: 'constant-vus',
            vus: 20,
            duration: '3m',
        },
    },
    thresholds: READ_HEAVY_THRESHOLDS,
};

export function setup() {
    return performSetup();
}

export default function (data) {
    var base = data.baseUrl;
    var tok  = data.token;
    var pid  = randomItem(data.projectIds) || data.projectId;
    var tid  = randomItem(data.taskIds) || data.taskId;

    // ── Cached endpoints (Redis-backed) ──────────────────────────────────────

    group('check-auth', function () {
        var res = authGet(base + '/api/auth/check-auth', tok, {
            endpoint: '/api/auth/check-auth', workload: 'read-heavy', cached: 'yes',
        });
        checkResponse(res, 'check-auth');
        checkAuthDuration.add(res.timings.duration);
        cacheReadDuration.add(res.timings.duration);
    });
    sleep(0.2);

    group('list-projects', function () {
        var res = authGet(base + '/api/projects', tok, {
            endpoint: '/api/projects', workload: 'read-heavy', cached: 'yes',
        });
        checkResponse(res, 'list-projects');
        checkJsonArray(res, 'list-projects');
        projectsListDuration.add(res.timings.duration);
        cacheReadDuration.add(res.timings.duration);
    });
    sleep(0.2);

    if (pid) {
        group('project-detail', function () {
            var res = authGet(base + '/api/projects/' + pid, tok, {
                endpoint: '/api/projects/:id', workload: 'read-heavy', cached: 'yes',
            });
            checkResponse(res, 'project-detail');
            projectDetailDuration.add(res.timings.duration);
            cacheReadDuration.add(res.timings.duration);
        });
        sleep(0.2);

        group('tasks-by-project', function () {
            var res = authGet(base + '/api/tasks/project/' + pid, tok, {
                endpoint: '/api/tasks/project/:projectId', workload: 'read-heavy', cached: 'yes',
            });
            checkResponse(res, 'tasks-by-project');
            checkJsonArray(res, 'tasks-by-project');
            tasksByProjectDuration.add(res.timings.duration);
            cacheReadDuration.add(res.timings.duration);
        });
        sleep(0.2);

        group('activity-logs', function () {
            var res = authGet(base + '/api/activities/' + pid, tok, {
                endpoint: '/api/activities/:entityId', workload: 'read-heavy', cached: 'yes',
            });
            checkResponse(res, 'activity-logs');
            activityLogsDuration.add(res.timings.duration);
            cacheReadDuration.add(res.timings.duration);
        });
        sleep(0.2);
    }

    group('dashboard-stats', function () {
        var res = authGet(base + '/api/tasks/stats', tok, {
            endpoint: '/api/tasks/stats', workload: 'read-heavy', cached: 'yes',
        });
        checkResponse(res, 'dashboard-stats');
        dashboardStatsDuration.add(res.timings.duration);
        cacheReadDuration.add(res.timings.duration);
    });
    sleep(0.2);

    // ── Uncached endpoints ───────────────────────────────────────────────────

    group('my-tasks', function () {
        var res = authGet(base + '/api/tasks/mine', tok, {
            endpoint: '/api/tasks/mine', workload: 'read-heavy', cached: 'no',
        });
        checkResponse(res, 'my-tasks');
        checkJsonArray(res, 'my-tasks');
        myTasksDuration.add(res.timings.duration);
    });
    sleep(0.2);

    if (tid) {
        group('comments-by-task', function () {
            var res = authGet(base + '/api/comments/task/' + tid, tok, {
                endpoint: '/api/comments/task/:taskId', workload: 'read-heavy', cached: 'no',
            });
            checkResponse(res, 'comments-by-task');
            checkJsonArray(res, 'comments-by-task');
            commentsByTaskDuration.add(res.timings.duration);
        });
        sleep(0.2);

        // NOTE: GET /api/files is excluded from read-heavy tests because it is
        // rate-limited at 100 requests per 15 minutes per IP (fileReadLimiter).
        // 20 VUs exhaust this limit in ~25 seconds, causing 429 failures.
        // The baseline test (02) covers this endpoint at safe VU levels.
    }

    group('workspace-users', function () {
        var res = authGet(base + '/api/auth/workspace/users', tok, {
            endpoint: '/api/auth/workspace/users', workload: 'read-heavy', cached: 'no',
        });
        checkResponse(res, 'workspace-users');
        checkJsonArray(res, 'workspace-users');
        workspaceUsersDuration.add(res.timings.duration);
    });
    sleep(0.2);

    group('chat-history', function () {
        var res = authGet(base + '/api/chatbot/history', tok, {
            endpoint: '/api/chatbot/history', workload: 'read-heavy', cached: 'no',
        });
        checkResponse(res, 'chat-history');
        chatHistoryDuration.add(res.timings.duration);
    });

    sleep(Math.random() * 0.5 + 0.5);
}
