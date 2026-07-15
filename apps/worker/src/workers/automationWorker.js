'use strict';

const { Worker } = require('bullmq');
const { redis } = require('../../../backend/src/system-configs/config/redis');
const { getTenantDb } = require('../../../backend/src/system-configs/database-tools/dbManager');
const { triggerN8nWebhook } = require('../../../backend/src/platform-core/platform-integrations/webhooks/webhook.routes');
const AutomationService = require('../../../backend/src/platform-core/platform-communications/automation.service');

function setupAutomationWorker() {
    if (!redis) return null;

    const worker = new Worker('automation', async (job) => {
        const { type, data, tenantId } = job.data;
        if (type === 'external_webhook') {
            await triggerN8nWebhook(data.path, data.payload);
        } else if (type === 'internal_trigger') {
            const tenantDb = await getTenantDb(tenantId);
            await AutomationService.processTrigger(data, tenantDb);
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

