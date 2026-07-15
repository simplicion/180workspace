'use strict';

const { Worker } = require('bullmq');
const { redis } = require('../../../180workspace-backend/src/system-configs/config/redis');
const { getTenantDb } = require('../../../180workspace-backend/src/system-configs/database-tools/dbManager');
const EmailService = require('../../../180workspace-backend/src/app-registry/productivity-tools-app/emails/email.service');

function setupEmailWorker() {
    if (!redis) return null;

    const worker = new Worker('email', async (job) => {
        const { to, subject, html, template, data, tenantId, category } = job.data;
        const tenantDb = await getTenantDb(tenantId);
        
        await EmailService.dispatchEmail({ 
            to, 
            subject, 
            html, 
            templateName: template, 
            templateData: data, 
            category 
        }, tenantDb);
    }, { connection: redis, lockDuration: 30000 });

    worker.on('failed', (job, err) => console.error(`[Worker] Email job failed:`, err.message));
    worker.on('error', (err) => {
        if (err.message.includes('Command timed out') || err.message.includes('Stream isn\'t writeable')) return;
        console.error(`[Queue Worker Error: email]`, err.message);
    });
    return worker;
}

module.exports = setupEmailWorker;
