import { prisma } from '@workspace/db';
import { PrismaClient } from '@workspace/db';
import { CompanyEvaluationService } from './company-evaluation.service';
import { CompanyFinancialsService } from '@workspace/finance';

export class CompanyProfileService {
    /**
     * Get private profile for a company
     */
    static async getPrivateProfile(companyId: string) {
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });

        if (!company) {
            throw new Error('Company not found.');
        }

        const financials = await CompanyFinancialsService.calculateFinancials(prisma, company.id);
        const teamGrowth = await CompanyFinancialsService.calculateTeamGrowth(prisma, company.id);
        const startupStage = CompanyEvaluationService.evaluateStartupStage(company, company._count.users);

        return {
            ...company,
            calculatedFinancials: financials,
            teamGrowth,
            evaluatedStartupStage: startupStage
        };
    }

    /**
     * Update private profile for a company
     */
    static async updatePrivateProfile(companyId: string, updateData: any) {
        // Prevent changing core IDs and protected fields
        delete updateData.id;
        delete updateData.createdAt;
        delete updateData.updatedAt;
        delete updateData.stripeCustomerId;
        delete updateData.subscriptionId;

        const updatedCompany = await prisma.company.update({
            where: { id: companyId },
            data: updateData
        });

        return updatedCompany;
    }

    /**
     * Get public profile by slug or id
     */
    static async getPublicProfile(idOrSlug: string, includeJobs: boolean = false, getCompanyPrisma: any = null) {
        const company = await prisma.company.findFirst({
            where: {
                OR: [
                    { id: idOrSlug },
                    { slug: idOrSlug }
                ]
            },
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });

        if (!company) {
            throw new Error('Company not found.');
        }

        let privacySettings: any = {};
        try {
            privacySettings = typeof company.privacySettings === 'string' ? JSON.parse(company.privacySettings) : (company.privacySettings || {});
        } catch (e) {
            privacySettings = {};
        }

        const publicCompany: any = { ...company };

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
            if (privacySettings[field] === false || privacySettings[field] === 'private') {
                delete publicCompany[field];
            }
        }

        // Calculate dynamic fields
        const financials = await CompanyFinancialsService.calculateFinancials(prisma, company.id);
        const teamGrowth = await CompanyFinancialsService.calculateTeamGrowth(prisma, company.id);
        const startupStage = CompanyEvaluationService.evaluateStartupStage(publicCompany, company._count.users);
        
        publicCompany.calculatedFinancials = financials;
        publicCompany.teamGrowth = teamGrowth;
        publicCompany.evaluatedStartupStage = startupStage;

        if (includeJobs && getCompanyPrisma) {
            try {
                const companyPrisma = getCompanyPrisma(company.id);
                const jobs = await companyPrisma.job.findMany({ where: { status: 'open' } });
                publicCompany.jobs = jobs;
            } catch (e) {
                console.error('Failed to fetch jobs for public profile:', e);
                publicCompany.jobs = [];
            }
        }

        return publicCompany;
    }

    /**
     * Increment profile views
     */
    static async incrementProfileViews(idOrSlug: string) {
        const company = await prisma.company.findFirst({
            where: {
                OR: [
                    { id: idOrSlug },
                    { slug: idOrSlug }
                ]
            }
        });

        if (!company) {
            throw new Error('Company not found.');
        }

        let meta: any = {};
        try {
            meta = typeof company.metadata === 'string' ? JSON.parse(company.metadata) : (company.metadata || {});
        } catch (e) {
            meta = {};
        }

        const currentViews = meta.profileViews || 0;
        meta.profileViews = currentViews + 1;

        await prisma.company.update({
            where: { id: company.id },
            data: {
                metadata: JSON.stringify(meta)
            }
        });

        return true;
    }

    /**
     * Follow a company
     */
    static async followCompany(userId: string, idOrSlug: string) {
        const company = await prisma.company.findFirst({
            where: {
                OR: [
                    { id: idOrSlug },
                    { slug: idOrSlug }
                ]
            }
        });

        if (!company) {
            throw new Error('Company not found.');
        }

        const existingFollow = await prisma.companyFollower.findUnique({
            where: {
                userId_companyId: {
                    userId: userId,
                    companyId: company.id
                }
            }
        });

        if (existingFollow) {
            return { alreadyFollowing: true };
        }

        await prisma.$transaction([
            prisma.companyFollower.create({
                data: {
                    userId: userId,
                    companyId: company.id
                }
            }),
            prisma.company.update({
                where: { id: company.id },
                data: {
                    followersCount: { increment: 1 }
                }
            })
        ]);

        return { alreadyFollowing: false };
    }

    /**
     * Unfollow a company
     */
    static async unfollowCompany(userId: string, idOrSlug: string) {
        const company = await prisma.company.findFirst({
            where: {
                OR: [
                    { id: idOrSlug },
                    { slug: idOrSlug }
                ]
            }
        });

        if (!company) {
            throw new Error('Company not found.');
        }

        const existingFollow = await prisma.companyFollower.findUnique({
            where: {
                userId_companyId: {
                    userId: userId,
                    companyId: company.id
                }
            }
        });

        if (!existingFollow) {
            return { notFollowing: true };
        }

        await prisma.$transaction([
            prisma.companyFollower.delete({
                where: { id: existingFollow.id }
            }),
            prisma.company.update({
                where: { id: company.id },
                data: {
                    followersCount: { decrement: 1 }
                }
            })
        ]);

        return { notFollowing: false };
    }

    /**
     * Get follow status
     */
    static async getFollowStatus(userId: string, idOrSlug: string) {
        const company = await prisma.company.findFirst({
            where: {
                OR: [
                    { id: idOrSlug },
                    { slug: idOrSlug }
                ]
            }
        });

        if (!company) {
            throw new Error('Company not found.');
        }

        const existingFollow = await prisma.companyFollower.findUnique({
            where: {
                userId_companyId: {
                    userId: userId,
                    companyId: company.id
                }
            }
        });

        return !!existingFollow;
    }

    /**
     * Update finance tab
     */
    static async updateFinanceTab(companyId: string, companyHighlights: any, pitchDeckUrl: string) {
        const company = await prisma.company.findUnique({
            where: { id: companyId }
        });

        if (!company) {
            throw new Error('Company not found.');
        }

        let meta: any = {};
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

        const updatedCompany = await prisma.company.update({
            where: { id: companyId },
            data: updateData
        });

        return updatedCompany;
    }

    /**
     * Get public reviews
     */
    static async getReviews(idOrSlug: string) {
        const company = await prisma.company.findFirst({
            where: {
                OR: [
                    { id: idOrSlug },
                    { slug: idOrSlug }
                ]
            }
        });

        if (!company) {
            throw new Error('Company not found.');
        }

        const reviews = await prisma.companyPublicReview.findMany({
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

        return reviews;
    }

    /**
     * Add review
     */
    static async addReview(idOrSlug: string, userId: string, rating: number, title: string, description: string) {
        const company = await prisma.company.findFirst({
            where: {
                OR: [
                    { id: idOrSlug },
                    { slug: idOrSlug }
                ]
            }
        });

        if (!company) {
            throw new Error('Company not found.');
        }

        const newReview = await prisma.companyPublicReview.create({
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

        return newReview;
    }
}
