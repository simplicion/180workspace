'use strict';

import express from 'express';
const router = express.Router();
import * as publicController from './public.controller';
import { protect } from '../../../system-configs/middleware/auth/auth';
import { requireRole } from '../../../system-configs/middleware/auth/rbac';
import cacheResponse from '../../../system-configs/middleware/cache/redis-cache';

// ── Platform Internal Endpoints ──────────────────────────────────────────

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

// --- Public Event Endpoints ---
router.get('/events', publicController.getPublicEvents);
router.get('/events/:id', publicController.getPublicEventDetails);
router.get('/events/:eventId/check-registration', publicController.checkRegistration);
router.post('/events/:eventId/register', publicController.submitEventRegistration);
// --- Domain Registry Endpoints ---
router.get('/domains/resolve', publicController.resolveDomain);

// --- Public Marketing Blog Endpoints ---
router.get('/blogs', publicController.getPublicBlogs);
router.get('/blogs/:slug', publicController.getPublicBlogBySlug);
router.post('/blogs/:slug/view', publicController.recordBlogView);

// --- Public Payslip Access Endpoint ---
router.get('/payslips/:id', publicController.getPublicPayslip);

// --- Public SEO Tools Endpoints ---
import publicToolsRoutes from './public-tools.routes';
router.use('/tools', publicToolsRoutes);

export default router;



