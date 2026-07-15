'use strict';

const { redis } = require('../../config/redis');
const { queryMetricsStorage } = require('@workspace/db');

/**
 * Cache API responses using Redis.
 * @param {number} ttl - Time to live in seconds (default: 300s / 5m)
 */
const cacheResponse = (ttl = 300) => {
    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET' || !redis) {
            return next();
        }

        const cacheKey = `cache:${req.originalUrl}`;
        const perfData = queryMetricsStorage?.getStore();
        
        try {
            const startRedis = Date.now();
            const cachedData = await redis.get(cacheKey);
            
            if (perfData) {
                perfData.redisDuration = (perfData.redisDuration || 0) + (Date.now() - startRedis);
            }

            if (cachedData) {
                if (perfData) perfData.cacheHit = true;
                return res.status(200).json(JSON.parse(cachedData));
            }

            if (perfData) perfData.cacheMiss = true;

            // Override res.json to intercept and cache the response
            const originalJson = res.json;
            res.json = function (body) {
                // Only cache successful responses
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    redis.setex(cacheKey, ttl, JSON.stringify(body)).catch(err => {
                        console.error('[Redis Cache] Set Error:', err.message);
                    });
                }
                return originalJson.call(this, body);
            };

            next();
        } catch (error) {
            console.error('[Redis Cache] Get Error:', error.message);
            next();
        }
    };
};

module.exports = cacheResponse;
