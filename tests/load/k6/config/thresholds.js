/**
 * Shared threshold presets for TeamPulse k6 scenarios.
 *
 * All duration values are in milliseconds.
 * These are STARTING POINTS for a local development environment.
 * Adjust based on your infrastructure, network latency, and SLA targets.
 *
 * Thresholds marked with ★ are intentionally generous for local testing.
 * Tighten them for staging / production performance budgets.
 */

// ── Smoke: just verify everything works ──────────────────────────────────────
export const SMOKE_THRESHOLDS = {
    http_req_failed:   ['rate<0.01'],           // <1% error rate
    http_req_duration: ['p(95)<3000'],           // ★ 95th percentile < 3 s
};

// ── Baseline: establish normal single-user latency ───────────────────────────
export const BASELINE_THRESHOLDS = {
    http_req_failed:   ['rate<0.01'],
    http_req_duration: ['p(50)<500', 'p(90)<1000', 'p(95)<2000', 'p(99)<3000'],
    tp_business_success_rate: ['rate>0.99'],
};

// ── Normal load: realistic concurrency ───────────────────────────────────────
export const NORMAL_THRESHOLDS = {
    http_req_failed:   ['rate<0.05'],           // <5% error rate
    http_req_duration: ['p(90)<2000', 'p(95)<3000'],
    tp_business_success_rate: ['rate>0.95'],
};

// ── Read-heavy: sustained read pressure ──────────────────────────────────────
export const READ_HEAVY_THRESHOLDS = {
    http_req_failed:   ['rate<0.02'],
    http_req_duration: ['p(90)<1500', 'p(95)<2500'],
    tp_business_success_rate: ['rate>0.97'],
};

// ── Cache reads: specifically targets Redis-backed endpoints ─────────────────
export const CACHE_READ_THRESHOLDS = {
    http_req_failed:   ['rate<0.01'],
    http_req_duration: ['p(50)<300', 'p(90)<800', 'p(95)<1500'],
    tp_cache_read_duration: ['p(90)<800', 'p(95)<1200'],  // aggregate cache metric
    tp_business_success_rate: ['rate>0.98'],
};

// ── Mixed workload: reads + writes ───────────────────────────────────────────
export const MIXED_THRESHOLDS = {
    http_req_failed:   ['rate<0.05'],
    http_req_duration: ['p(90)<2500', 'p(95)<4000'],
    tp_business_success_rate: ['rate>0.94'],
};

// ── Stress: progressive overload — expect degradation ────────────────────────
export const STRESS_THRESHOLDS = {
    http_req_failed:   ['rate<0.15'],           // ★ allows higher error rate
    http_req_duration: ['p(95)<5000'],
};

// ── Spike: sudden traffic burst ──────────────────────────────────────────────
export const SPIKE_THRESHOLDS = {
    http_req_failed:   ['rate<0.20'],           // ★ spikes may cause errors
    http_req_duration: ['p(95)<8000'],
};

// ── Soak / endurance: sustained moderate load ────────────────────────────────
export const SOAK_THRESHOLDS = {
    http_req_failed:   ['rate<0.02'],
    http_req_duration: ['p(90)<2000', 'p(95)<3000'],
    tp_business_success_rate: ['rate>0.97'],
};

// ── Write-heavy: create/update operations ────────────────────────────────────
export const WRITE_THRESHOLDS = {
    http_req_failed:   ['rate<0.05'],
    http_req_duration: ['p(90)<3000', 'p(95)<5000'],
    tp_business_success_rate: ['rate>0.90'],
};

// ── Error / resilience: expects controlled failures ──────────────────────────
export const ERROR_THRESHOLDS = {
    // We intentionally send bad requests, so http_req_failed is not meaningful.
    http_req_duration: ['p(95)<3000'],
};
