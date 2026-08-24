/**
 * ══════════════════════════════════════════════════════════════════════════════
 *  05 — CACHE READ TEST
 * ══════════════════════════════════════════════════════════════════════════════
 *  Purpose : Target ONLY Redis-backed endpoints to measure cache performance.
 *            Run this scenario with Redis ON, then Redis OFF, and compare
 *            the tp_cache_read_duration metric.
 *  VUs     : 20
 *  Duration: 3 min
 *
 *  Redis-cached endpoints hit by this test (from config/redis.js analysis):
 *    • GET /api/auth/check-auth      — session:user:{userId}        TTL 900s
 *    • GET /api/projects             — projects:list:{ws}:{bucket}  TTL 60s
 *    • GET /api/projects/:id         — project:{ws}:{id}            TTL 90s
 *    • GET /api/tasks/project/:pid   — tasks:project:{pid}          TTL 30s
 *    • GET /api/tasks/stats          — dash:stats:{ws}              TTL 45s
 *    • GET /api/activities/:entityId — activity:{projectId}          TTL 30s
 *
 *  Run:
 *    k6 run tests/load/k6/scenarios/05-cache-read.js
 *
 *  Redis comparison:
 *    # Redis ON  — run with UPSTASH vars in backend .env
 *    k6 run tests/load/k6/scenarios/05-cache-read.js
 *
 *    # Redis OFF — remove UPSTASH vars, restart backend
 *    k6 run tests/load/k6/scenarios/05-cache-read.js
 *
 *    Compare tp_cache_read_duration p50/p90/p95/p99 between runs.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { group, sleep } from 'k6';
import { performSetup } from '../helpers/auth.js';
import { authGet } from '../helpers/http.js';
import { checkResponse } from '../helpers/checks.js';
import { CACHE_READ_THRESHOLDS } from '../config/thresholds.js';
import { randomItem } from '../helpers/data.js';
import {
    checkAuthDuration, projectsListDuration, projectDetailDuration,
    tasksByProjectDuration, dashboardStatsDuration, activityLogsDuration,
    cacheReadDuration,
} from '../helpers/metrics.js';

export const options = {
    scenarios: {
        cache_reads: {
            executor: 'constant-vus',
            vus: 20,
            duration: '3m',
        },
    },
    thresholds: CACHE_READ_THRESHOLDS,
};

export function setup() {
    return performSetup();
}

export default function (data) {
    var base = data.baseUrl;
    var tok  = data.token;
    var pid  = randomItem(data.projectIds) || data.projectId;

    // ── 1. Session cache (900s TTL) ──────────────────────────────────────────
    group('cache: check-auth', function () {
        var res = authGet(base + '/api/auth/check-auth', tok, {
            endpoint: '/api/auth/check-auth', workload: 'cache-read', cached: 'yes',
        });
        checkResponse(res, 'check-auth');
        checkAuthDuration.add(res.timings.duration);
        cacheReadDuration.add(res.timings.duration);
    });
    sleep(0.1);

    // ── 2. Projects list cache (60s TTL) ─────────────────────────────────────
    group('cache: projects list', function () {
        var res = authGet(base + '/api/projects', tok, {
            endpoint: '/api/projects', workload: 'cache-read', cached: 'yes',
        });
        checkResponse(res, 'projects-list');
        projectsListDuration.add(res.timings.duration);
        cacheReadDuration.add(res.timings.duration);
    });
    sleep(0.1);

    // ── 3. Project detail cache (90s TTL) ────────────────────────────────────
    if (pid) {
        group('cache: project detail', function () {
            var res = authGet(base + '/api/projects/' + pid, tok, {
                endpoint: '/api/projects/:id', workload: 'cache-read', cached: 'yes',
            });
            checkResponse(res, 'project-detail');
            projectDetailDuration.add(res.timings.duration);
            cacheReadDuration.add(res.timings.duration);
        });
        sleep(0.1);

        // ── 4. Tasks by project cache (30s TTL) ─────────────────────────────
        group('cache: tasks by project', function () {
            var res = authGet(base + '/api/tasks/project/' + pid, tok, {
                endpoint: '/api/tasks/project/:projectId', workload: 'cache-read', cached: 'yes',
            });
            checkResponse(res, 'tasks-by-project');
            tasksByProjectDuration.add(res.timings.duration);
            cacheReadDuration.add(res.timings.duration);
        });
        sleep(0.1);

        // ── 5. Activity logs cache (30s TTL) ────────────────────────────────
        group('cache: activity logs', function () {
            var res = authGet(base + '/api/activities/' + pid, tok, {
                endpoint: '/api/activities/:entityId', workload: 'cache-read', cached: 'yes',
            });
            checkResponse(res, 'activity-logs');
            activityLogsDuration.add(res.timings.duration);
            cacheReadDuration.add(res.timings.duration);
        });
        sleep(0.1);
    }

    // ── 6. Dashboard stats cache (45s TTL) ───────────────────────────────────
    group('cache: dashboard stats', function () {
        var res = authGet(base + '/api/tasks/stats', tok, {
            endpoint: '/api/tasks/stats', workload: 'cache-read', cached: 'yes',
        });
        checkResponse(res, 'dashboard-stats');
        dashboardStatsDuration.add(res.timings.duration);
        cacheReadDuration.add(res.timings.duration);
    });

    sleep(Math.random() * 0.3 + 0.2); // minimal think time to maximise cache hits
}
