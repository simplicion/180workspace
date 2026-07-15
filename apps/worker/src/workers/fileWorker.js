'use strict';

const { Worker } = require('bullmq');
const { redis } = require('../../../backend/src/system-configs/config/redis');
const { getTenantDb } = require('../../../backend/src/system-configs/database-tools/dbManager');
const jobHunterService = require('../../../backend/src/app-registry/job-hunter-app/job-discovery/job-hunter.service');
const fs = require('fs');

function setupFileWorker() {
    if (!redis) return null;

    const worker = new Worker('fileProcessing', async (job) => {
        const { userId, filePath, mimetype, tenantId } = job.data;
        const tenantDb = await getTenantDb(tenantId);
        
        if (job.name === 'extract_resume') {
            try {
                // Read the file buffer from the temporary path
                const fileBuffer = fs.readFileSync(filePath);
                
                // Parse the resume
                const parsedProfileData = await jobHunterService.parseResumeFile(fileBuffer, mimetype);
                
                let profile = await tenantDb.jobCandidateProfile.findFirst({ where: { userId } });
                
                if (!profile) {
                    profile = await tenantDb.jobCandidateProfile.create({ 
                        data: { 
                            userId,
                            headline: parsedProfileData.headline || '',
                            summary: parsedProfileData.summary || '',
                            skills: parsedProfileData.skills || [],
                            experience: parsedProfileData.experience || [],
                            education: parsedProfileData.education || [],
                            projects: parsedProfileData.projects || []
                        } 
                    });
                } else {
                    profile = await tenantDb.jobCandidateProfile.update({
                        where: { id: profile.id },
                        data: {
                            headline: parsedProfileData.headline || profile.headline,
                            summary: parsedProfileData.summary || profile.summary,
                            skills: parsedProfileData.skills || profile.skills,
                            experience: parsedProfileData.experience || profile.experience,
                            education: parsedProfileData.education || profile.education,
                            projects: parsedProfileData.projects || profile.projects,
                        }
                    });
                }

                // Delete the temporary file
                fs.unlinkSync(filePath);

                // Notify via pub/sub for real-time WebSocket update
                await redis.publish('ims:ws-events', JSON.stringify({
                    event: 'FILE_TASK_COMPLETED',
                    type: 'resume_extracted',
                    userId,
                    tenantId,
                    data: {
                        profileId: profile.id
                    }
                }));
            } catch (err) {
                console.error(`[Worker] Resume extraction failed:`, err);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath); // Cleanup on error
                }
                throw err;
            }
        }
    }, { connection: redis, lockDuration: 60000 });

    worker.on('failed', (job, err) => console.error(`[Worker] File processing job failed:`, err.message));
    worker.on('error', (err) => {
        if (err.message.includes('Command timed out') || err.message.includes('Stream isn\'t writeable')) return;
        console.error(`[Queue Worker Error: file]`, err.message);
    });
    return worker;
}

module.exports = setupFileWorker;

