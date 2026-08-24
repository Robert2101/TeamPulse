/**
 * ══════════════════════════════════════════════════════════════════════════════
 *  06 — MIXED WORKLOAD TEST
 * ══════════════════════════════════════════════════════════════════════════════
 *  Purpose : Realistic mix of ~80% reads and ~20% writes, simulating a team
 *            actively working in TeamPulse.
 *  VUs     : 15
 *  Duration: 3 min
 *
 *  Write operations (safe / non-destructive):
 *    • PATCH /api/tasks/:id  — cycle task status (idempotent)
 *    • POST  /api/comments/task/:taskId — add comment (accumulates, cleanup manual)
 *
 *  Run:
 *    k6 run tests/load/k6/scenarios/06-mixed-workload.js
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { group, sleep } from 'k6';
import { performSetup } from '../helpers/auth.js';
import { authGet, authPatch, authPost } from '../helpers/http.js';
import { checkResponse, checkJsonArray } from '../helpers/checks.js';
import { MIXED_THRESHOLDS } from '../config/thresholds.js';
import { randomItem, cycleTaskStatus, uniqueComment } from '../helpers/data.js';
import {
    projectsListDuration, projectDetailDuration, tasksByProjectDuration,
    dashboardStatsDuration, myTasksDuration, commentsByTaskDuration,
    activityLogsDuration, checkAuthDuration, updateTaskDuration,
    createCommentDuration, cacheReadDuration,
} from '../helpers/metrics.js';

export const options = {
    scenarios: {
        mixed: {
            executor: 'constant-vus',
            vus: 15,
            duration: '3m',
        },
    },
    thresholds: MIXED_THRESHOLDS,
};

export function setup() {
    return performSetup();
}

export default function (data) {
    var base = data.baseUrl;
    var tok  = data.token;
    var pid  = randomItem(data.projectIds) || data.projectId;
    var tid  = randomItem(data.taskIds) || data.taskId;

    // ── Reads (every iteration) ──────────────────────────────────────────────

    group('read: check-auth', function () {
        var res = authGet(base + '/api/auth/check-auth', tok, {
            endpoint: '/api/auth/check-auth', workload: 'mixed', cached: 'yes',
        });
        checkResponse(res, 'check-auth');
        checkAuthDuration.add(res.timings.duration);
        cacheReadDuration.add(res.timings.duration);
    });
    sleep(0.3);

    group('read: projects', function () {
        var res = authGet(base + '/api/projects', tok, {
            endpoint: '/api/projects', workload: 'mixed', cached: 'yes',
        });
        checkResponse(res, 'projects');
        checkJsonArray(res, 'projects');
        projectsListDuration.add(res.timings.duration);
        cacheReadDuration.add(res.timings.duration);
    });
    sleep(0.3);

    if (pid) {
        group('read: project detail', function () {
            var res = authGet(base + '/api/projects/' + pid, tok, {
                endpoint: '/api/projects/:id', workload: 'mixed', cached: 'yes',
            });
            checkResponse(res, 'project-detail');
            projectDetailDuration.add(res.timings.duration);
            cacheReadDuration.add(res.timings.duration);
        });
        sleep(0.3);

        group('read: project tasks', function () {
            var res = authGet(base + '/api/tasks/project/' + pid, tok, {
                endpoint: '/api/tasks/project/:projectId', workload: 'mixed', cached: 'yes',
            });
            checkResponse(res, 'project-tasks');
            checkJsonArray(res, 'project-tasks');
            tasksByProjectDuration.add(res.timings.duration);
            cacheReadDuration.add(res.timings.duration);
        });
        sleep(0.3);

        group('read: activity', function () {
            var res = authGet(base + '/api/activities/' + pid, tok, {
                endpoint: '/api/activities/:entityId', workload: 'mixed', cached: 'yes',
            });
            checkResponse(res, 'activity');
            activityLogsDuration.add(res.timings.duration);
            cacheReadDuration.add(res.timings.duration);
        });
        sleep(0.3);
    }

    group('read: dashboard', function () {
        var res = authGet(base + '/api/tasks/stats', tok, {
            endpoint: '/api/tasks/stats', workload: 'mixed', cached: 'yes',
        });
        checkResponse(res, 'dashboard');
        dashboardStatsDuration.add(res.timings.duration);
        cacheReadDuration.add(res.timings.duration);
    });
    sleep(0.3);

    group('read: my tasks', function () {
        var res = authGet(base + '/api/tasks/mine', tok, {
            endpoint: '/api/tasks/mine', workload: 'mixed', cached: 'no',
        });
        checkResponse(res, 'my-tasks');
        myTasksDuration.add(res.timings.duration);
    });
    sleep(0.3);

    if (tid) {
        group('read: comments', function () {
            var res = authGet(base + '/api/comments/task/' + tid, tok, {
                endpoint: '/api/comments/task/:taskId', workload: 'mixed', cached: 'no',
            });
            checkResponse(res, 'comments');
            commentsByTaskDuration.add(res.timings.duration);
        });
        sleep(0.3);
    }

    // ── Writes (~20% of iterations) ──────────────────────────────────────────
    if (Math.random() < 0.2) {
        // Update task status (idempotent — cycles through statuses)
        if (tid) {
            group('write: update task status', function () {
                var newStatus = cycleTaskStatus(__ITER);
                var res = authPatch(base + '/api/tasks/' + tid,
                    { taskStatus: newStatus },
                    tok,
                    { endpoint: '/api/tasks/:id', workload: 'mixed-write', cached: 'no' }
                );
                checkResponse(res, 'update-task');
                updateTaskDuration.add(res.timings.duration);
            });
            sleep(0.3);
        }

        // Add a comment (non-destructive but accumulates data)
        if (tid) {
            group('write: add comment', function () {
                var res = authPost(base + '/api/comments/task/' + tid,
                    { commentContent: uniqueComment() },
                    tok,
                    { endpoint: '/api/comments/task/:taskId', workload: 'mixed-write', cached: 'no' }
                );
                checkResponse(res, 'add-comment', 201);
                createCommentDuration.add(res.timings.duration);
            });
            sleep(0.3);
        }
    }

    sleep(Math.random() * 1 + 0.5); // think time
}
