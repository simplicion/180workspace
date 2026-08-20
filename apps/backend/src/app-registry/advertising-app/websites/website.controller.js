'use strict';

const { WebsitesService } = require('@workspace/advertising');
const { logAction } = require('../../../system-configs/middleware/audit/audit.js');

/**
 * GET /api/websites
 * List all websites for the company.
 */
exports.getWebsites = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;
        const result = await WebsitesService.getWebsites(companyId);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/websites
 * Create a new website.
 */
exports.createWebsite = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;
        const userId = req.user.id;
        
        const website = await WebsitesService.createWebsite(userId, companyId, req.body);

        await logAction(userId, 'CREATE_WEBSITE', 'website', website.id, { name: website.name }, req);

        res.status(201).json({ website });
    } catch (err) {
        if (err.message === 'A website with this slug already exists.' || err.message === 'This company subdomain is already taken. Please try another one.') {
            return res.status(400).json({ error: err.message });
        }
        next(err);
    }
};

/**
 * GET /api/websites/:id
 */
exports.getWebsite = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;
        const website = await WebsitesService.getWebsite(companyId, req.params.id);

        res.json({ website });
    } catch (err) {
        if (err.message === 'Website not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

/**
 * PUT /api/websites/:id
 */
exports.updateWebsite = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;
        const website = await WebsitesService.updateWebsite(companyId, req.params.id, req.body);

        await logAction(req.user.id, 'UPDATE_WEBSITE', 'website', website.id, { name: website.name }, req);

        res.json({ website });
    } catch (err) {
        if (err.message === 'Website not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

/**
 * DELETE /api/websites/:id
 */
exports.deleteWebsite = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;
        // Fetch to get name for logAction before deleting
        const website = await WebsitesService.getWebsite(companyId, req.params.id);
        
        await WebsitesService.deleteWebsite(companyId, req.params.id);

        await logAction(req.user.id, 'DELETE_WEBSITE', 'website', website.id, { name: website.name }, req);

        res.json({ message: 'Website deleted' });
    } catch (err) {
        if (err.message === 'Website not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

/**
 * GET /api/websites/:id/leads
 */
exports.getWebsiteLeads = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;
        const leads = await WebsitesService.getWebsiteLeads(companyId, req.params.id);
        res.json({ leads });
    } catch (err) {
        if (err.message === 'Website not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

/**
 * GET /api/websites/:id/pixels
 */
exports.getWebsitePixels = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;
        const pixels = await WebsitesService.getWebsitePixels(companyId, req.params.id);
        res.json({ pixels });
    } catch (err) {
        if (err.message === 'Website not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

/**
 * POST /api/websites/:id/pixels
 */
exports.createWebsitePixel = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;
        const pixel = await WebsitesService.createWebsitePixel(companyId, req.params.id, req.body);
        res.status(201).json({ pixel });
    } catch (err) {
        if (err.message === 'Website not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

/**
 * GET /api/websites/:id/stats
 */
exports.getWebsiteStats = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;
        const stats = await WebsitesService.getWebsiteStats(companyId, req.params.id);
        res.json(stats);
    } catch (err) {
        if (err.message === 'Website not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

// --- Public Endpoints ---

/**
 * GET /api/public/websites/resolve
 * Used by the public template engine to fetch config.
 */
exports.publicGetWebsite = async (req, res, next) => {
    try {
        const { domain, slug } = req.query;
        const result = await WebsitesService.publicGetWebsite(domain, slug);
        res.json(result);
    } catch (err) {
        if (err.message === 'Domain is required') {
            return res.status(400).json({ error: err.message });
        }
        if (err.message === 'Company not found for this domain' || err.message === 'Website not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

const rateLimitCache = new Map();

/**
 * POST /api/public/websites/resolve/lead
 * Used by the public website to submit a lead.
 */
exports.publicSubmitLead = async (req, res, next) => {
    try {
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const now = Date.now();
        const limitInfo = rateLimitCache.get(ip) || { count: 0, firstRequest: now };

        if (now - limitInfo.firstRequest > 60000) {
            limitInfo.count = 0;
            limitInfo.firstRequest = now;
        }

        if (limitInfo.count >= 10) {
            return res.status(429).json({ error: 'Too many submissions. Please try again later.' });
        }

        limitInfo.count++;
        rateLimitCache.set(ip, limitInfo);

        const { domain, slug } = req.query;
        const userAgent = req.headers['user-agent'] || 'unknown';
        
        const { lead, website } = await WebsitesService.publicSubmitLead(domain, slug, req.body, ip, userAgent);

        res.status(201).json({ success: true, leadId: lead.id });
    } catch (err) {
        if (err.message === 'Domain is required') {
            return res.status(400).json({ error: err.message });
        }
        if (err.message === 'Company not found for this domain' || err.message === 'Website not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

exports.setPrimaryWebsite = async (req, res, next) => {
    try {
        const websiteId = req.params.id;
        const companyId = req.user.companyId;

        const updated = await WebsitesService.setPrimaryWebsite(companyId, websiteId);

        res.json({ message: 'Primary website updated successfully', website: updated });
    } catch (error) {
        if (error.message === 'Website not found or unauthorized') {
            return res.status(404).json({ error: error.message });
        }
        next(error);
    }
};

