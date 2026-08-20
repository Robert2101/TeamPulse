import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import logger from '../utils/logger.js';

let redis = null;
let ratelimiteMap = new Map();
let isConfigured = false;
let initialized = false;

/**
 * Initialize the Upstash Redis client.
 * MUST be called AFTER dotenv.config() to ensure env vars are loaded.
 * Safe to call multiple times — only initializes once.
 */
export const initRedis = () => {
    if (initialized) return;
    initialized = true;

    const restUrl = process.env.UPSTASH_REDIS_REST_URL;
    const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (restUrl && restToken) {
        try {
            redis = new Redis({
                url: restUrl,
                token: restToken,
            });
            isConfigured = true;
            logger.info('🚀 Upstash Redis client initialized successfully.');
        } catch (err) {
            logger.warn(`⚠️ Failed to initialize Upstash Redis: ${err.message}. Falling back to fail-open mode.`);
        }
    } else {
        logger.warn('⚠️ UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not found in environment. Upstash Redis caching will fail-open (bypass cache).');
    }
};

/**
 * Retrieve a JSON-parsed cached value by key.
 */
export const getCache = async (key) => {
    if (!isConfigured || !redis) return null;
    try {
        const data = await redis.get(key);
        if (!data) return null;
        return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (error) {
        logger.warn(`Redis GET Error for key "${key}": ${error.message}`);
        return null; // Fail-open: return null to fallback to MongoDB
    }
};

/**
 * Set a key with a JSON stringified value and optional TTL (seconds).
 * Optionally tracks key in workspace key SET for bulk invalidation.
 */
export const setCache = async (key, value, ttlSeconds = 60, workspaceId = null) => {
    if (!isConfigured || !redis) return false;
    try {
        const stringified = JSON.stringify(value);
        if (ttlSeconds) {
            await redis.set(key, stringified, { ex: ttlSeconds });
        } else {
            await redis.set(key, stringified);
        }

        // Track key in workspace set for safe bulk invalidation without KEYS *
        if (workspaceId) {
            await redis.sadd(`ws:keys:${workspaceId}`, key);
            await redis.expire(`ws:keys:${workspaceId}`, 86400); // 24h safety TTL on workspace key set
        }
        return true;
    } catch (error) {
        logger.warn(`Redis SET Error for key "${key}": ${error.message}`);
        return false;
    }
};

/**
 * Delete a specific cache key.
 */
export const delCache = async (key) => {
    if (!isConfigured || !redis) return false;
    try {
        await redis.del(key);
        return true;
    } catch (error) {
        logger.warn(`Redis DEL Error for key "${key}": ${error.message}`);
        return false;
    }
};

/**
 * Delete all tracked cache keys for a specific workspace.
 * Avoids dangerous `KEYS *` scans in production.
 */
export const delWorkspaceCacheKeys = async (workspaceId) => {
    if (!isConfigured || !redis || !workspaceId) return false;
    try {
        const setKey = `ws:keys:${workspaceId}`;
        const keys = await redis.smembers(setKey);
        if (Array.isArray(keys) && keys.length > 0) {
            await redis.del(...keys);
        }
        await redis.del(setKey);
        return true;
    } catch (error) {
        logger.warn(`Redis Bulk Workspace DEL Error for ws "${workspaceId}": ${error.message}`);
        return false;
    }
};

/**
 * Helper for Upstash Sliding Window Rate Limiting.
 * Fails open (allows request) if Redis is unconfigured or encounters an error in dev.
 */
export const checkRateLimit = async (identifier, requests = 10, windowString = "15 m") => {
    if (!isConfigured || !redis) {
        return { success: true, remaining: requests, reset: Date.now() };
    }
    try {
        const limitKey = `${requests}_${windowString}`;
        if (!ratelimiteMap.has(limitKey)) {
            ratelimiteMap.set(limitKey, new Ratelimit({
                redis: redis,
                limiter: Ratelimit.slidingWindow(requests, windowString),
                analytics: true,
                prefix: "tp:ratelimit",
            }));
        }
        const limiter = ratelimiteMap.get(limitKey);
        const result = await limiter.limit(identifier);
        return result;
    } catch (error) {
        logger.warn(`Rate Limit Error for "${identifier}": ${error.message}`);
        return { success: true, remaining: 1, reset: Date.now() };
    }
};

export default redis;
