'use strict';

const redisClient = require('../../config/redis');
const redis = redisClient.redis;

/**
 * Attempts to retrieve value from Redis by key.
 * @param {string} key - Redis key.
 * @returns {Promise<Object|null>} - Parsed JSON if found, null otherwise.
 */
async function cacheGet(key) {
    if (!redis) return null;
    try {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
    } catch (err) {
        console.error(`[Redis cacheGet Error] key: ${key}`, err);
        return null;
    }
}

/**
 * Stores JSON stringified value in Redis with TTL.
 * @param {string} key - Redis key.
 * @param {Object} value - Data object to store.
 * @param {number} ttlSeconds - Time to live in seconds (default: 60).
 */
async function cacheSet(key, value, ttlSeconds = 60) {
    if (!redis) return;
    try {
        await redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (err) {
        console.error(`[Redis cacheSet Error] key: ${key}`, err);
    }
}

/**
 * Deletes a key from Redis.
 * @param {string} key - Redis key.
 */
async function cacheDel(key) {
    if (!redis) return;
    try {
        await redis.del(key);
    } catch (err) {
        console.error(`[Redis cacheDel Error] key: ${key}`, err);
    }
}

/**
 * Deletes multiple keys from Redis matching a pattern.
 * @param {string} pattern - Redis key pattern.
 */
async function cacheDelPattern(pattern) {
    if (!redis) return;
    try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    } catch (err) {
        console.error(`[Redis cacheDelPattern Error] pattern: ${pattern}`, err);
    }
}

module.exports = { cacheGet, cacheSet, cacheDel, cacheDelPattern };
