'use strict';

const express = require('express');
const router = express.Router();
const publicController = require('./public.controller');
const { protect } = require('../../system-configs/middleware/auth/auth.js');
const { requireRole } = require('../../system-configs/middleware/auth/rbac.js');
const cacheResponse = require('../../system-configs/middleware/cache/redis-cache.js');
const { prisma, getCompanyPrisma } = require('@workspace/db');

// ── API Key Middleware ──────────────────────────────────────────────
const checkRecruitmentApiKey = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) {
            return res.status(401).json({ error: 'X-API-KEY header is required' });
        }

        // 1. Find the owner of this API key in the primary DB (Settings model with companyId)
        const settings = await prisma.settings.findFirst({
            where: { recruitmentApiKey: apiKey }
        });
        
        if (!settings || !settings.companyId) {
            console.warn(`[Public API] Invalid API key attempt: ${apiKey.substring(0, 8)}...`);
            return res.status(401).json({ error: 'Invalid or missing API key' });
        }

        // 2. If req.prisma doesn't exist, establish it manually
        if (!req.prisma) {
            const company = await prisma.company.findUnique({
                where: { id: settings.companyId }
            });
            if (!company) {
                 return res.status(404).json({ error: 'Workspace configuration not found for this API key' });
            }

            req.prisma = getCompanyPrisma(company.id);
            req.company = company;
        } else {
            // Check if the current company context matches the API key's company
            if (req.company?.id !== settings.companyId) {
                return res.status(403).json({ error: 'API key does not match current workspace context' });
            }
        }


        // 4. Domain Whitelisting Check (Security)
        const requestOrigin = req.headers.origin;
        // In PostgreSQL settings model, we parse authorizedRecruitmentDomains if stored as JSON or string array
        const whitelist = settings.authorizedRecruitmentDomains || [];
        
        if (whitelist.length > 0 && requestOrigin) {
            let originHost = '';
            try {
                if (requestOrigin === 'null') {
                    originHost = 'null';
                } else {
                    originHost = new URL(requestOrigin).hostname;
                }
            } catch (e) {
                originHost = requestOrigin.replace(/^https?:\/\//, '').split(':')[0].split('/')[0];
            }

            const isAuthorized = whitelist.some(domain => {
                const d = domain.trim().toLowerCase();
                
                if (requestOrigin.toLowerCase() === d) return true;

                let whitelistedHost = d;
                try {
                    if (d.includes('://')) {
                        whitelistedHost = new URL(d).hostname;
                    }
                } catch (e) { /* ignore */ }
                
                return originHost === whitelistedHost || originHost.endsWith(`.${whitelistedHost}`);
            });

            if (!isAuthorized) {
                console.warn(`[Public API Security] Blocked origin: ${requestOrigin} for company ${settings.companyId}`);
                
                let detail = `The origin '${originHost}' is not in the authorized domains whitelist.`;
                let tip = 'Update your Whitelisted Domains in the Recruitment Dashboard -> API Settings.';
                
                if (requestOrigin === 'null') {
                    detail = 'Your browser is sending a "null" origin.';
                    tip = 'This typically happens when opening HTML files directly from your computer (file:// protocol). Please use a local web server to test.';
                }

                return res.status(403).json({ 
                    error: 'Unauthorized Domain', 
                    detail,
                    tip
                });
            }
        }

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
 * @desc    Fetch all open jobs across all companies for Pitchin users
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

module.exports = router;
