'use strict';
const { Queue, Worker } = require('bullmq');
const { redis } = require('../../../system-configs/config/redis.js');
const { syncUserToMeili, syncCompanyToMeili } = require('./meilisearch.service');

const searchQueue = new Queue('searchSync', { connection: redis });

const searchWorker = new Worker('searchSync', async job => {
  const { type, data } = job.data;
  if (type === 'USER_CREATED') {
    await syncUserToMeili(data);
  } else if (type === 'COMPANY_CREATED') {
    await syncCompanyToMeili(data);
  }
}, { connection: redis });

searchWorker.on('completed', job => {
  console.log(`[SearchSync] Job ${job.id} completed!`);
});

searchWorker.on('failed', (job, err) => {
  console.error(`[SearchSync] Job ${job.id} failed:`, err);
});

exports.searchQueue = searchQueue;
