'use strict';

const express = require('express');
const router = express.Router();

// Enhanced health endpoint â€” reports DB, Redis and Queue status
router.get('/', async (req, res) => {
    const { prisma } = require('@workspace/db');
    const { getRedis, getEmailQueue, getNotificationQueue, getAutomationQueue } = require('../services/queue.service');

    let dbStatus = 'disconnected';
    try {
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = 'connected';
    } catch (err) {
        dbStatus = 'disconnected';
    }

    let redisConnected = false;
    let queuesStatus = 'disabled';

    try {
        const redis = getRedis();
        if (redis) {
            redisConnected = redis.status === 'ready';
            queuesStatus = 'active';

            // Basic queue health check (optional, just presence here)
            const eQ = getEmailQueue();
            const nQ = getNotificationQueue();
            const aQ = getAutomationQueue();
            if (!eQ || !nQ || !aQ) queuesStatus = 'degraded';
        }
    } catch (err) {
        redisConnected = false;
    }

    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        database: dbStatus,
        redis: redisConnected ? 'connected' : 'disconnected',
        queues: queuesStatus,
        version: require('../../package.json').version,
    });
});

module.exports = router;
