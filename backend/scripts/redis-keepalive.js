#!/usr/bin/env node
/**
 * Upstash Redis keep-alive.
 *
 * Free-tier Upstash databases are shut down after a period of inactivity. This script
 * writes a small heartbeat key (with a TTL, so it never accumulates) and reads it back,
 * which counts as real activity on the database.
 *
 * Zero dependencies: it talks to the Upstash REST API with fetch (Node 18+), so it can run
 * from GitHub Actions, a host's cron feature, or crontab without installing node_modules.
 *
 *   node backend/scripts/redis-keepalive.js
 *
 * Env: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN (falls back to backend/.env when dotenv is installed)
 *      KEEPALIVE_SOURCE (optional label stored in the heartbeat, e.g. "github-actions")
 * Exit codes: 0 = alive, 1 = Redis unreachable after retries, 2 = not configured
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const HEARTBEAT_KEY = "tp:keepalive";
const HEARTBEAT_TTL_SECONDS = 14 * 24 * 60 * 60;
const ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 10_000;

const log = (level, message, extra = {}) =>
    console[level === "error" ? "error" : "log"](JSON.stringify({ level, message, at: new Date().toISOString(), ...extra }));

const loadEnvFile = async () => {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) return;
    try {
        const { default: dotenv } = await import("dotenv");
        const here = path.dirname(fileURLToPath(import.meta.url));
        dotenv.config({ path: path.join(here, "..", ".env"), quiet: true });
    } catch {
        // dotenv not installed (e.g. in CI): rely on real environment variables only.
    }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const command = async (url, token, args) => {
    const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.error) throw new Error(body.error || `HTTP ${res.status}`);
    return body.result;
};

export const keepAlive = async ({ url, token, source = "script" }) => {
    const beat = JSON.stringify({ at: new Date().toISOString(), source });
    let lastError;
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
        try {
            const started = Date.now();
            await command(url, token, ["SET", HEARTBEAT_KEY, beat, "EX", String(HEARTBEAT_TTL_SECONDS)]);
            const stored = await command(url, token, ["GET", HEARTBEAT_KEY]);
            if (stored !== beat) throw new Error("heartbeat read-back mismatch");
            return { attempt, latencyMs: Date.now() - started };
        } catch (err) {
            lastError = err;
            log("warn", "Redis heartbeat attempt failed", { attempt, error: err.message });
            if (attempt < ATTEMPTS) await sleep(2000 * attempt);
        }
    }
    throw lastError;
};

const main = async () => {
    await loadEnvFile();
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
        log("error", "UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set");
        process.exit(2);
    }
    try {
        const result = await keepAlive({ url, token, source: process.env.KEEPALIVE_SOURCE || "script" });
        log("info", "Redis is alive", { host: new URL(url).host, ...result });
    } catch (err) {
        log("error", "Redis heartbeat failed after retries", { error: err.message });
        process.exit(1);
    }
};

// Run only when executed directly (not when imported).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main();
}
