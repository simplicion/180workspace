import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
    console.warn('⚠️  REDIS_URL not set — queue features will be disabled');
}

const redis: Redis | null = REDIS_URL || 'redis://127.0.0.1:6379'
    ? new Redis(REDIS_URL || 'redis://127.0.0.1:6379', {
        maxRetriesPerRequest: null, // Required by BullMQ
        enableReadyCheck: false,
        enableOfflineQueue: false, // Don't hang requests if disconnected
        commandTimeout: 15000,     // Increase to 15s for stability
        tls: (REDIS_URL || '').startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
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
    redis.on('connect', () => console.log('✅ Redis connection initialized'));
    redis.on('ready', () => console.log('✅ Redis is ready'));
    redis.on('reconnecting', (ms: number) => console.log(`🔄 Redis reconnecting in ${ms}ms...`));
    redis.on('end', () => console.warn('🔌 Redis connection ended. Redis-dependent features will fail.'));
    
    redis.on('error', (err: any) => {
        // Only log serious errors, ignore ECONNREFUSED if expected
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.message.includes('Stream isn\'t writeable')) {
            // Log only once per minute to avoid flooding
            const globalAny = global as any;
            if (!globalAny.lastRedisErrorLog || Date.now() - globalAny.lastRedisErrorLog > 60000) {
                console.warn(`⚠️  Redis Connectivity Issue: ${err.message}. Queue workers may be offline.`);
                globalAny.lastRedisErrorLog = Date.now();
            }
            return;
        }
        console.error('❌ Redis error:', err.message);
    });
}

export { redis };
