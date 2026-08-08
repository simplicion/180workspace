'use strict';

const { Worker } = require('bullmq');
const { redis } = require('../../../backend/src/system-configs/config/redis');
const { getCompanyPrisma, prisma: globalPrisma } = require('@workspace/db');

function setupNotificationWorker() {
    if (!redis) return null;

    const worker = new Worker('notification', async (job) => {
        const { companyId, ...notificationData } = job.data;
        const targetCompanyId = companyId;
        const prisma = targetCompanyId ? getCompanyPrisma(targetCompanyId) : globalPrisma;
        await prisma.notification.create({
            data: {
                ...notificationData,
                ...(targetCompanyId ? { companyId: targetCompanyId } : {})
            }
        });
    }, { connection: redis, lockDuration: 30000 });

    worker.on('failed', (job, err) => console.error(`[Worker] Notification job failed:`, err.message));
    worker.on('error', (err) => {
        if (err.message.includes('Command timed out') || err.message.includes('Stream isn\'t writeable')) return;
        console.error(`[Queue Worker Error: notification]`, err.message);
    });
    return worker;
}

module.exports = setupNotificationWorker;
