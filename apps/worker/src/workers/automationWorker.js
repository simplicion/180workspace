'use strict';

const { Worker } = require('bullmq');
const { redis } = require('../../../backend/src/system-configs/config/redis');
const { getCompanyPrisma, prisma: globalPrisma } = require('@workspace/db');
const { triggerN8nWebhook } = require('../../../backend/src/platform-core/platform-integrations/webhooks/webhook.routes');
const AutomationService = require('../../../backend/src/platform-core/platform-communications/services/automation.service');

function setupAutomationWorker() {
    if (!redis) return null;

    const worker = new Worker('automation', async (job) => {
        const { type, data, companyId } = job.data;
        if (type === 'external_webhook') {
            await triggerN8nWebhook(data.path, data.payload);
        } else if (type === 'internal_trigger') {
            const targetCompanyId = companyId;
            const prisma = targetCompanyId ? getCompanyPrisma(targetCompanyId) : globalPrisma;
            await AutomationService.processTrigger(data, prisma);
        }
    }, { connection: redis, lockDuration: 30000 });

    worker.on('failed', (job, err) => console.error(`[Worker] Automation job failed:`, err.message));
    worker.on('error', (err) => {
        if (err.message.includes('Command timed out') || err.message.includes('Stream isn\'t writeable')) return;
        console.error(`[Queue Worker Error: automation]`, err.message);
    });
    return worker;
}

module.exports = setupAutomationWorker;
