# TeamPulse k6 Load-Testing Suite

A comprehensive load-testing suite for the TeamPulse project management platform, built with [k6](https://k6.io/) by Grafana Labs.

---

## Table of Contents

1. [What is k6?](#what-is-k6)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Environment Variables](#environment-variables)
5. [Authentication](#authentication)
6. [Test Scenarios](#test-scenarios)
7. [Running Each Scenario](#running-each-scenario)
8. [Redis ON vs OFF Comparison](#redis-on-vs-off-comparison)
9. [Understanding Results](#understanding-results)
10. [Interpreting Percentiles](#interpreting-percentiles)
11. [Identifying Bottlenecks](#identifying-bottlenecks)
12. [Custom Metrics](#custom-metrics)
13. [Exporting Results](#exporting-results)
14. [Write Test Safety](#write-test-safety)
15. [Avoiding Production Testing](#avoiding-production-testing)
16. [What Constitutes a Failed Test](#what-constitutes-a-failed-test)
17. [Directory Structure](#directory-structure)

---

## What is k6?

k6 is an open-source load testing tool designed for performance testing APIs, microservices, and websites. It runs locally, uses JavaScript for test scripts, and produces detailed metrics including request rate, latency percentiles (P50/P90/P95/P99), error rates, and custom business metrics.

k6 does **not** use Node.js — it has its own optimised Go-based JavaScript runtime.

---

## Installation

k6 is already installed via Homebrew. If you need to reinstall:

```bash
brew install k6
k6 version
```

---

## Quick Start

```bash
# 1. Ensure TeamPulse backend is running
cd backend && npm run dev

# 2. Ensure the database is seeded
node seed.js

# 3. Run the smoke test (from the project root)
k6 run tests/load/k6/scenarios/01-smoke.js
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `BASE_URL` | `http://localhost:5001` | TeamPulse backend URL |
| `TEST_USER_EMAIL` | `tony@stark.com` | Login email (from seed data) |
| `TEST_USER_PASSWORD` | `password123` | Login password (from seed data) |
| `PROJECT_ID` | *(auto-discovered)* | MongoDB ObjectId of a test project |
| `TASK_ID` | *(auto-discovered)* | MongoDB ObjectId of a test task |
| `COMMENT_ID` | *(auto-discovered)* | MongoDB ObjectId of a test comment |

**Setting variables:**

```bash
# Option A: Inline with -e flag
k6 run -e BASE_URL=http://localhost:5001 tests/load/k6/scenarios/01-smoke.js

# Option B: Source the env file
cp tests/load/k6/config/env.sh.example tests/load/k6/config/env.sh
# Edit env.sh with your values
source tests/load/k6/config/env.sh
k6 run tests/load/k6/scenarios/01-smoke.js
```

If `PROJECT_ID`, `TASK_ID`, and `COMMENT_ID` are not set, the setup function automatically discovers them by querying the API.

---

## Authentication

TeamPulse uses **JWT tokens stored in HTTP-only cookies**. The test suite handles this automatically:

1. **`setup()`** runs **once** before the test — it calls `POST /api/auth/login` with the configured credentials.
2. The JWT `token` cookie is extracted from the login response.
3. The token string is passed to all VUs via the setup return value.
4. Every request includes a `Cookie: token=<jwt>` header.

**Login is never called during load iterations.** This avoids hitting the rate limit (10 requests / 15 minutes per IP).

---

## Test Scenarios

| # | Scenario | File | VUs | Duration | What it Measures |
|---|---|---|---|---|---|
| 01 | **Smoke** | `01-smoke.js` | 1 | 30 s | Infrastructure works, endpoints reachable |
| 02 | **Baseline** | `02-baseline.js` | 2 | 1 min | Single-user latency for every endpoint |
| 03 | **Normal Load** | `03-normal-load.js` | 10→20→0 | 3 min | Realistic concurrent user browsing |
| 04 | **Read-Heavy** | `04-read-heavy.js` | 20 | 3 min | All GET endpoints under sustained read pressure |
| 05 | **Cache Read** | `05-cache-read.js` | 20 | 3 min | Redis-backed endpoints only (for ON/OFF comparison) |
| 06 | **Mixed Workload** | `06-mixed-workload.js` | 15 | 3 min | 80% reads / 20% writes |
| 07 | **Stress** | `07-stress.js` | 0→80→0 | 8 min | Find the breaking point |
| 08 | **Spike** | `08-spike.js` | 5→50→5→0 | 3 min | Sudden traffic burst + recovery |
| 09 | **Soak** | `09-soak.js` | 10 | 15 min | Memory leaks, connection exhaustion, latency creep |
| 10 | **Write-Heavy** | `10-write-heavy.js` | 5 | 2 min | Project/task/comment creation under load |
| 11 | **Error Resilience** | `11-error-resilience.js` | 5 | 1 min | Correct 401/404/400 responses |

---

## Running Each Scenario

All commands are run from the **project root** (`TeamPulse/`).

```bash
# 01 — Smoke Test
k6 run tests/load/k6/scenarios/01-smoke.js

# 02 — Baseline
k6 run tests/load/k6/scenarios/02-baseline.js

# 03 — Normal Load
k6 run tests/load/k6/scenarios/03-normal-load.js

# 04 — Read-Heavy
k6 run tests/load/k6/scenarios/04-read-heavy.js

# 05 — Cache Read (run with Redis ON, then OFF, compare)
k6 run tests/load/k6/scenarios/05-cache-read.js

# 06 — Mixed Workload
k6 run tests/load/k6/scenarios/06-mixed-workload.js

# 07 — Stress Test
k6 run tests/load/k6/scenarios/07-stress.js

# 08 — Spike Test
k6 run tests/load/k6/scenarios/08-spike.js

# 09 — Soak Test (15 min — run when you have time)
k6 run tests/load/k6/scenarios/09-soak.js

# 10 — Write-Heavy (⚠️ creates data — see cleanup instructions below)
k6 run tests/load/k6/scenarios/10-write-heavy.js

# 11 — Error Resilience
k6 run tests/load/k6/scenarios/11-error-resilience.js
```

### With Web Dashboard (real-time browser UI)

```bash
K6_WEB_DASHBOARD=true k6 run tests/load/k6/scenarios/01-smoke.js
# Opens http://localhost:5665 with live metrics
```

### Export dashboard to HTML

```bash
K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=tests/load/k6/results/report.html \
  k6 run tests/load/k6/scenarios/03-normal-load.js
```

---

## Redis ON vs OFF Comparison

TeamPulse uses Upstash Redis with **fail-open** behaviour. If Redis credentials are not configured, the application silently bypasses all caching and rate limiting. This makes A/B testing trivial:

### Step 1: Run with Redis ON

Ensure `backend/.env` contains valid Upstash credentials:

```
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

Restart the backend, then run:

```bash
K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=tests/load/k6/results/cache-ON.html \
  k6 run tests/load/k6/scenarios/05-cache-read.js
```

### Step 2: Run with Redis OFF

Comment out or remove the Upstash variables from `backend/.env`:

```
# UPSTASH_REDIS_REST_URL=...
# UPSTASH_REDIS_REST_TOKEN=...
```

Restart the backend, then run:

```bash
K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=tests/load/k6/results/cache-OFF.html \
  k6 run tests/load/k6/scenarios/05-cache-read.js
```

### Step 3: Compare

Compare these metrics between the two runs:

| Metric | What to Compare |
|---|---|
| `tp_cache_read_duration` p50/p90/p95 | Lower with Redis ON = caching helps |
| `http_req_duration` p50/p90/p95 | Overall latency improvement |
| `http_reqs` (total count) | Higher with Redis ON = higher throughput |
| `http_req_failed` | Should be similar (fail-open design) |
| Per-endpoint trends | `tp_projects_list_duration`, `tp_tasks_by_project_duration`, etc. |

**Interpretation:**
- If `tp_cache_read_duration` P90 is **significantly lower** with Redis ON, caching is providing a real benefit.
- If the difference is minimal, the MongoDB queries may already be fast enough that caching adds negligible value.
- Watch for **P99** differences — caching helps most with tail latency.

---

## Understanding Results

k6 outputs a summary table after each run. Key metrics:

| Metric | Description |
|---|---|
| `http_reqs` | Total HTTP requests made |
| `http_req_duration` | Request latency (avg, min, med, max, p90, p95) |
| `http_req_failed` | Percentage of failed requests (non-2xx) |
| `http_req_blocked` | Time spent waiting for a free TCP connection |
| `http_req_connecting` | Time spent establishing the TCP connection |
| `http_req_waiting` | Time spent waiting for server response (TTFB) |
| `http_req_receiving` | Time spent receiving the response body |
| `data_received` | Total bytes received |
| `data_sent` | Total bytes sent |
| `vus` | Active virtual users at any point |
| `iterations` | Total completed iterations |
| `checks` | Number and pass rate of assertions |

---

## Interpreting Percentiles

| Percentile | Meaning |
|---|---|
| **P50 (median)** | 50% of requests completed within this time. Your "typical" user experience. |
| **P90** | 90% of requests completed within this time. The experience for most users. |
| **P95** | 95% of requests were this fast or better. Industry standard SLA target. |
| **P99** | Only 1% of requests were slower. Reveals worst-case tail latency. |
| **Max** | The single slowest request. Useful for finding outliers. |

**Rules of thumb:**
- P50 ≈ normal UX. If this is slow, your average user is suffering.
- P90 is the best single number for SLAs.
- Large gap between P90 and P99 → inconsistent performance (likely due to cache misses, GC pauses, or cold MongoDB queries).
- P99 > 5× P50 → investigate tail latency causes.

---

## Identifying Bottlenecks

1. **High `http_req_waiting`** → Server is slow to process. Look at MongoDB queries, Redis calls, or CPU-bound code.
2. **High `http_req_blocked`** → Connection pool exhaustion. Increase server's max connections or add connection pooling.
3. **High `http_req_connecting`** → TCP handshake overhead. Check if keep-alive is working.
4. **Increasing latency during soak test** → Memory leak or connection leak. Monitor server memory with `top` or `htop`.
5. **Per-endpoint trends diverge** → Specific endpoints are bottlenecks. Use `tp_*_duration` custom metrics to identify them.
6. **Error rate spikes at specific VU count** → You've found the server's concurrency limit.

### Monitor Server Resources Simultaneously

While running k6, open another terminal:

```bash
# CPU and memory
top -pid $(pgrep -f "node server.js")

# Or with htop
htop

# MongoDB operations (if using local MongoDB)
mongosh --eval "db.currentOp()"
```

---

## Custom Metrics

The suite tracks TeamPulse-specific metrics prefixed with `tp_`:

### Counters
- `tp_successful_requests` — Total successful responses
- `tp_failed_requests` — Total unexpected failures

### Rates
- `tp_business_success_rate` — Success rate across all business operations

### Trends (per-endpoint latency in ms)
| Metric | Endpoint | Redis Cached |
|---|---|---|
| `tp_check_auth_duration` | `GET /api/auth/check-auth` | ✅ |
| `tp_projects_list_duration` | `GET /api/projects` | ✅ |
| `tp_project_detail_duration` | `GET /api/projects/:id` | ✅ |
| `tp_tasks_by_project_duration` | `GET /api/tasks/project/:pid` | ✅ |
| `tp_dashboard_stats_duration` | `GET /api/tasks/stats` | ✅ |
| `tp_activity_logs_duration` | `GET /api/activities/:entityId` | ✅ |
| `tp_my_tasks_duration` | `GET /api/tasks/mine` | ❌ |
| `tp_comments_by_task_duration` | `GET /api/comments/task/:tid` | ❌ |
| `tp_workspace_users_duration` | `GET /api/auth/workspace/users` | ❌ |
| `tp_chat_history_duration` | `GET /api/chatbot/history` | ❌ |
| `tp_files_by_entity_duration` | `GET /api/files?entityType=...` | ❌ |
| `tp_create_project_duration` | `POST /api/projects` | — |
| `tp_update_task_duration` | `PATCH /api/tasks/:id` | — |
| `tp_create_comment_duration` | `POST /api/comments/task/:tid` | — |
| `tp_cache_read_duration` | *Aggregate of all cached reads* | ✅ |

### Tags on Every Request

| Tag | Values | Purpose |
|---|---|---|
| `endpoint` | `/api/projects`, `/api/tasks/:id`, etc. | Filter by API endpoint |
| `workload` | `smoke`, `baseline`, `normal`, `stress`, etc. | Filter by scenario |
| `cached` | `yes`, `no` | Compare cached vs uncached endpoints |

---

## Exporting Results

### JSON output

```bash
k6 run --out json=tests/load/k6/results/smoke.json tests/load/k6/scenarios/01-smoke.js
```

### CSV output

```bash
k6 run --out csv=tests/load/k6/results/smoke.csv tests/load/k6/scenarios/01-smoke.js
```

### Web Dashboard HTML export

```bash
K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=tests/load/k6/results/report.html \
  k6 run tests/load/k6/scenarios/01-smoke.js
```

### Combine dashboard + JSON

```bash
K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=tests/load/k6/results/normal.html \
  k6 run --out json=tests/load/k6/results/normal.json tests/load/k6/scenarios/03-normal-load.js
```

---

## Write Test Safety

**Scenario 10 (write-heavy)** and **Scenario 06 (mixed workload)** create real data in your database.

All created data is prefixed with `k6-loadtest-` for easy identification and cleanup.

### Manual Cleanup (MongoDB shell)

```javascript
db.projects.deleteMany({ projectName: /^k6-loadtest-/ })
db.tasks.deleteMany({ taskName: /^k6-loadtest-/ })
db.comments.deleteMany({ commentContent: /^k6-loadtest-/ })
db.activities.deleteMany({ "metadata.source": "k6-loadtest" })
```

### Best Practice

Run write tests against a **disposable test database**:

```bash
# Start backend with a separate database
MONGO_URI=mongodb://localhost:27017/teampulse_loadtest npm run dev
```

---

## Avoiding Production Testing

> [!CAUTION]
> **Never point `BASE_URL` at a production server** without understanding the consequences.

- Write tests create real data
- Stress/spike tests can overwhelm a server
- Rate limits may lock out real users
- The default `BASE_URL` is `http://localhost:5001` — always verify before running

---

## What Constitutes a Failed Test

A k6 test **fails** when any threshold is breached. The exit code will be non-zero.

| Scenario | Primary Failure Indicators |
|---|---|
| Smoke | Any endpoint returns non-200, or >1% error rate |
| Baseline | P95 latency > 2s, or >1% errors |
| Normal Load | P90 > 2s, >5% errors, business success rate < 95% |
| Cache Read | P90 > 800ms (aggregate cache metric), >1% errors |
| Stress | >15% errors (expected to see some degradation) |
| Spike | >20% errors during spike (recovery is what matters) |
| Soak | Latency creep over time, >2% errors |
| Write | >5% errors, P90 > 3s for writes |
| Error | Expected failures should match expected status codes |

---

## Directory Structure

```
tests/load/k6/
├── README.md                          ← This file
├── config/
│   ├── env.sh.example                 ← Environment variable template
│   └── thresholds.js                  ← Shared threshold presets
├── helpers/
│   ├── auth.js                        ← Login + ID discovery (setup)
│   ├── checks.js                      ← Response validation + metrics
│   ├── data.js                        ← Test data generators
│   ├── http.js                        ← Authenticated request wrappers
│   └── metrics.js                     ← Custom k6 metrics
├── results/
│   └── .gitkeep                       ← Results output directory
└── scenarios/
    ├── 01-smoke.js                    ← 1 VU, 30s — verify infrastructure
    ├── 02-baseline.js                 ← 2 VUs, 1 min — establish latency
    ├── 03-normal-load.js              ← 10–20 VUs, 3 min — realistic load
    ├── 04-read-heavy.js               ← 20 VUs, 3 min — read pressure
    ├── 05-cache-read.js               ← 20 VUs, 3 min — Redis comparison
    ├── 06-mixed-workload.js           ← 15 VUs, 3 min — reads + writes
    ├── 07-stress.js                   ← 0–80 VUs, 8 min — find limits
    ├── 08-spike.js                    ← 5→50→5 VUs, 3 min — burst
    ├── 09-soak.js                     ← 10 VUs, 15 min — endurance
    ├── 10-write-heavy.js              ← 5 VUs, 2 min — writes only
    └── 11-error-resilience.js         ← 5 VUs, 1 min — error handling
```
