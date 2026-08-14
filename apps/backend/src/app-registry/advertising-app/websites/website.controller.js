'use strict';

const { prisma: globalPrisma, getCompanyPrisma } = require('@workspace/db');
const { logAction } = require('../../../system-configs/middleware/audit/audit.js');

/**
 * GET /api/websites
 * List all websites for the company.
 */
exports.getWebsites = async (req, res, next) => {
    try {
        const Website = req.prisma.website;
        const websites = await Website.findMany({ orderBy: { createdAt: 'desc' } });
        
        // Fetch company to get slug/customDomain for URL generation
        let companySlug = '';
        let customDomain = null;
        try {
            const company = await globalPrisma.company.findUnique({ where: { id: req.user.companyId } });
            if (company) {
                companySlug = company.slug;
                customDomain = company.customDomain;
            }
        } catch (e) {}

        res.json({ websites, company: { slug: companySlug, customDomain } });
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
        const { name, slug, template, companySlug } = req.body;

        // Check for existing slug in websites
        const existing = await Website.findFirst({ where: { slug } });
        if (existing) {
            return res.status(400).json({ error: 'A website with this slug already exists.' });
        }

        const count = await Website.count({ where: { companyId: req.user.companyId } });
        const isFirstWebsite = count === 0;

        // Contextual Domain Assignment for First Website
        if (isFirstWebsite && companySlug) {
            const existingCompany = await globalPrisma.company.findFirst({
                where: {
                    slug: companySlug,
                    id: { not: req.user.companyId }
                }
            });

            if (existingCompany) {
                return res.status(400).json({ error: 'This company subdomain is already taken. Please try another one.' });
            }

            // Update the company's slug
            await globalPrisma.company.update({
                where: { id: req.user.companyId },
                data: { slug: companySlug }
            });
        }

        // Data-First Auto-Fill: Initialize with default structured sections
        const initialConfig = {
            brand: { primaryColor: '#4f46e5', font: 'inter' },
            sections: [
                { id: 'sec-' + Date.now() + '-1', type: 'hero', data: { title: name, subtitle: 'Welcome to our business.', buttonText: 'Contact Us' } },
                { id: 'sec-' + Date.now() + '-2', type: 'services', data: { items: [{ title: 'Our Core Service', description: 'Description of what we do best.' }] } },
                { id: 'sec-' + Date.now() + '-3', type: 'about', data: { content: 'We are a dedicated team providing top-notch services.' } },
                { id: 'sec-' + Date.now() + '-4', type: 'contact', data: { email: 'hello@example.com', phone: '1-800-000-0000' } }
            ]
        };

        const website = await Website.create({ data: {
            name,
            slug,
            template: template || 'default',
            config: req.body.config || initialConfig,
            owner: req.user.id,
            companyId: req.user.companyId,
            status: 'active',
            isPrimary: isFirstWebsite
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
        const website = await Website.findUnique({ 
            where: { id: req.params.id }
        });
        if (!website) return res.status(404).json({ error: 'Website not found' });

        try {
            const company = await globalPrisma.company.findUnique({ where: { id: req.user.companyId } });
            if (company) {
                website.company = company;
            }
        } catch (e) {}

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
        const { name, slug, template, config, status, isPrimary } = req.body;
        
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (slug !== undefined) updateData.slug = slug;
        if (template !== undefined) updateData.template = template;
        if (config !== undefined) updateData.config = config;
        if (status !== undefined) updateData.status = status;

        if (isPrimary === true) {
            updateData.isPrimary = true;
            // Get the website to know its companyId
            const currentWebsite = await Website.findUnique({ where: { id: req.params.id } });
            if (currentWebsite) {
                // Set all other websites for this company to not be primary
                await Website.updateMany({
                    where: { companyId: currentWebsite.companyId, id: { not: req.params.id } },
                    data: { isPrimary: false }
                });
            }
        }

        const website = await Website.update({ 
            where: { id: req.params.id }, 
            data: updateData 
        });
        
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
        const WebsiteFormSubmission = req.prisma.websiteFormSubmission;
        const leads = await WebsiteFormSubmission.findMany({ where: { websiteId: req.params.id }, orderBy: { createdAt: 'desc' } });
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
        const WebsiteFormSubmission = req.prisma.websiteFormSubmission;
        const websiteId = req.params.id;

        const website = await Website.findUnique({ where: { id: websiteId } });
        if (!website) return res.status(404).json({ error: 'Website not found' });

        // Get leads over time (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentLeads = await WebsiteFormSubmission.findMany({
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
        const groupedStatus = await WebsiteFormSubmission.groupBy({
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
 * GET /api/public/websites/resolve
 * Used by the public template engine to fetch config.
 */
exports.publicGetWebsite = async (req, res, next) => {
    try {
        const prismaClient = req.prisma || globalPrisma;
        const { domain, slug } = req.query;
        
        if (!domain) return res.status(400).json({ error: 'Domain is required' });

        let resolvedSlug = slug;
        
        const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || '';
        const isSubdomain = domain.includes(rootDomain) || domain.includes('localhost');
        const subdomainSlug = isSubdomain ? domain.split('.')[0] : null;

        let company = await prismaClient.company.findFirst({
            where: {
                OR: [
                    { customDomain: domain },
                    { slug: subdomainSlug }
                ]
            }
        });

        // If not found by exact match, check for wildcard subdomain on custom domain
        if (!company && !isSubdomain) {
            const parts = domain.split('.');
            if (parts.length > 2) {
                const baseDomain = parts.slice(1).join('.');
                company = await prismaClient.company.findFirst({ where: { customDomain: baseDomain }});
                if (company && !resolvedSlug) {
                    // Extract the subdomain as the website slug
                    resolvedSlug = parts[0];
                }
            }
        }

        if (!company) return res.status(404).json({ error: 'Company not found for this domain' });

        let website;
        if (resolvedSlug) {
            website = await prismaClient.website.findFirst({
                where: { companyId: company.id, slug: resolvedSlug, status: 'active' }
            });
        } else {
            website = await prismaClient.website.findFirst({
                where: { companyId: company.id, isPrimary: true, status: 'active' }
            });
        }

        if (!website) return res.status(404).json({ error: 'Website not found' });

        // Increment view count (fire and forget)
        (async () => {
            try {
                const w = await prismaClient.website.findUnique({ where: { id: website.id } });
                if (w) {
                    const stats = w.stats || { views: 0, leads: 0 };
                    stats.views = (stats.views || 0) + 1;
                    await prismaClient.website.update({ where: { id: website.id }, data: { stats } });
                }
            } catch(e) {}
        })();

        const pixels = await prismaClient.pixel.findMany({
            where: { websiteId: website.id, status: 'active' }
        });

        res.json({ website, pixels });
    } catch (err) {
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

        const prismaClient = req.prisma || globalPrisma;
        const { domain, slug } = req.query;
        
        if (!domain) return res.status(400).json({ error: 'Domain is required' });

        const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || '';
        const isSubdomain = domain.includes(rootDomain) || domain.includes('localhost');
        const subdomainSlug = isSubdomain ? domain.split('.')[0] : null;

        const company = await prismaClient.company.findFirst({
            where: {
                OR: [
                    { customDomain: domain },
                    { slug: subdomainSlug }
                ]
            }
        });

        if (!company) return res.status(404).json({ error: 'Company not found for this domain' });

        let website;
        if (slug) {
            website = await prismaClient.website.findFirst({
                where: { companyId: company.id, slug, status: 'active' }
            });
        } else {
            website = await prismaClient.website.findFirst({
                where: { companyId: company.id, isPrimary: true, status: 'active' }
            });
        }

        if (!website) {
            return res.status(404).json({ error: 'Website not found' });
        }
        
        const companyPrisma = req.prisma || getCompanyPrisma(website.companyId);

        const lead = await companyPrisma.websiteFormSubmission.create({ data: {

            ...req.body,
            websiteId: website.id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        } });

        // Increment lead count
        const stats = website.stats || { views: 0, leads: 0 };
        stats.leads = (stats.leads || 0) + 1;
        await prismaClient.website.update({ where: { id: website.id }, data: { stats } });

        // Emit global event for CRM Integration
        const eventBus = require('../../../system-configs/utils/eventBus');
        eventBus.emit('website.lead.captured', { lead, website });

        res.status(201).json({ success: true, leadId: lead.id });
    } catch (err) {
        next(err);
    }
};

exports.setPrimaryWebsite = async (req, res, next) => {
    try {
        const prismaClient = req.prisma || globalPrisma;
        const websiteId = req.params.id;
        const companyId = req.user.companyId;

        // First verify the website exists and belongs to the company
        const website = await prismaClient.website.findUnique({
            where: { id: websiteId }
        });

        if (!website || website.companyId !== companyId) {
            return res.status(404).json({ error: 'Website not found or unauthorized' });
        }

        // Set all other websites in this company to isPrimary: false
        await prismaClient.website.updateMany({
            where: { companyId },
            data: { isPrimary: false }
        });

        // Set this website to isPrimary: true
        const updated = await prismaClient.website.update({
            where: { id: websiteId },
            data: { isPrimary: true }
        });

        res.json({ message: 'Primary website updated successfully', website: updated });
    } catch (error) {
        next(error);
    }
};
