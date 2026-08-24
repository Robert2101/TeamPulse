/**
 * ══════════════════════════════════════════════════════════════════════════════
 *  10 — WRITE-HEAVY TEST
 * ══════════════════════════════════════════════════════════════════════════════
 *  Purpose : Exercise safe write operations under load.
 *  VUs     : 5
 *  Duration: 2 min
 *
 *  ⚠️  WARNING: This test creates real data in the database!
 *       All created records are prefixed with "k6-loadtest-" for easy cleanup.
 *
 *  Manual cleanup (MongoDB shell or Compass):
 *    db.projects.deleteMany({ projectName: /^k6-loadtest-/ })
 *    db.tasks.deleteMany({ taskName: /^k6-loadtest-/ })
 *    db.comments.deleteMany({ commentContent: /^k6-loadtest-/ })
 *    db.activities.deleteMany({ "metadata.source": "k6-loadtest" })
 *
 *  Operations:
 *    1. Create a new project (unique name per iteration)
 *    2. Create a task in that project
 *    3. Add a comment to that task
 *    4. Update existing task status (idempotent, on pre-existing task)
 *
 *  Run:
 *    k6 run tests/load/k6/scenarios/10-write-heavy.js
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { group, sleep } from 'k6';
import { performSetup } from '../helpers/auth.js';
import { authGet, authPost, authPatch } from '../helpers/http.js';
import { checkResponse } from '../helpers/checks.js';
import { WRITE_THRESHOLDS } from '../config/thresholds.js';
import {
    uniqueProjectName, uniqueTaskName, uniqueComment,
    randomProjectPriority, randomTaskPriority, cycleTaskStatus,
} from '../helpers/data.js';
import {
    createProjectDuration, updateTaskDuration, createCommentDuration,
} from '../helpers/metrics.js';

export const options = {
    scenarios: {
        write_heavy: {
            executor: 'constant-vus',
            vus: 5,
            duration: '2m',
        },
    },
    thresholds: WRITE_THRESHOLDS,
};

export function setup() {
    var data = performSetup();
    console.log('\n⚠️  WRITE-HEAVY TEST — Will create data prefixed "k6-loadtest-"');
    console.log('   See cleanup instructions in the test file header.\n');
    return data;
}

export default function (data) {
    var base = data.baseUrl;
    var tok  = data.token;

    // ── 1. Create project ────────────────────────────────────────────────────
    var newProjectId = null;

    group('write: create project', function () {
        var body = {
            projectName: uniqueProjectName(),
            projectDescription: 'k6 load test project — safe to delete',
            priority: randomProjectPriority(),
            projectType: 'Development',
            clientName: 'k6-loadtest',
            startDate: new Date().toISOString(),
        };
        var res = authPost(base + '/api/projects', body, tok, {
            endpoint: '/api/projects', workload: 'write-heavy', cached: 'no',
        });
        var ok = checkResponse(res, 'create-project', 201);
        createProjectDuration.add(res.timings.duration);

        if (ok && res.status === 201) {
            try {
                var json = res.json();
                newProjectId = json.project ? json.project._id : null;
            } catch (e) { /* ignore parse error */ }
        }
    });
    sleep(0.3);

    // ── 2. Create task in new project ────────────────────────────────────────
    var newTaskId = null;

    if (newProjectId) {
        group('write: create task', function () {
            var body = {
                taskName: uniqueTaskName(),
                taskDescription: 'k6 load test task — safe to delete',
                projectReference: newProjectId,
                priority: randomTaskPriority(),
            };
            var res = authPost(base + '/api/tasks', body, tok, {
                endpoint: '/api/tasks', workload: 'write-heavy', cached: 'no',
            });
            var ok = checkResponse(res, 'create-task', 201);

            if (ok && res.status === 201) {
                try {
                    var json = res.json();
                    newTaskId = json.task ? json.task._id : null;
                } catch (e) { /* ignore */ }
            }
        });
        sleep(0.3);
    }

    // ── 3. Add comment to new task ───────────────────────────────────────────
    if (newTaskId) {
        group('write: add comment', function () {
            var res = authPost(
                base + '/api/comments/task/' + newTaskId,
                { commentContent: uniqueComment() },
                tok,
                { endpoint: '/api/comments/task/:taskId', workload: 'write-heavy', cached: 'no' }
            );
            checkResponse(res, 'add-comment', 201);
            createCommentDuration.add(res.timings.duration);
        });
        sleep(0.3);
    }

    // ── 4. Update existing task status (idempotent) ──────────────────────────
    if (data.taskId) {
        group('write: update task status', function () {
            var res = authPatch(
                base + '/api/tasks/' + data.taskId,
                { taskStatus: cycleTaskStatus(__ITER) },
                tok,
                { endpoint: '/api/tasks/:id', workload: 'write-heavy', cached: 'no' }
            );
            checkResponse(res, 'update-task-status');
            updateTaskDuration.add(res.timings.duration);
        });
        sleep(0.3);
    }

    sleep(Math.random() * 1 + 0.5);
}
