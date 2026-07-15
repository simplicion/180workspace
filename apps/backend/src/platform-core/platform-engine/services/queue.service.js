'use strict';

const { Queue, Worker } = require('bullmq');
const { redis } = require('../../../system-configs/config/redis.js');

let emailQueue = null;
let notificationQueue = null;
let automationQueue = null;
let aiQueue = null;
let fileProcessingQueue = null;

async function initQueues() {
    if (!redis) {
        console.warn('[Queue] Skipping queue init â€” Redis not configured');
        return;
    }

    try {
        const connection = redis;

        // Verify connection is ready before starting workers
        if (redis.status !== 'ready') {
            console.log('[Queue] Waiting for Redis to be ready before initializing workers...');
            redis.once('ready', () => initQueues());
            return;
        }

        // Suppress BullMQ's repetitive eviction policy warning in development
        // (Render's free Redis uses allkeys-lru which can't be changed)
        const originalWarn = console.warn;
        let evictionWarned = false;
        console.warn = (...args) => {
            const msg = args.join(' ');
            if (msg.includes('Eviction policy') || msg.includes('noeviction')) {
                if (!evictionWarned) {
                    evictionWarned = true;
                    originalWarn('[Queue] âš ï¸  Redis eviction policy is allkeys-lru (should be noeviction). This is a known Render free-tier limitation. Queue jobs may be evicted under memory pressure.');
                }
                return;
            }
            originalWarn(...args);
        };

        emailQueue = new Queue('email', { connection });
        notificationQueue = new Queue('notification', { connection });
        automationQueue = new Queue('automation', { connection });
        aiQueue = new Queue('ai', { connection });
        fileProcessingQueue = new Queue('fileProcessing', { connection });

        // Restore original console.warn
        console.warn = originalWarn;

        // ─── Workers (Moved to apps/worker) ──────────────────────────────
        console.log('✅ BullMQ queues initialized (email, notification, automation)');
    } catch (err) {
        console.error('â Œ [Queue] Initialization failed. System using fallback mode.', err.message);
        emailQueue = null;
        notificationQueue = null;
        automationQueue = null;
        aiQueue = null;
        fileProcessingQueue = null;
    }
}

/**
 * Add an email job to the queue
 */
async function queueEmail({ to, subject, html, template, data, tenantId, category }) {
    if (!emailQueue) {
        const EmailService = require('./email.service');
        const { getTenantDb } = require('../../../system-configs/database-tools/dbManager.js');
        
        // If no queue, send immediately using the internal send method
        // We use sendEmail({options}, db) to bypass recursion
        try {
            const tenantDb = await getTenantDb(tenantId);
            return EmailService.dispatchEmail({ 
                to, 
                subject, 
                html, 
                templateName: template, 
                templateData: data,
                category
            }, tenantDb);
        } catch (err) {
            console.error('[Queue Fallback] Failed to send email:', err.message);
            // Don't throw here to prevent crashing the main thread, just return failure
            return { success: false, error: err.message };
        }
    }
    return emailQueue.add('send', { to, subject, html, template, data, tenantId, category }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
}

/**
 * Add a notification job to the queue
 */
async function queueNotification(data, tenantId) {
    const jobData = { ...data, tenantId };
    if (!notificationQueue) {
        const { getTenantDb } = require('../../../system-configs/database-tools/dbManager.js');
        const tenantDb = await getTenantDb(tenantId);
        const NotificationModel = tenantDb.model('Notification');
        return NotificationModel.create(data);
    }
    return notificationQueue.add('create', jobData);
}

/**
 * Trigger an n8n automation via queue
 */
async function queueAutomation(type, data, tenantId) {
    if (!automationQueue) {
        if (type === 'internal_trigger') {
            try {
                const { getTenantDb } = require('../../../system-configs/database-tools/dbManager.js');
                const AutomationService = require('./automation.service');
                const tenantDb = await getTenantDb(tenantId);
                console.log(`[Queue Fallback] Processing automation [${data.eventType}] immediately for tenant ${tenantId}`);
                return await AutomationService.processTrigger(data, tenantDb);
            } catch (err) {
                console.error('[Queue Fallback] Failed to process automation immediately:', err.message); return { success: false, error: err.message };
            }
        }
        console.warn('[Queue] Automation skipped â€” Queue not initialized and no direct fallback for type:', type);
        return;
    }
    return automationQueue.add('automation_task', { type, data, tenantId });
}

/**
 * Add an AI task to the queue
 */
async function queueAITask(taskType, data, tenantId) {
    if (!aiQueue) {
        console.warn(`[Queue] AI Queue not initialized. Cannot process ${taskType}.`);
        return null;
    }
    return aiQueue.add(taskType, { ...data, tenantId });
}

/**
 * Add a file processing task to the queue
 */
async function queueFileTask(taskType, data, tenantId) {
    if (!fileProcessingQueue) {
        console.warn(`[Queue] File Processing Queue not initialized. Cannot process ${taskType}.`);
        return null;
    }
    return fileProcessingQueue.add(taskType, { ...data, tenantId });
}

module.exports = {
    initQueues,
    queueEmail,
    queueNotification,
    queueAutomation,
    queueAITask,
    queueFileTask,
    getRedis: () => redis,
    getEmailQueue: () => emailQueue,
    getNotificationQueue: () => notificationQueue,
    getAutomationQueue: () => automationQueue,
    getAiQueue: () => aiQueue,
    getFileProcessingQueue: () => fileProcessingQueue
};
