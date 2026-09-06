import { prisma } from '@workspace/db';

let customRedisClient: any = null;
function getRedis(): any {
  if (customRedisClient) return customRedisClient;
  try {
    if (process.env.REDIS_URL) {
      const Redis = require('ioredis');
      customRedisClient = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true });
      return customRedisClient;
    }
  } catch {
    return null;
  }
  return null;
}

export function setQueueRedisClient(client: any) {
  customRedisClient = client;
}

export interface QueuedCaller {
  callSessionId: string;
  callerPhone: string;
  callerName?: string;
  enqueuedAt: number; // Unix timestamp
  queueId: string;
}

const inMemoryQueues = new Map<string, QueuedCaller[]>();

export class CallQueueService {
  /**
   * Pushes an incoming caller into the active hold queue
   */
  static async enqueueCaller(
    companyId: string,
    queueId: string,
    callSessionId: string,
    callerPhone: string,
    callerName?: string
  ): Promise<{ position: number; estimatedWaitSec: number }> {
    const enqueuedAt = Date.now();
    const item: QueuedCaller = {
      callSessionId,
      callerPhone,
      callerName,
      enqueuedAt,
      queueId
    };

    const redis = getRedis();
    let redisSuccess = false;
    if (redis) {
      try {
        const queueKey = `voiceforce:queue:${queueId}`;
        await redis.rpush(queueKey, JSON.stringify(item));
        redisSuccess = true;
      } catch {}
    }
    if (!redisSuccess) {
      const q = inMemoryQueues.get(queueId) || [];
      q.push(item);
      inMemoryQueues.set(queueId, q);
    }

    // Update Prisma queue count
    const queue = await (prisma as any).callQueue.update({
      where: { id: queueId },
      data: {
        currentWaiting: { increment: 1 },
        totalProcessed: { increment: 1 }
      }
    }).catch(() => null);

    const position = await this.getQueuePosition(queueId, callSessionId);
    const estimatedWaitSec = position * (queue?.avgWaitSeconds || 45);

    // Update CallSession status to 'in_progress' with queued note
    await (prisma as any).callSession.update({
      where: { id: callSessionId },
      data: {
        status: 'in_progress',
        callOutcome: 'waiting_in_queue'
      }
    }).catch(() => null);

    return { position, estimatedWaitSec };
  }

  /**
   * Calculates a caller's current 1-indexed position in the queue
   */
  static async getQueuePosition(queueId: string, callSessionId: string): Promise<number> {
    const redis = getRedis();
    if (redis) {
      try {
        const queueKey = `voiceforce:queue:${queueId}`;
        const items: string[] = await redis.lrange(queueKey, 0, -1);
        for (let i = 0; i < items.length; i++) {
          const parsed: QueuedCaller = JSON.parse(items[i]);
          if (parsed.callSessionId === callSessionId) {
            return i + 1;
          }
        }
      } catch {}
    }

    const memQueue = inMemoryQueues.get(queueId) || [];
    for (let i = 0; i < memQueue.length; i++) {
      if (memQueue[i].callSessionId === callSessionId) {
        return i + 1;
      }
    }
    return 1;
  }

  /**
   * Pops the next caller waiting in line
   */
  static async dequeueNextCaller(companyId: string, queueId: string): Promise<QueuedCaller | null> {
    const redis = getRedis();
    let item: QueuedCaller | null = null;
    if (redis) {
      try {
        const queueKey = `voiceforce:queue:${queueId}`;
        const raw = await redis.lpop(queueKey);
        if (raw) item = JSON.parse(raw);
      } catch {}
    }

    if (!item) {
      const memQueue = inMemoryQueues.get(queueId) || [];
      if (memQueue.length > 0) {
        item = memQueue.shift() || null;
      }
    }

    if (!item) return null;

    await (prisma as any).callQueue.update({
      where: { id: queueId },
      data: {
        currentWaiting: { decrement: 1 }
      }
    }).catch(() => {});

    return item;
  }

  /**
   * Removes a caller if they hang up while waiting in queue
   */
  static async removeCaller(queueId: string, callSessionId: string): Promise<boolean> {
    let removed = false;
    const redis = getRedis();
    if (redis) {
      try {
        const queueKey = `voiceforce:queue:${queueId}`;
        const items: string[] = await redis.lrange(queueKey, 0, -1);
        for (const item of items) {
          const parsed: QueuedCaller = JSON.parse(item);
          if (parsed.callSessionId === callSessionId) {
            await redis.lrem(queueKey, 1, item);
            removed = true;
            break;
          }
        }
      } catch {}
    }

    const memQueue = inMemoryQueues.get(queueId) || [];
    const filtered = memQueue.filter(c => c.callSessionId !== callSessionId);
    if (filtered.length !== memQueue.length) {
      inMemoryQueues.set(queueId, filtered);
      removed = true;
    }

    if (removed) {
      await (prisma as any).callQueue.update({
        where: { id: queueId },
        data: { currentWaiting: { decrement: 1 } }
      }).catch(() => {});
    }
    return removed;
  }

  /**
   * Lists all callers currently waiting in a queue for the live monitor
   */
  static async listWaitingCallers(companyId: string, queueId: string): Promise<Array<QueuedCaller & { waitSeconds: number; position: number }>> {
    const now = Date.now();
    const redis = getRedis();
    if (redis) {
      try {
        const queueKey = `voiceforce:queue:${queueId}`;
        const rawItems: string[] = await redis.lrange(queueKey, 0, -1);
        if (rawItems && rawItems.length > 0) {
          return rawItems.map((raw, idx) => {
            const item: QueuedCaller = JSON.parse(raw);
            return {
              ...item,
              position: idx + 1,
              waitSeconds: Math.max(0, Math.round((now - item.enqueuedAt) / 1000))
            };
          });
        }
      } catch {}
    }

    const memQueue = inMemoryQueues.get(queueId) || [];
    return memQueue.map((item, idx) => ({
      ...item,
      position: idx + 1,
      waitSeconds: Math.max(0, Math.round((now - item.enqueuedAt) / 1000))
    }));
  }
}
