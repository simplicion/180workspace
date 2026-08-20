const { prisma } = require('@workspace/db');
﻿const express = require('express');
const router = express.Router();
const { protect, requireAdminOrHR } = require('../../system-configs/middleware/auth/auth.js');

// Get onboarding status for a specific user (or all if admin/HR)
router.get('/', protect, async (req, res, next) => {
    try {
        if (['admin', 'manager', 'hr'].includes(req.user.role)) {
            const list = await prisma.onboarding.findMany({
                include: { employee: { select: { name: true, email: true, department: true, role: true } } }
            });
            return res.json({ onboardings: list });
        }
        // Employee gets their own
        const ob = await prisma.onboarding.findUnique({
            where: { employeeId: req.user.id },
            include: { employee: { select: { name: true, email: true, department: true, role: true } } }
        });
        res.json({ onboarding: ob });
    } catch (error) { next(error); }
});

// Create/initiate onboarding (usually called when candidate becomes employee)
router.post('/', protect, requireAdminOrHR, async (req, res, next) => {
    try {
        const { employeeId, recruitmentId } = req.body;

        let ob = await prisma.onboarding.findUnique({ where: { employeeId } });
        if (ob) return res.status(400).json({ error: 'Onboarding already exists for this employee' });

        ob = await prisma.onboarding.create({
            data: { employeeId, recruitmentId, status: 'pending', step: 1 }
        });
        res.status(201).json({ onboarding: ob });
    } catch (error) { next(error); }
});

// Update personal info (Step 1)
router.put('/:id/personal', protect, async (req, res, next) => {
    try {
        const ob = await prisma.onboarding.findUnique({ where: { id: req.params.id } });
        if (!ob) return res.status(404).json({ error: 'Not found' });
        if (ob.employeeId !== req.user.id && !['admin', 'hr'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const currentPersonalInfo = typeof ob.personalInfo === 'object' && ob.personalInfo !== null ? ob.personalInfo : {};
        const updatedOb = await prisma.onboarding.update({
            where: { id: req.params.id },
            data: {
                personalInfo: { ...currentPersonalInfo, ...req.body },
                step: 2,
                status: 'in_progress'
            }
        });
        res.json({ onboarding: updatedOb });
    } catch (error) { next(error); }
});

// Update documents (Step 2)
router.put('/:id/documents', protect, async (req, res, next) => {
    try {
        const ob = await prisma.onboarding.findUnique({ where: { id: req.params.id } });
        if (!ob) return res.status(404).json({ error: 'Not found' });
        if (ob.employeeId !== req.user.id && !['admin', 'hr'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const currentDocuments = typeof ob.documents === 'object' && ob.documents !== null ? ob.documents : {};
        const updatedOb = await prisma.onboarding.update({
            where: { id: req.params.id },
            data: {
                documents: { ...currentDocuments, ...req.body },
                step: 3
            }
        });
        res.json({ onboarding: updatedOb });
    } catch (error) { next(error); }
});

// Complete onboarding (acknowledge welcome, Step 3)
router.put('/:id/complete', protect, async (req, res, next) => {
    try {
        const ob = await prisma.onboarding.findUnique({ where: { id: req.params.id } });
        if (!ob) return res.status(404).json({ error: 'Not found' });
        if (ob.employeeId !== req.user.id && !['admin', 'hr'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const updatedOb = await prisma.onboarding.update({
            where: { id: req.params.id },
            data: {
                welcomeAcknowledgedAt: new Date(),
                completedAt: new Date(),
                status: 'complete'
            }
        });

        // Notify HR/Admin
        try {
            const { createNotification } = require('../../platform-core/platform-communications/services/notify');
            const { getIo } = require('../../system-configs/sockets');

            const admins = await prisma.user.findMany({
                where: { role: { in: ['admin', 'hr'] } },
                select: { id: true }
            });
            const io = getIo();

            for (const admin of admins) {
                await createNotification({
                    userId: admin.id,
                    type: 'alert',
                    title: 'Onboarding Complete ðŸŽŠ',
                    message: `${req.user.name} has completed their onboarding process.`,
                    actionUrl: `/dashboard/employees/${req.user.id}`,
                    io,
                });
            }
        } catch (e) { /* swallow */ }

        res.json({ onboarding: updatedOb });
    } catch (error) { next(error); }
});

// Delete onboarding record
router.delete('/:id', protect, requireAdminOrHR, async (req, res, next) => {
    try {
        await prisma.onboarding.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'Not found' });
        next(error); 
    }
});

module.exports = router;
