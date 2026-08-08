'use strict';

const { Worker } = require('bullmq');
const { redis } = require('../../../backend/src/system-configs/config/redis');
const { getCompanyPrisma, prisma: globalPrisma } = require('@workspace/db');
const EmailService = require('../../../backend/src/app-registry/productivity-tools-app/emails/email.service');

function setupEmailWorker() {
    if (!redis) return null;

    const worker = new Worker('email', async (job) => {
        const { to, subject, html, template, data, companyId, category } = job.data;
        const targetCompanyId = companyId;
        const prisma = targetCompanyId ? getCompanyPrisma(targetCompanyId) : globalPrisma;
        
        await EmailService.dispatchEmail({ 
            to, 
            subject, 
            html, 
            templateName: template, 
            templateData: data, 
            category 
        }, prisma);
    }, { connection: redis, lockDuration: 30000 });

    worker.on('failed', (job, err) => console.error(`[Worker] Email job failed:`, err.message));
    worker.on('error', (err) => {
        if (err.message.includes('Command timed out') || err.message.includes('Stream isn\'t writeable')) return;
        console.error(`[Queue Worker Error: email]`, err.message);
    });
    return worker;
}

module.exports = setupEmailWorker;
