import { redisClient as redis } from '../../utils/redis';
import { queryMetricsStorage } from '@workspace/db';
import { Request, Response, NextFunction } from 'express';

/**
 * Cache API responses using Redis.
 * @param ttl - Time to live in seconds (default: 300s / 5m)
 */
const cacheResponse = (ttl: number = 300) => {
    return async (req: any, res: Response, next: NextFunction) => {
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
            res.json = function (body: any) {
                // Only cache successful responses
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    redis.setex(cacheKey, ttl, JSON.stringify(body)).catch((err: any) => {
                        console.error('[Redis Cache] Set Error:', err.message);
                    });
                }
                return originalJson.call(this, body);
            };

            next();
        } catch (error: any) {
            console.error('[Redis Cache] Get Error:', error.message);
            next();
        }
    };
};

export default cacheResponse;
