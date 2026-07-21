'use strict';

const { Worker } = require('bullmq');
const { redis } = require('../../../backend/src/system-configs/config/redis');
const fs = require('fs');

function setupFileWorker() {
    if (!redis) return null;

    const worker = new Worker('fileProcessing', async (job) => {
        // No current file jobs
    }, { connection: redis, lockDuration: 60000 });

    worker.on('failed', (job, err) => console.error(`[Worker] File processing job failed:`, err.message));
    worker.on('error', (err) => {
        if (err.message.includes('Command timed out') || err.message.includes('Stream isn\'t writeable')) return;
        console.error(`[Queue Worker Error: file]`, err.message);
    });
    return worker;
}

module.exports = setupFileWorker;
