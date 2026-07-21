'use strict';

const { Worker } = require('bullmq');
const { redis } = require('../../../backend/src/system-configs/config/redis');

function setupAIWorker() {
    if (!redis) return null;

    const worker = new Worker('ai', async (job) => {
        // No current AI jobs
    }, { connection: redis, lockDuration: 60000 });

    worker.on('failed', (job, err) => console.error(`[Worker] AI job failed:`, err.message));
    worker.on('error', (err) => {
        if (err.message.includes('Command timed out') || err.message.includes('Stream isn\'t writeable')) return;
        console.error(`[Queue Worker Error: ai]`, err.message);
    });
    return worker;
}

module.exports = setupAIWorker;
