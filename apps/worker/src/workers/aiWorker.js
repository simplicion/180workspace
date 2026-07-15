'use strict';

const { Worker } = require('bullmq');
const { redis } = require('../../../backend/src/system-configs/config/redis');
const { getTenantDb } = require('../../../backend/src/system-configs/database-tools/dbManager');
const jobHunterService = require('../../../backend/src/app-registry/job-hunter-app/job-discovery/job-hunter.service');

function setupAIWorker() {
    if (!redis) return null;

    const worker = new Worker('ai', async (job) => {
        const { userId, applicationId, profileId, jobOpportunityId, tenantId } = job.data;
        const tenantDb = await getTenantDb(tenantId);
        
        if (job.name === 'generate_cover_letter') {
            const profile = await tenantDb.jobCandidateProfile.findUnique({ where: { id: profileId } });
            const jobOpp = await tenantDb.jobOpportunity.findUnique({ where: { id: jobOpportunityId } });
            
            if (profile && jobOpp) {
                // The service function generateCoverLetter requires profile and job data
                const coverLetter = await jobHunterService.generateCoverLetter(profile, jobOpp);
                
                await tenantDb.jobApplication.update({
                    where: { id: applicationId },
                    data: {
                        customizedCoverLetter: coverLetter,
                        status: 'Applied'
                    }
                });

                // Notify via pub/sub for real-time WebSocket update
                await redis.publish('ims:ws-events', JSON.stringify({
                    event: 'AI_TASK_COMPLETED',
                    type: 'cover_letter_generated',
                    userId: userId,
                    tenantId: tenantId,
                    data: {
                        applicationId: applicationId,
                        status: 'Applied'
                    }
                }));
            }
        }
    }, { connection: redis, lockDuration: 60000 });

    worker.on('failed', (job, err) => console.error(`[Worker] AI job failed:`, err.message));
    worker.on('error', (err) => {
        if (err.message.includes('Command timed out') || err.message.includes('Stream isn\'t writeable')) return;
        console.error(`[Queue Worker Error: ai]`, err.message);
    });
    return worker;
}

module.exports = setupAIWorker;

