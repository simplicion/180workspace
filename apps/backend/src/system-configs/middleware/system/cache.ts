import { redisClient as redis } from '../../utils/redis';

/**
 * Attempts to retrieve value from Redis by key.
 * @param key - Redis key.
 * @returns - Parsed JSON if found, null otherwise.
 */
async function cacheGet(key: string): Promise<any | null> {
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
 * @param key - Redis key.
 * @param value - Data object to store.
 * @param ttlSeconds - Time to live in seconds (default: 60).
 */
async function cacheSet(key: string, value: any, ttlSeconds: number = 60): Promise<void> {
    if (!redis) return;
    try {
        await redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (err) {
        console.error(`[Redis cacheSet Error] key: ${key}`, err);
    }
}

/**
 * Deletes a key from Redis.
 * @param key - Redis key.
 */
async function cacheDel(key: string): Promise<void> {
    if (!redis) return;
    try {
        await redis.del(key);
    } catch (err) {
        console.error(`[Redis cacheDel Error] key: ${key}`, err);
    }
}

/**
 * Deletes multiple keys from Redis matching a pattern.
 * @param pattern - Redis key pattern.
 */
async function cacheDelPattern(pattern: string): Promise<void> {
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

export { cacheGet, cacheSet, cacheDel, cacheDelPattern };
