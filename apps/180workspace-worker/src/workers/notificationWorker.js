'use strict';

const { Worker } = require('bullmq');
const { redis } = require('../../../180workspace-backend/src/system-configs/config/redis');
const { getTenantDb } = require('../../../180workspace-backend/src/system-configs/database-tools/dbManager');

function setupNotificationWorker() {
    if (!redis) return null;

    const worker = new Worker('notification', async (job) => {
        const { tenantId, ...notificationData } = job.data;
        const tenantDb = await getTenantDb(tenantId);
        const NotificationModel = tenantDb.model('Notification');
        await NotificationModel.create(notificationData);
    }, { connection: redis, lockDuration: 30000 });

    worker.on('failed', (job, err) => console.error(`[Worker] Notification job failed:`, err.message));
    worker.on('error', (err) => {
        if (err.message.includes('Command timed out') || err.message.includes('Stream isn\'t writeable')) return;
        console.error(`[Queue Worker Error: notification]`, err.message);
    });
    return worker;
}

module.exports = setupNotificationWorker;
