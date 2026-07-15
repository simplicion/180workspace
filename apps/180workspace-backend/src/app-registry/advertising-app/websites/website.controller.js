'use strict';

const { logAction } = require('../../../system-configs/middleware/audit/audit.js');

/**
 * GET /api/websites
 * List all websites for the tenant.
 */
exports.getWebsites = async (req, res, next) => {
    try {
        const Website = req.prisma.website;
        const websites = await Website.findMany({ orderBy: { createdAt: 'desc' } });
        res.json({ websites });
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
        const Website = req.prisma.website;
        const { name, slug, template } = req.body;

        // Check for existing slug
        const existing = await Website.findFirst({ where: { slug } });
        if (existing) {
            return res.status(400).json({ error: 'A website with this slug already exists.' });
        }

        const website = await Website.create({ data: {
            name,
            slug,
            template,
            owner: req.user.id,
            status: 'active'
        } });

        await logAction(req.user.id, 'CREATE_WEBSITE', 'website', website.id, { name: website.name }, req);

        res.status(201).json({ website });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/websites/:id
 */
exports.getWebsite = async (req, res, next) => {
    try {
        const Website = req.prisma.website;
        const website = await Website.findUnique({ where: { id: req.params.id } });
        if (!website) return res.status(404).json({ error: 'Website not found' });
        res.json({ website });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/websites/:id
 */
exports.updateWebsite = async (req, res, next) => {
    try {
        const Website = req.prisma.website;
        const website = await Website.update({ where: { id: req.params.id }, data: req.body });
        if (!website) return res.status(404).json({ error: 'Website not found' });

        await logAction(req.user.id, 'UPDATE_WEBSITE', 'website', website.id, { name: website.name }, req);

        res.json({ website });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/websites/:id
 */
exports.deleteWebsite = async (req, res, next) => {
    try {
        const Website = req.prisma.website;
        const website = await Website.delete({ where: { id: req.params.id } });
        if (!website) return res.status(404).json({ error: 'Website not found' });

        await logAction(req.user.id, 'DELETE_WEBSITE', 'website', website.id, { name: website.name }, req);

        res.json({ message: 'Website deleted' });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/websites/:id/leads
 */
exports.getWebsiteLeads = async (req, res, next) => {
    try {
        const WebsiteLead = req.prisma.websiteLead;
        const leads = await WebsiteLead.findMany({ where: { websiteId: req.params.id }, orderBy: { createdAt: 'desc' } });
        res.json({ leads });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/websites/:id/pixels
 */
exports.getWebsitePixels = async (req, res, next) => {
    try {
        const Pixel = req.prisma.pixel;
        const pixels = await Pixel.findMany({ where: { websiteId: req.params.id } });
        res.json({ pixels });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/websites/:id/pixels
 */
exports.createWebsitePixel = async (req, res, next) => {
    try {
        const Pixel = req.prisma.pixel;
        const pixel = await Pixel.create({ data: {
            ...req.body,
            websiteId: req.params.id
        } });
        res.status(201).json({ pixel });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/websites/:id/stats
 */
exports.getWebsiteStats = async (req, res, next) => {
    try {
        if (!req.prisma) return res.status(500).json({ error: 'Database connection not available.' });
        
        const Website = req.prisma.website;
        const WebsiteLead = req.prisma.websiteLead;
        const websiteId = req.params.id;

        const website = await Website.findUnique({ where: { id: websiteId } });
        if (!website) return res.status(404).json({ error: 'Website not found' });

        // Get leads over time (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentLeads = await WebsiteLead.findMany({
            where: { websiteId: website.id, createdAt: { gte: thirtyDaysAgo } },
            select: { createdAt: true },
            orderBy: { createdAt: 'asc' }
        });

        const leadsMap = {};
        for (const lead of recentLeads) {
            const dateStr = lead.createdAt.toISOString().slice(0, 10);
            leadsMap[dateStr] = (leadsMap[dateStr] || 0) + 1;
        }

        const leadsOverTime = Object.keys(leadsMap).sort().map(date => ({
            _id: date,
            count: leadsMap[date]
        }));

        // Status breakdown
        const groupedStatus = await WebsiteLead.groupBy({
            by: ['status'],
            where: { websiteId: website.id },
            _count: { _all: true }
        });
        
        const statusBreakdown = groupedStatus.map(item => ({
            _id: item.status,
            count: item._count._all
        }));

        res.json({
            views: website.stats?.views || 0,
            leads: website.stats?.leads || 0,
            leadsOverTime,
            statusBreakdown
        });
    } catch (err) {
        next(err);
    }
};

// --- Public Endpoints ---

/**
 * GET /api/public/websites/:slug
 * Used by the public template engine to fetch config.
 */
exports.publicGetWebsite = async (req, res, next) => {
    try {
        if (!req.prisma) {
            return res.status(404).json({ error: 'Workspace not found. Please access this site via your workspace subdomain.' });
        }

        const Website = req.prisma.website;
        const Pixel = req.prisma.pixel;

        const website = await Website.findFirst({ where: { slug: req.params.slug, status: 'active' } });
        if (!website) return res.status(404).json({ error: 'Website not found' });

        // Increment view count (fire and forget)
        // Prisma Json update is complex for incrementing nested fields; just read/write or ignore for now, this was a fire and forget
        // Doing a manual fetch and update:
        (async () => {
            try {
                const w = await Website.findUnique({ where: { id: website.id } });
                if (w) {
                    const stats = w.stats || { views: 0, leads: 0 };
                    stats.views = (stats.views || 0) + 1;
                    await Website.update({ where: { id: website.id }, data: { stats } });
                }
            } catch(e) {}
        })();

        const pixels = await Pixel.findMany({ where: { websiteId: website.id, status: 'active' } });

        res.json({ website, pixels });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/public/websites/:slug/lead
 * Used by the public website to submit a lead.
 */
exports.publicSubmitLead = async (req, res, next) => {
    try {
        if (!req.prisma) {
            return res.status(404).json({ error: 'Workspace not found. Please access this site via your workspace subdomain.' });
        }

        const Website = req.prisma.website;
        const WebsiteLead = req.prisma.websiteLead;

        const website = await Website.findFirst({ where: { slug: req.params.slug, status: 'active' } });
        if (!website) return res.status(404).json({ error: 'Website not found' });

        const lead = await WebsiteLead.create({ data: {
            ...req.body,
            websiteId: website.id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        } });

        // Increment lead count
        const stats = website.stats || { views: 0, leads: 0 };
        stats.leads = (stats.leads || 0) + 1;
        await Website.update({ where: { id: website.id }, data: { stats } });

        // Optional: Trigger notification or CRM sync here

        res.status(201).json({ success: true, leadId: lead.id });
    } catch (err) {
        next(err);
    }
};
