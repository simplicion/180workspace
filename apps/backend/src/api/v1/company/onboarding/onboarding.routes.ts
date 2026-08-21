import { createNotification } from '@workspace/communications';
import { getIo } from '../../../../system-configs/sockets';
import { OnboardingService } from '@workspace/company';
import express from 'express';
const router = express.Router();
import { protect, requireAdminOrHR } from '../../../../system-configs/middleware/auth/auth';

// Get onboarding status for a specific user (or all if admin/HR)
router.get('/', protect, async (req, res, next) => {
    try {
        if (['admin', 'manager', 'hr'].includes(req.user.role)) {
            const onboardings = await OnboardingService.getOnboardingList();
            return res.json({ onboardings });
        }
        // Employee gets their own
        const onboarding = await OnboardingService.getOnboardingByEmployeeId(req.user.id);
        res.json({ onboarding });
    } catch (error) { next(error); }
});

// Create/initiate onboarding (usually called when candidate becomes employee)
router.post('/', protect, requireAdminOrHR, async (req, res, next) => {
    try {
        const { employeeId, recruitmentId } = req.body;
        const ob = await OnboardingService.createOnboarding(employeeId, recruitmentId);
        res.status(201).json({ onboarding: ob });
    } catch (error) { 
        if (error.message === 'Onboarding already exists for this employee') {
            return res.status(400).json({ error: error.message });
        }
        next(error); 
    }
});

// Update personal info (Step 1)
router.put('/:id/personal', protect, async (req, res, next) => {
    try {
        const updatedOb = await OnboardingService.updatePersonalInfo(req.params.id, req.user.id, req.user.role, req.body);
        res.json({ onboarding: updatedOb });
    } catch (error) { 
        if (error.message === 'Not found') return res.status(404).json({ error: 'Not found' });
        if (error.message === 'Not authorized') return res.status(403).json({ error: 'Not authorized' });
        next(error); 
    }
});

// Update documents (Step 2)
router.put('/:id/documents', protect, async (req, res, next) => {
    try {
        const updatedOb = await OnboardingService.updateDocuments(req.params.id, req.user.id, req.user.role, req.body);
        res.json({ onboarding: updatedOb });
    } catch (error) { 
        if (error.message === 'Not found') return res.status(404).json({ error: 'Not found' });
        if (error.message === 'Not authorized') return res.status(403).json({ error: 'Not authorized' });
        next(error); 
    }
});

// Complete onboarding (acknowledge welcome, Step 3)
router.put('/:id/complete', protect, async (req, res, next) => {
    try {
        const updatedOb = await OnboardingService.completeOnboarding(req.params.id, req.user.id, req.user.role);

        // Notify HR/Admin
        try {

            const admins = await OnboardingService.getCompanyAdminsAndHr(req.user.id);
            const io = getIo();

            for (const admin of admins) {
                await createNotification({
                    userId: admin.id,
                    type: 'alert',
                    title: 'Onboarding Complete 🎉',
                    message: `${req.user.name} has completed their onboarding process.`,
                    actionUrl: `/dashboard/employees/${req.user.id}`,
                    io,
                });
            }
        } catch (e) { /* swallow */ }

        res.json({ onboarding: updatedOb });
    } catch (error) { 
        if (error.message === 'Not found') return res.status(404).json({ error: 'Not found' });
        if (error.message === 'Not authorized') return res.status(403).json({ error: 'Not authorized' });
        next(error); 
    }
});

// Delete onboarding record
router.delete('/:id', protect, requireAdminOrHR, async (req, res, next) => {
    try {
        await OnboardingService.deleteOnboarding(req.params.id);
        res.json({ success: true });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'Not found' });
        next(error); 
    }
});

export default router;

