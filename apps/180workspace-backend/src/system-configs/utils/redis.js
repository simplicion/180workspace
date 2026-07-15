'use strict';

const Redis = require('ioredis');

// Re-use connection from .env
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Initialize a single shared Redis client instance
const redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
});

redisClient.on('error', (err) => {
    console.error('[Redis Cache] Error:', err);
});

redisClient.on('connect', () => {
    console.log('[Redis Cache] Connected successfully');
});

/**
 * Get cached data by key
 * @param {string} key
 * @returns {Promise<any|null>} parsed JSON or null
 */
const getCache = async (key) => {
    try {
        const data = await redisClient.get(key);
        if (data) {
            return JSON.parse(data);
        }
        return null;
    } catch (e) {
        console.error('[Redis Cache] Get error for key', key, e);
        return null;
    }
};

/**
 * Set data in cache
 * @param {string} key
 * @param {any} value
 * @param {number} ttlSeconds Time to live in seconds (default 300)
 */
const setCache = async (key, value, ttlSeconds = 300) => {
    try {
        await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (e) {
        console.error('[Redis Cache] Set error for key', key, e);
    }
};

/**
 * Delete data from cache
 * @param {string} key
 */
const delCache = async (key) => {
    try {
        await redisClient.del(key);
    } catch (e) {
        console.error('[Redis Cache] Del error for key', key, e);
    }
};

module.exports = {
    redisClient,
    getCache,
    setCache,
    delCache
};
