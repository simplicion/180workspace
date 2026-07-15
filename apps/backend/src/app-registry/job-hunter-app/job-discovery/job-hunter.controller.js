'use strict';

const jobHunterService = require('./job-hunter.service');

exports.extractResume = async (req, res) => {
    try {
        const JobCandidateProfile = req.prisma.jobCandidateProfile;
        
        if (!req.file) {
            return res.status(400).json({ error: 'No resume file provided' });
        }

        const fs = require('fs');
        const path = require('path');
        const crypto = require('crypto');
        const { queueFileTask } = require('../../../platform-core/platform-engine/services/queue.service');
        
        // Save file to a temporary location
        const tmpDir = path.join(__dirname, '../../../../../../uploads/temp');
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }
        const fileName = `${crypto.randomUUID()}-${req.file.originalname}`;
        const filePath = path.join(tmpDir, fileName);
        fs.writeFileSync(filePath, req.file.buffer);

        // Queue the file processing task
        const tenantId = req.prisma?.companyId || 'global';
        const job = await queueFileTask('extract_resume', {
            userId: req.user.id,
            filePath,
            mimetype: req.file.mimetype
        }, tenantId);

        res.status(202).json({ 
            success: true, 
            message: 'Resume parsing started in the background. You will be notified when it completes.',
            jobId: job ? job.id : null
        });
    } catch (error) {
        console.error('[JobHunter] Extract Resume Error:', error);
        res.status(500).json({ error: 'Failed to extract resume' });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const JobCandidateProfile = req.prisma.jobCandidateProfile;
        
        let profile = await JobCandidateProfile.findFirst({ where: { userId: req.user.id } });
        if (!profile) {
            profile = await JobCandidateProfile.create({ data: { userId: req.user.id } });
        }
        
        res.status(200).json({ success: true, profile });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const JobCandidateProfile = req.prisma.jobCandidateProfile;
        
        let profile = await JobCandidateProfile.findFirst({ where: { userId: req.user.id } });
        
        if (profile) {
            profile = await JobCandidateProfile.update({
                where: { id: profile.id },
                data: req.body
            });
        } else {
            profile = await JobCandidateProfile.create({
                data: {
                    userId: req.user.id,
                    ...req.body
                }
            });
        }
        
        res.status(200).json({ success: true, profile });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

exports.getJobs = async (req, res) => {
    try {
        const JobOpportunity = req.prisma.jobOpportunity;
        
        // Return latest jobs (In reality, we would filter by preferences)
        const jobs = await JobOpportunity.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.status(200).json({ success: true, jobs });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
};

exports.triggerJobMatching = async (req, res) => {
    // This would trigger a background worker (e.g. n8n or BullMQ) to scrape RSS/APIs
    res.status(200).json({ success: true, message: 'Job matching started in background' });
};

exports.applyForJob = async (req, res) => {
    try {
        const { jobId } = req.body;
        const JobApplication = req.prisma.jobApplication;
        const JobCandidateProfile = req.prisma.jobCandidateProfile;
        const JobOpportunity = req.prisma.jobOpportunity;

        const profile = await JobCandidateProfile.findFirst({ where: { userId: req.user.id } });
        const job = await JobOpportunity.findUnique({ where: { id: jobId } });

        if (!profile || !job) {
            return res.status(404).json({ error: 'Profile or Job not found' });
        }

        // Create the application in a 'Processing' state
        const app = await JobApplication.create({
            data: {
                userId: req.user.id,
                candidateProfileId: profile.id,
                jobOpportunityId: job.id,
                customizedCoverLetter: 'Generating...',
                status: 'Processing',
                appliedDate: new Date()
            }
        });

        // Queue AI task
        const { queueAITask } = require('../../../platform-core/platform-engine/services/queue.service');
        const tenantId = req.prisma?.companyId || 'global';
        const queueJob = await queueAITask('generate_cover_letter', {
            userId: req.user.id,
            applicationId: app.id,
            profileId: profile.id,
            jobOpportunityId: job.id
        }, tenantId);

        res.status(202).json({ 
            success: true, 
            message: 'Job application processing started. Generating customized cover letter in the background.', 
            application: app,
            jobId: queueJob ? queueJob.id : null
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to apply for job' });
    }
};

exports.getApplications = async (req, res) => {
    try {
        const JobApplication = req.prisma.jobApplication;
        
        const applications = await JobApplication.findMany({
            where: { userId: req.user.id },
            include: { jobOpportunity: true },
            orderBy: { createdAt: 'desc' }
        });
            
        res.status(200).json({ success: true, applications });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
};
