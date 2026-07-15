'use strict';

const { Queue, Worker } = require("bullmq");
const { redis: connection } = require('../config/redis');
const mediaProcessor = require('./processors/media.processor');
// We might not have logger.js, let's use console
// const logger = require("../utils/logger.js");

const mediaQueue = new Queue("media_processing", {
  prefix: "{bull}", 
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 50 }, // Keep last 50 completed for debugging
    removeOnFail: false,
  },
});

// â”€â”€ Inline Worker (same process â€” ESM & Windows safe) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const mediaWorker = new Worker(
  "media_processing",
  async (job) => {
    console.log(`[MEDIA_WORKER] Processing job ${job.id}: ${job.name}`, job.data);
    return mediaProcessor(job);
  },
  {
    prefix: "{bull}", 
    connection,
    concurrency: 2,
  }
);

// â”€â”€ Worker Lifecycle Logging â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
mediaWorker.on("completed", (job) => {
  console.log(`[MEDIA_WORKER] Job ${job.id} completed successfully.`);
});

mediaWorker.on("failed", (job, err) => {
  console.error(`[MEDIA_WORKER] Job ${job?.id} failed (attempt ${job?.attemptsMade}/${job?.opts?.attempts}): ${err.message}`);
});

mediaWorker.on("error", (err) => {
  if (process.env.NODE_ENV !== "production" && err.message && (err.message.includes("Connection is closed") || err.message.includes("Failed to refresh slots cache") || err.message.includes("None of startup nodes is available"))) return;
  console.error("[MEDIA_WORKER] Worker error:", err);
});

module.exports = {
  mediaQueue,
  mediaWorker
};
