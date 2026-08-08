'use strict';

/**
 * Company Profile Controller
 */
const companyFinancialsService = require('./company-financials.service');
const companyEvaluationService = require('./company-evaluation.service');
const { getCompanyPrisma } = require('@workspace/db');


// We use Prisma from req.prisma

exports.updateProfile = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const data = req.body;
        
        // Ensure privacySettings is stored correctly as JSON
        if (data.privacySettings && typeof data.privacySettings !== 'object') {
            try {
                data.privacySettings = JSON.parse(data.privacySettings);
            } catch(e) {
                // Ignore parse errors, fallback
            }
        }
        
        // Ensure socialLinks is stored correctly as JSON
        if (data.socialLinks && typeof data.socialLinks !== 'object') {
            try {
                data.socialLinks = JSON.parse(data.socialLinks);
            } catch(e) {
                // Ignore
            }
        }


        // We only allow updating these specific fields to prevent overwriting sensitive admin fields
        const allowedFields = [
            'name', 'slug', 'logoUrl', 'bannerUrl', 'oneLineDescription', 'industry', 'startupStage', 'teamSize', 'website', 'customDomain',
            'foundedDate', 'companyType', 'tagline', 'headquarters', 'otherOffices', 'aboutUs', 'socialLinks',
            'totalFunding', 'fundingStage', 'businessStatus', 'burnRate', 'runway', 'annualRevenue', 'revenueGrowth',
            'lastRound', 'lastValued', 'leadInvestor', 'productsBuilt', 'happyClients', 'countriesActive',
            'awardsCount', 'topRecognition', 'privacySettings', 'companyHighlights', 'adminEmail', 'adminPhone'
        ];

        const updateData = {};
        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                updateData[field] = data[field];
            }
        }

        // foundedDate should be Date object or null if empty
        if (updateData.foundedDate !== undefined) {
            if (updateData.foundedDate === '') {
                updateData.foundedDate = null;
            } else {
                updateData.foundedDate = new Date(updateData.foundedDate);
            }
        }

        if (updateData.customDomain === '') {
            updateData.customDomain = null;
        }

        if (updateData.slug === '') {
            updateData.slug = null;
        }

        const updatedCompany = await req.prisma.company.update({
            where: { id: companyId },
            data: updateData
        });

        const companyPrismaMiddleware = require('../../../system-configs/middleware/company/company-db');
        await companyPrismaMiddleware.clearCompanyCache(companyId);

        res.json({ success: true, data: updatedCompany });
    } catch (error) {
        console.error('Update company profile error:', error);
        res.status(500).json({ success: false, message: 'Server error updating profile.', error: error.message });
    }
};

exports.getPrivateProfile = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const company = await req.prisma.company.findUnique({
            where: { id: companyId },
            include: {
                services: true,
                investors: true,
                _count: {
                    select: { users: true }
                },
                users: {
                    select: {
                        id: true,
                        name: true,
                        title: true,
                        department: true,
                        image: true,
                        bio: true,
                        socialLinks: true,
                        highlights: true
                    }
                }
            }
        });

        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found.' });
        }

        // Calculate dynamic fields
        const financials = await companyFinancialsService.calculateFinancials(req.prisma, companyId);
        const teamGrowth = await companyFinancialsService.calculateTeamGrowth(req.prisma, companyId);
        const startupStage = companyEvaluationService.evaluateStartupStage(company, company._count.users);

        company.calculatedFinancials = financials;
        company.teamGrowth = teamGrowth;
        company.evaluatedStartupStage = startupStage;

        try {
            const companyPrisma = getCompanyPrisma(companyId);
            const jobs = await companyPrisma.job.findMany({ where: { status: 'open' } });
            company.jobs = jobs;
        } catch (e) {

            console.error('Failed to fetch jobs for private profile:', e);
            company.jobs = [];
        }

        res.json({ success: true, data: company });
    } catch (error) {
        console.error('Get private profile error:', error);
        res.status(500).json({ success: false, message: 'Server error retrieving profile.' });
    }
};

exports.getPublicProfile = async (req, res) => {
    try {
        const companyId = req.params.id; // Usually ID or Slug

        // First find the company
        const company = await req.prisma.company.findFirst({
            where: { 
                OR: [
                    { id: companyId },
                    { slug: companyId }
                ]
            },
            include: {
                services: true,
                products: true,
                media: true,
                investors: true,
                coreValueItems: true,
                clients_CompanyClients: true,
                _count: {
                    select: { users: true }
                },
                users: {
                    select: {
                        id: true,
                        name: true,
                        title: true,
                        department: true,
                        image: true,
                        photoUrl: true,
                        bannerImage: true,
                        role: true,
                        position: true,
                        interests: true,
                        bio: true,
                        socialLinks: true,
                        highlights: true
                    }
                }
            }
        });

        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found.' });
        }

        // Filter out private fields based on privacySettings
        // Expected privacySettings format: { "annualRevenue": "private", "burnRate": "private" }
        // Alternatively boolean: { "annualRevenue": false } where false means private
        const privacySettings = company.privacySettings || {};
        
        const publicCompany = { ...company };

        // We should explicitly remove sensitive admin fields regardless of settings
        delete publicCompany.adminPasswordHash;
        delete publicCompany.adminEmail;
        delete publicCompany.adminPhone;
        delete publicCompany.subscriptionStatus;
        delete publicCompany.accountStatus;
        delete publicCompany.mandateStatus;
        delete publicCompany.apiKey;

        // Strip fields marked as private
        const sensitiveFields = [
            'totalFunding', 'fundingStage', 'businessStatus', 'burnRate', 'runway', 
            'annualRevenue', 'revenueGrowth', 'lastRound', 'lastValued', 'leadInvestor'
        ];

        for (const field of sensitiveFields) {
            // Let's assume if it is explicitly marked false or 'private', we delete it.
            // If the user wants default private, they can set it in the UI (send false for everything by default).
            if (privacySettings[field] === false || privacySettings[field] === 'private') {
                delete publicCompany[field];
            }
        }

        // Calculate dynamic fields
        const financials = await companyFinancialsService.calculateFinancials(req.prisma, company.id);
        const teamGrowth = await companyFinancialsService.calculateTeamGrowth(req.prisma, company.id);
        const startupStage = companyEvaluationService.evaluateStartupStage(publicCompany, company._count.users);
        
        publicCompany.calculatedFinancials = financials;
        publicCompany.teamGrowth = teamGrowth;
        publicCompany.evaluatedStartupStage = startupStage;

        try {
            const companyPrisma = getCompanyPrisma(company.id);
            const jobs = await companyPrisma.job.findMany({ where: { status: 'open' } });
            publicCompany.jobs = jobs;
        } catch (e) {

            console.error('Failed to fetch jobs for public profile:', e);
            publicCompany.jobs = [];
        }

        res.json({ success: true, data: publicCompany });
    } catch (error) {
        console.error('Get public profile error:', error);
        res.status(500).json({ success: false, message: 'Server error retrieving profile.' });
    }
};

exports.incrementProfileViews = async (req, res) => {
    try {
        // we might get the ID or slug, let's just use the ID
        const companyId = req.params.id;
        
        // Find company first because it might be a slug
        const company = await req.prisma.company.findFirst({
            where: {
                OR: [
                    { id: companyId },
                    { slug: companyId }
                ]
            }
        });

        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found.' });
        }

        let meta = {};
        try {
            meta = typeof company.metadata === 'string' ? JSON.parse(company.metadata) : (company.metadata || {});
        } catch (e) {
            meta = {};
        }

        const currentViews = meta.profileViews || 0;
        meta.profileViews = currentViews + 1;

        await req.prisma.company.update({
            where: { id: company.id },
            data: {
                metadata: JSON.stringify(meta)
            }
        });
        
        res.json({ success: true, message: 'Profile views incremented' });
    } catch (error) {
        console.error('Increment views error:', error);
        res.status(500).json({ success: false, message: 'Server error incrementing views.' });
    }
};

exports.incrementFollowers = async (req, res) => {
    try {
        const companyId = req.params.id;
        const userId = req.user._id || req.user.id;
        
        const company = await req.prisma.company.findFirst({
            where: {
                OR: [
                    { id: companyId },
                    { slug: companyId }
                ]
            }
        });

        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found.' });
        }

        // Check if already following
        const existingFollow = await req.prisma.companyFollower.findUnique({
            where: {
                userId_companyId: {
                    userId: userId,
                    companyId: company.id
                }
            }
        });

        if (existingFollow) {
            return res.json({ success: true, message: 'Already following' });
        }

        // Add to CompanyFollower and increment count
        await req.prisma.$transaction([
            req.prisma.companyFollower.create({
                data: {
                    userId: userId,
                    companyId: company.id
                }
            }),
            req.prisma.company.update({
                where: { id: company.id },
                data: {
                    followersCount: {
                        increment: 1
                    }
                }
            })
        ]);
        
        res.json({ success: true, message: 'Successfully followed company' });
    } catch (error) {
        console.error('Follow company error:', error);
        res.status(500).json({ success: false, message: 'Server error following company.' });
    }
};

exports.unfollowCompany = async (req, res) => {
    try {
        const companyId = req.params.id;
        const userId = req.user._id || req.user.id;
        
        const company = await req.prisma.company.findFirst({
            where: {
                OR: [
                    { id: companyId },
                    { slug: companyId }
                ]
            }
        });

        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found.' });
        }

        // Check if following
        const existingFollow = await req.prisma.companyFollower.findUnique({
            where: {
                userId_companyId: {
                    userId: userId,
                    companyId: company.id
                }
            }
        });

        if (!existingFollow) {
            return res.json({ success: true, message: 'Not following' });
        }

        // Remove from CompanyFollower and decrement count
        await req.prisma.$transaction([
            req.prisma.companyFollower.delete({
                where: { id: existingFollow.id }
            }),
            req.prisma.company.update({
                where: { id: company.id },
                data: {
                    followersCount: {
                        decrement: 1
                    }
                }
            })
        ]);
        
        res.json({ success: true, message: 'Successfully unfollowed company' });
    } catch (error) {
        console.error('Unfollow company error:', error);
        res.status(500).json({ success: false, message: 'Server error unfollowing company.' });
    }
};

exports.getFollowStatus = async (req, res) => {
    try {
        const companyId = req.params.id;
        const userId = req.user._id || req.user.id;
        
        const company = await req.prisma.company.findFirst({
            where: {
                OR: [
                    { id: companyId },
                    { slug: companyId }
                ]
            }
        });

        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found.' });
        }

        const existingFollow = await req.prisma.companyFollower.findUnique({
            where: {
                userId_companyId: {
                    userId: userId,
                    companyId: company.id
                }
            }
        });
        
        res.json({ success: true, isFollowing: !!existingFollow });
    } catch (error) {
        console.error('Get follow status error:', error);
        res.status(500).json({ success: false, message: 'Server error checking follow status.' });
    }
};

exports.updateFinanceTab = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const { companyHighlights, pitchDeckUrl } = req.body;

        const company = await req.prisma.company.findUnique({
            where: { id: companyId }
        });

        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found.' });
        }

        let meta = {};
        try {
            meta = typeof company.metadata === 'string' ? JSON.parse(company.metadata) : (company.metadata || {});
        } catch (e) {
            meta = {};
        }

        meta.pitchDeckUrl = pitchDeckUrl || '';

        const updateData = {
            metadata: JSON.stringify(meta),
            companyHighlights: companyHighlights || []
        };

        const updatedCompany = await req.prisma.company.update({
            where: { id: companyId },
            data: updateData
        });

        res.json({ success: true, data: updatedCompany, message: 'Finance tab updated successfully.' });
    } catch (error) {
        console.error('Update finance tab error:', error);
        res.status(500).json({ success: false, message: 'Server error updating finance tab.', error: error.message });
    }
};

exports.getReviews = async (req, res) => {
    try {
        const companyId = req.params.id;
        
        const company = await req.prisma.company.findFirst({
            where: {
                OR: [
                    { id: companyId },
                    { slug: companyId }
                ]
            }
        });

        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found.' });
        }

        const reviews = await req.prisma.companyPublicReview.findMany({
            where: { companyId: company.id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        photoUrl: true,
                        title: true,
                        role: true,
                        position: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json({ success: true, data: reviews });
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ success: false, message: 'Server error retrieving reviews.' });
    }
};

exports.addReview = async (req, res) => {
    try {
        const companyId = req.params.id;
        const userId = req.user.id;
        const { rating, title, description } = req.body;

        const company = await req.prisma.company.findFirst({
            where: {
                OR: [
                    { id: companyId },
                    { slug: companyId }
                ]
            }
        });

        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found.' });
        }

        const newReview = await req.prisma.companyPublicReview.create({
            data: {
                companyId: company.id,
                userId,
                rating: Number(rating),
                title,
                description
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        photoUrl: true,
                        title: true,
                        role: true,
                        position: true
                    }
                }
            }
        });

        res.json({ success: true, data: newReview });
    } catch (error) {
        console.error('Add review error:', error);
        res.status(500).json({ success: false, message: 'Server error adding review.' });
    }
};

exports.getCompanyMilestones = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }
        
        // Placeholder for milestones logic
        res.json({ success: true, data: [] });
    } catch (error) {
        console.error('Get company milestones error:', error);
        res.status(500).json({ success: false, message: 'Server error retrieving milestones.' });
    }
};

exports.verifyDomain = async (req, res) => {
    try {
        const { domain } = req.body;
        const prismaClient = req.prisma || globalPrisma;
        const companyId = req.user.companyId;

        if (!domain) {
            return res.status(400).json({ success: false, message: 'Domain is required' });
        }

        // Verify if the domain is actually a CNAME pointing to our root domain
        const dns = require('dns').promises;
        try {
            const records = await dns.resolveCname(domain);
            const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || '180workspace.com';
            const isVerified = records.some(r => r.includes(`cname.${rootDomain}`) || r.includes(rootDomain));
            
            if (!isVerified) {
                return res.status(400).json({ 
                    error: 'DNS Verification Failed',
                    message: `Domain is not pointing to cname.${rootDomain}. Please check your DNS settings.` 
                });
            }
        } catch (error) {
            console.error('DNS Lookup Error:', error);
            return res.status(400).json({ 
                success: false, 
                message: 'Could not verify DNS records. Ensure you added the CNAME record and try again.' 
            });
        }

        // If verified, save it to the company
        await prismaClient.company.update({
            where: { id: companyId },
            data: { customDomain: domain }
        });

        res.status(200).json({ success: true, message: 'Domain successfully verified and linked' });
    } catch (error) {
        console.error('Error in verifyDomain:', error);
        res.status(500).json({ success: false, message: 'Server error verifying domain', error: error.message });
    }
};
