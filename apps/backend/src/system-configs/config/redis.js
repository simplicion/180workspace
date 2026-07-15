'use strict';

const { Redis } = require('ioredis');

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
    console.warn('âš ï¸  REDIS_URL not set â€” queue features will be disabled');
}

const redis = REDIS_URL
    ? new Redis(REDIS_URL, {
        maxRetriesPerRequest: null, // Required by BullMQ
        enableReadyCheck: false,
        enableOfflineQueue: false, // Don't hang requests if disconnected
        commandTimeout: 15000,     // Increase to 15s for stability
        tls: REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
        retryStrategy: (times) => {
            const delay = Math.min(times * 100, 5000);
            if (times > 10) {
                console.warn('[Redis] Connection failing after 10 attempts. Entering high-latency retry mode.');
                return 15000; // Keep trying but slowly
            }
            return delay;
        }
    })
    : null;

if (redis) {
    redis.on('connect', () => console.log('âœ… Redis connection initialized'));
    redis.on('ready', () => console.log('âœ… Redis is ready'));
    redis.on('reconnecting', (ms) => console.log(`ðŸ”„ Redis reconnecting in ${ms}ms...`));
    redis.on('end', () => console.warn('ðŸ”Œ Redis connection ended. Redis-dependent features will fail.'));
    
    redis.on('error', (err) => {
        // Only log serious errors, ignore ECONNREFUSED if expected
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.message.includes('Stream isn\'t writeable')) {
            // Log only once per minute to avoid flooding
            if (!global.lastRedisErrorLog || Date.now() - global.lastRedisErrorLog > 60000) {
                console.warn(`âš ï¸  Redis Connectivity Issue: ${err.message}. Queue workers may be offline.`);
                global.lastRedisErrorLog = Date.now();
            }
            return;
        }
        console.error('âŒ Redis error:', err.message);
    });
}

module.exports = { redis };
