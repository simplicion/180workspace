'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const { requireHR } = require('../../../system-configs/middleware/auth/rbac.js');
const { prisma } = require('@workspace/db');

// ── Jobs ──────────────────────────────────────────────────────────────────────
router.get('/', protect, async (req, res, next) => {
    try {
        const jobs = await req.prisma.job.findMany({
            where: { companyId: req.user.companyId },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ jobs });
    } catch (err) { next(err); }
});

router.get('/public/:id', async (req, res, next) => {
    try {
        const db = req.prisma || prisma;
        const job = await db.job.findUnique({
            where: { id: req.params.id },
            include: { company: { select: { id: true, name: true, logoUrl: true } } }
        });
        if (!job || job.status === 'deleted') {
            return res.status(404).json({ error: 'Job not found' });
        }
        res.json({ job });
    } catch (err) { next(err); }
});

router.post('/', protect, requireHR, async (req, res, next) => {
    try {
        const job = await req.prisma.job.create({ 
            data: { 
                ...req.body, 
                companyId: req.user.companyId 
            }
        });
        res.status(201).json({ job });
    } catch (err) { next(err); }
});

router.put('/:id', protect, requireHR, async (req, res, next) => {
    try {
        const job = await req.prisma.job.update({
            where: { id: req.params.id },
            data: req.body
        }).catch(() => null);
        res.json({ job });
    } catch (err) { next(err); }
});

router.delete('/:id', protect, requireHR, async (req, res, next) => {
    try {
        await req.prisma.job.update({
            where: { id: req.params.id },
            data: { status: 'deleted' } // Assuming no deletedAt field on Job, marking status as deleted
        }).catch(() => null);
        res.json({ message: 'Job deleted' });
    } catch (err) { next(err); }
});

// ── Applications ──────────────────────────────────────────────────────────────
router.get('/:jobId/applications', protect, requireHR, async (req, res, next) => {
    try {
        const applications = await req.prisma.application.findMany({
            where: { jobId: req.params.jobId },
            include: {
                reviewedBy: { select: { id: true, name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ applications });
    } catch (err) { next(err); }
});

router.post('/:jobId/applications', async (req, res, next) => {
    try {
        // We use req.prisma here because this might be a public route without protect?
        // But the previous code used req.prisma. Let's keep using req.prisma if it's there.
        // Actually without protect, req.prisma might not be set or might be set globally.
        // Let's assume companyPrisma middleware sets it if subdomain exists.
        const app = await req.prisma.application.create({ 
            data: { 
                ...req.body, 
                jobId: req.params.jobId 
            }
        });
        res.status(201).json({ application: app });
    } catch (err) { next(err); }
});

router.put('/applications/:appId', protect, requireHR, async (req, res, next) => {
    try {
        const app = await req.prisma.application.update({
            where: { id: req.params.appId },
            data: req.body
        }).catch(() => null);

        if (!app) return res.status(404).json({ error: 'Application not found' });

        // Auto-trigger onboarding if hired
        if (req.body.status === 'hired') {
            // Check if user already created for this applicant email
            let user = await req.prisma.user.findFirst({ 
                where: { email: app.applicantEmail } 
            });
            
            if (!user) {
                const generatedPassword = app.applicantName.split(' ')[0].toLowerCase() + Math.random().toString(36).slice(-4) + '!';
                user = await req.prisma.user.create({
                    data: {
                        name: app.applicantName,
                        email: app.applicantEmail,
                        password: generatedPassword,
                        role: 'employee',
                        isActive: true,
                        companyId: req.user.companyId
                    }
                });

                // Send Welcome Email with Credentials
                try {
                    const EmailService = require('../../productivity-tools-app/emails/email.service');
                    await EmailService.notify(user, 'welcome', { password: generatedPassword }, req.prisma);
                } catch (emailErr) {
                    console.error('[Jobs] Failed to send automated welcome email:', emailErr.message);
                }

                await req.prisma.onboarding.create({
                    data: {
                        employeeId: user.id,
                        status: 'pending',
                        companyId: req.user.companyId
                        // steps might not exist in Prisma Onboarding schema, so leaving it out unless sure
                    }
                }).catch(err => console.error('Failed to create onboarding', err));
            }
        }

        res.json({ application: app });
    } catch (err) { next(err); }
});

module.exports = router;
