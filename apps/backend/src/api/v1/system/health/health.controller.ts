import { Request, Response, NextFunction } from 'express';
import { prisma } from '@workspace/db';
// Assuming queues are handled differently now or we just return a simplified response.
import { getRedis } from '../../../../system-configs/utils/redis';

export const getHealth = async (req: Request, res: Response, next: NextFunction) => {
    let dbStatus = 'disconnected';
    try {
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = 'connected';
    } catch (err) {
  dbStatus = 'disconnected';
  next(err);
}

    let redisConnected = false;

    try {
        const redis = getRedis();
        if (redis) {
            redisConnected = redis.status === 'ready';
        }
    } catch (err) {
  redisConnected = false;
  next(err);
}

    return res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        database: dbStatus,
        redis: redisConnected ? 'connected' : 'disconnected',
        queues: 'unknown',
        version: process.env.npm_package_version || '1.0.0',
    });
};
