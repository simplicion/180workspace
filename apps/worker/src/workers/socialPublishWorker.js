'use strict';

const { Worker } = require('bullmq');
const { redis } = require('../../../backend/src/system-configs/config/redis');
const { SocialPostService } = require('@workspace/social-media');
const { requestContext } = require('@workspace/db');

function setupSocialPublishWorker() {
    if (!redis) return null;

    const worker = new Worker('social_publish', async (job) => {
        const { postId, companyId } = job.data;
        console.log(`[SocialPublishWorker] Executing scheduled post ${postId} for company ${companyId}...`);

        if (!postId) {
            throw new Error('Post ID is required for publishing job');
        }

        return requestContext.run({ companyId }, async () => {
            const result = await SocialPostService.publishPostNow(postId);
            console.log(`[SocialPublishWorker] Post ${postId} published. Result:`, result.publishedLinks);
            return result;
        });
    }, {
        connection: redis,
        prefix: '{bull}',
        concurrency: 5,
        lockDuration: 60000
    });

    worker.on('completed', (job, result) => {
        console.log(`[SocialPublishWorker] Job ${job.id} completed successfully for post ${job.data?.postId}`);
    });

    worker.on('failed', (job, err) => {
        console.error(`[SocialPublishWorker] Job ${job?.id} failed for post ${job?.data?.postId} (attempt ${job?.attemptsMade}/${job?.opts?.attempts}): ${err.message}`);
    });

    worker.on('error', (err) => {
        if (err.message && (err.message.includes('Connection is closed') || err.message.includes('Command timed out'))) return;
        console.error('[SocialPublishWorker] Worker connection error:', err.message);
    });

    return worker;
}

module.exports = setupSocialPublishWorker;
