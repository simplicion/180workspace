'use strict';

const { prisma, getCompanyPrisma } = require('@workspace/db');
const crypto = require('crypto');

/**
 * Get all open job postings (API Key protected)
 */
exports.getPublicJobs = async (req, res, next) => {
    try {
        const db = req.company ? getCompanyPrisma(req.company.id) : prisma;
        const jobs = await db.job.findMany({
            where: { status: 'open' },
            select: {
                id: true,
                title: true,
                description: true,
                department: true,
                type: true,
                location: true,
                roleCategory: true,
                openings: true,
                customFields: true,
                createdAt: true
            }
        });

        const protocol = req.protocol;
        const host = req.get('host');

        const jobsWithLinks = jobs.map(job => ({
            ...job,
            _id: job.id, // backward compatibility mapping
            applicationLink: `${protocol}://${host}/jobs/apply/${job.id}`
        }));

        res.json({ jobs: jobsWithLinks });
    } catch (err) {
        next(err);
    }
};

/**
 * Get a single job's details for the public application form
 */
exports.getPublicJobDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const companyId = req.query.companyId;

        let db = req.company ? getCompanyPrisma(req.company.id) : prisma;

        if (!db && companyId) {
            db = getCompanyPrisma(companyId);
        }

        if (!db) {
            // Attempt to search primary DB if supported
            db = req.company ? getCompanyPrisma(req.company.id) : prisma;
        }


        const job = await db.job.findUnique({
            where: { id: id },
            select: {
                id: true,
                title: true,
                description: true,
                department: true,
                type: true,
                location: true,
                roleCategory: true,
                customFields: true,
                status: true,
                experienceLevel: true,
                workModel: true,
                currency: true,
                salaryRangeMin: true,
                salaryRangeMax: true,
                createdAt: true,
                company: {
                    select: {
                        name: true,
                        logoUrl: true,
                        bannerUrl: true,
                        industry: true,
                        headquarters: true,
                        country: true
                    }
                }
            }
        });

        if (!job || job.status === 'closed') {
            return res.status(404).json({ error: 'Job not found or already closed' });
        }

        res.json({
            job: {
                ...job,
                _id: job.id // backward compatibility mapping
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Submit a job application (Public)
 */
exports.submitApplication = async (req, res, next) => {
    try {
        
        const { jobId, applicantName, applicantEmail, phone, resumeUrl, coverLetter, customFields } = req.body;

        if (!jobId || !applicantName || !applicantEmail) {
            return res.status(400).json({ error: 'Missing required applicant fields' });
        }

        const job = await db.job.findUnique({ where: { id: jobId } });
        if (!job || job.status !== 'open') {
            return res.status(404).json({ error: 'Job is no longer open for applications' });
        }

        // Try to auto-link to a Pitchin user if they exist
        let userId = null;
        const existingUser = await prisma.user.findUnique({ where: { email: applicantEmail } });
        if (existingUser) {
            userId = existingUser.id;
        }

        const application = await db.application.create({
            data: {
                jobId,
                applicantName,
                applicantEmail,
                userId,
                phone: phone || '',
                resumeUrl: resumeUrl || '',
                coverLetter: coverLetter || '',
                customFields: customFields || {}
            }
        });

        res.status(201).json({
            message: 'Application submitted successfully',
            applicationId: application.id
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Manage API Key (Platform Internal)
 */
exports.getApiKey = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId || req.company?.id;
        if (!companyId) return res.status(401).json({ error: 'Company context required' });

        const settings = await prisma.settings.findFirst({ where: { companyId } });
        res.json({ apiKey: settings?.recruitmentApiKey || '' });
    } catch (err) {
        next(err);
    }
};

exports.generateApiKey = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId || req.company?.id;
        if (!companyId) return res.status(401).json({ error: 'Company context required' });

        const newKey = crypto.randomBytes(32).toString('hex');
        await prisma.settings.upsert({
            where: { companyId },
            update: { recruitmentApiKey: newKey },
            create: { companyId, recruitmentApiKey: newKey }
        });
        res.json({ apiKey: newKey });
    } catch (err) {
        next(err);
    }
};

/**
 * Get Platform Branding (Public)
 */
exports.getBranding = async (req, res, next) => {
    try {
        const workspace = req.subdomain || req.query.workspace || null;
        let ps = await prisma.platformSettings.findFirst();
        if (!ps) {
            ps = {
                platformName: '180workspace',
                logoUrl: '',
                faviconUrl: '',
                supportEmail: '',
                companyPhone: '',
                currency: 'USD',
                themeColor: '#4f46e5',
                brandingTagline: 'Management System',
                companyAddress: '',
                companyWebsite: '',
                companyLegalName: ''
            };
        }

        // Base branding from Platform (Superadmin)
        let branding = {
            name: ps.platformName || '180workspace',
            logo: ps.logoUrl || '',
            favicon: ps.faviconUrl || '',
            email: ps.supportEmail || '',
            phone: ps.companyPhone || '',
            currency: ps.currency || 'USD',
            themeColor: ps.themeColor || '#4f46e5',
            tagline: ps.brandingTagline || 'Management System',
            address: ps.companyAddress || '',
            website: ps.companyWebsite || '',
            legalName: ps.companyLegalName || '',
            isCompany: false
        };

        // If workspace (slug) is provided, attempt to fetch Company Branding
        if (workspace) {
            const company = await prisma.company.findFirst({
                where: { slug: workspace.toLowerCase() }
            });

            if (company) {
                const companyPrisma = getCompanyPrisma(company.id);
                // Get Settings / CompanyConfig in Postgres
                const config = await companyPrisma.settings.findFirst();


                if (config) {
                    branding = {
                        ...branding,
                        name: config.companyName || branding.name,
                        logo: config.logoUrl || branding.logo,
                        themeColor: config.themeColor || branding.themeColor,
                        phone: ps.companyPhone || branding.phone,
                        email: branding.email,
                        address: branding.address,
                        website: branding.website,
                        isCompany: true
                    };
                }
            }
        }

        res.json(branding);
    } catch (err) {
        next(err);
    }
};

/**
 * Fetch all open jobs across all companies for Pitchin Explore tab
 */
exports.getExploreJobs = async (req, res, next) => {
    try {
        const db = req.company ? getCompanyPrisma(req.company.id) : prisma;
        const jobs = await db.job.findMany({
            where: { status: 'open' },
            include: {
                company: {
                    select: {
                        name: true,
                        logoUrl: true,
                        industry: true,
                        headquarters: true,
                        country: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ success: true, jobs });
    } catch (err) {
        next(err);
    }
};

/**
 * Fetch job applications submitted by the logged-in user
 */
exports.getMyApplications = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        
        const applications = await prisma.application.findMany({
            where: { userId },
            include: {
                job: {
                    include: {
                        company: {
                            select: {
                                name: true,
                                logo: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ success: true, applications });
    } catch (err) {
        next(err);
    }
};

/**
 * Get all upcoming public events globally
 */
exports.getPublicEvents = async (req, res, next) => {
    try {
        let db = req.company ? getCompanyPrisma(req.company.id) : prisma;
        if (!db) {
            db = require('@workspace/db').prisma;
        }

        const events = await db.event.findMany({
            where: { status: 'upcoming' },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                        logoUrl: true
                    }
                }
            },
            orderBy: { eventDate: 'asc' }
        });

        res.json({ success: true, data: events });
    } catch (err) {
        next(err);
    }
};

/**
 * Get public event details
 */
exports.getPublicEventDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        let db = req.company ? getCompanyPrisma(req.company.id) : prisma;
        if (!db) {
            db = require('@workspace/db').prisma;
        }

        const event = await db.event.findUnique({
            where: { id },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                        logoUrl: true,
                        oneLineDescription: true
                    }
                }
            }
        });

        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        res.json({ success: true, data: event });
    } catch (err) {
        next(err);
    }
};

/**
 * Check if a user is registered for an event
 */
exports.checkRegistration = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const { email } = req.query;
        let db = req.company ? getCompanyPrisma(req.company.id) : prisma;
        if (!db) {
            db = require('@workspace/db').prisma;
        }

        if (!email) {
            return res.json({ isRegistered: false });
        }

        const registration = await db.eventRegistration.findFirst({
            where: { eventId, email }
        });

        res.json({ isRegistered: !!registration });
    } catch (err) {
        next(err);
    }
};

/**
 * Register for an event
 */
exports.submitEventRegistration = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const registrationData = req.body;
        
        let db = req.company ? getCompanyPrisma(req.company.id) : prisma;
        if (!db) {
            db = require('@workspace/db').prisma;
        }

        const event = await db.event.findUnique({ where: { id: eventId } });
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        const existingRegistration = await db.eventRegistration.findFirst({
            where: { eventId, email: registrationData.email }
        });
        if (existingRegistration) {
            return res.status(400).json({ success: false, message: 'You have already registered for this event.' });
        }

        const registration = await db.eventRegistration.create({
            data: {
                eventId,
                name: registrationData.name,
                email: registrationData.email,
                phone: registrationData.phone,
                customData: registrationData.customData || {}
            }
        });

        res.status(201).json({ success: true, data: registration });
    } catch (err) {
        next(err);
    }
};
