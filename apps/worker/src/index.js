'use strict';

require('dotenv').config();

const { redis } = require('../../backend/src/system-configs/config/redis');

// Import Workers
const setupEmailWorker = require('./workers/emailWorker');
const setupNotificationWorker = require('./workers/notificationWorker');
const setupAutomationWorker = require('./workers/automationWorker');
const setupAIWorker = require('./workers/aiWorker');
const setupFileWorker = require('./workers/fileWorker');
const setupVoiceforceWorker = require('./workers/voiceforceWorker');

// Crons
// Note: subscriptionCron might need minor path updates if it required local files, but it runs on init.
let SubscriptionCron;
try {
    SubscriptionCron = require('./schedulers/subscriptionCron.service');
} catch (e) {
    console.warn('[Worker] SubscriptionCron not found or failed to load:', e.message);
}

// Media Queue / Reel Worker
// Note: reelWorker might need minor path updates, but we'll import it if needed.
let setupReelWorker;
try {
    // If reel worker exports a setup function
    setupReelWorker = require('./workers/reelWorker');
} catch (e) {
    console.warn('[Worker] ReelWorker not found or failed to load:', e.message);
}


console.log('====================================');
console.log('âš™ï¸  180workspace BACKGROUND WORKER BOOTING...');
console.log('====================================');

let activeWorkers = [];

async function bootstrap() {
    if (!redis) {
        console.error('â Œ REDIS_URL not set. Worker cannot function.');
        process.exit(1);
    }

    if (redis.status !== 'ready') {
        console.log('â ³ Waiting for Redis connection...');
        await new Promise((resolve) => {
            redis.once('ready', resolve);
        });
    }

    console.log('âœ… Redis Connected.');

    // 1. Initialize BullMQ Workers
    console.log('â ³ Starting Queue Workers...');
    const emailW = setupEmailWorker();
    const notifW = setupNotificationWorker();
    const autoW = setupAutomationWorker();
    const aiW = setupAIWorker();
    const fileW = setupFileWorker();
    
    if (emailW) activeWorkers.push(emailW);
    if (notifW) activeWorkers.push(notifW);
    if (autoW) activeWorkers.push(autoW);
    if (aiW) activeWorkers.push(aiW);
    if (fileW) activeWorkers.push(fileW);
    const voiceforceW = setupVoiceforceWorker();
    if (voiceforceW) activeWorkers.push(voiceforceW);

    if (typeof setupReelWorker === 'function') {
        const reelW = setupReelWorker();
        if (reelW) activeWorkers.push(reelW);
    }

    console.log(`âœ… ${activeWorkers.length} Queue Workers initialized.`);

    // 2. Initialize Schedulers / Crons
    console.log('â ³ Starting Crons...');
    if (SubscriptionCron && typeof SubscriptionCron.start === 'function') {
        SubscriptionCron.start();
        console.log('âœ… Subscription Cron initialized.');
    }

    console.log('====================================');
    console.log('ðŸš€ 180workspace BACKGROUND WORKER ONLINE');
    console.log('====================================');
}

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================
async function gracefulShutdown(signal) {
    console.log(`\nâš ï¸  Received ${signal}, starting graceful shutdown...`);
    
    try {
        // Stop accepting new jobs and wait for active ones to finish
        const closePromises = activeWorkers.map(w => w.close());
        await Promise.all(closePromises);
        console.log('âœ… All active jobs finished. Workers paused.');

        // Disconnect from Redis
        if (redis) {
            redis.disconnect();
            console.log('âœ… Redis connection closed.');
        }

        console.log('ðŸ›‘ Shutdown complete. Exiting.');
        process.exit(0);
    } catch (err) {
        console.error('â Œ Error during shutdown:', err);
        process.exit(1);
    }
}

// Listen for termination signals (Docker / Kubernetes / PM2)
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

// Start the engine
bootstrap().catch(err => {
    console.error('â Œ Fatal Error during bootstrap:', err);
    process.exit(1);
});

