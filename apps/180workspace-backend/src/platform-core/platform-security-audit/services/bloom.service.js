const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl);

const BLOOM_FILTER_NAME = 'user_email_bloom';

class BloomService {
    static async init() {
        try {
            await redis.call('BF.RESERVE', BLOOM_FILTER_NAME, '0.001', '10000000');
            console.log('[BloomService] Initialized user email bloom filter.');
        } catch (err) {
            if (err.message.includes('ERR item exists')) {
                console.log('[BloomService] Bloom filter already exists.');
            } else {
                console.warn('[BloomService] RedisBloom might not be available:', err.message);
            }
        }
    }

    static async addEmail(email) {
        try {
            if (!email) return;
            await redis.call('BF.ADD', BLOOM_FILTER_NAME, email.toLowerCase());
        } catch (err) {
            console.error('[BloomService] Failed to add email:', err.message);
        }
    }

    static async mightExist(email) {
        try {
            if (!email) return false;
            const exists = await redis.call('BF.EXISTS', BLOOM_FILTER_NAME, email.toLowerCase());
            return exists === 1;
        } catch (err) {
            return true;
        }
    }
}

BloomService.init();

module.exports = BloomService;
