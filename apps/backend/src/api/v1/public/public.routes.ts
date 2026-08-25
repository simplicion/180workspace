'use strict';

import express from 'express';
const router = express.Router();
import * as publicController from './public.controller';
import { protect } from '../../../system-configs/middleware/auth/auth';
import { requireRole } from '../../../system-configs/middleware/auth/rbac';
import cacheResponse from '../../../system-configs/middleware/cache/redis-cache';
import { PublicService } from '@workspace/platform-admin';

// ── API Key Middleware ──────────────────────────────────────────────
const checkRecruitmentApiKey = async (req: any, res: any, next: any) => {
    try {
        const apiKey = req.headers['x-api-key'];
        const requestOrigin = req.headers.origin;

        const result = await PublicService.verifyRecruitmentApiKey(apiKey, requestOrigin);

        if (!result.success) {
            return res.status(result.status).json({
                error: result.error,
                detail: result.detail,
                tip: result.tip
            });
        }

        (req as any).company = result.company;
        next();
    } catch (err) {
        console.error('[Public API Auth Error]', err);
        next(err);
    }
};

// â”€â”€ Public Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * @route   GET /api/public/jobs
 * @desc    Fetch all open jobs for external listing
 * @access  Public (API Key Required)
 */
router.get('/jobs', checkRecruitmentApiKey, publicController.getPublicJobs);

/**
 * @route   GET /api/public/jobs/:id
 * @desc    Get job details for application form rendering
 * @access  Public (No API Key required, but ID needed)
 */
router.get('/jobs/:id', publicController.getPublicJobDetails);

/**
 * @route   POST /api/public/apply
 * @desc    Submit a job application
 * @access  Public
 */
router.post('/apply', publicController.submitApplication);

// â”€â”€ Platform Internal Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * @route   GET /api/public/api-key
 * @desc    Get the current API key (Admin/HR only)
 */
router.get('/api-key', protect, requireRole('admin', 'hr'), publicController.getApiKey);

/**
 * @route   POST /api/public/api-key/generate
 * @desc    Generate a new API key (Admin/HR only)
 */
router.post('/api-key/generate', protect, requireRole('admin', 'hr'), publicController.generateApiKey);

/**
 * @route   GET /api/public/branding
 * @desc    Fetch platform branding details
 * @access  Public
 */
router.get('/branding', cacheResponse(300), publicController.getBranding);

/**
 * @route   GET /api/public/explore-jobs
 * @desc    Fetch all open jobs across all companies for 180workspace users
 * @access  Public
 */
router.get('/explore-jobs', publicController.getExploreJobs);

/**
 * @route   GET /api/public/my-applications
 * @desc    Fetch job applications submitted by the logged-in user
 * @access  Protected
 */
router.get('/my-applications', protect, publicController.getMyApplications);

// --- Public Event Endpoints ---
router.get('/events', publicController.getPublicEvents);
router.get('/events/:id', publicController.getPublicEventDetails);
router.get('/events/:eventId/check-registration', publicController.checkRegistration);
router.post('/events/:eventId/register', publicController.submitEventRegistration);
// --- Domain Registry Endpoints ---
router.get('/domains/resolve', publicController.resolveDomain);

export default router;

