import { promises as dns } from 'dns';
import { prisma, requestContext } from '@workspace/db';
import { PrismaClient } from '@workspace/db';
import { CompanyRepository } from '../repositories/company.repository';
import { CompanyMapper } from '../mappers/company.mapper';

export class CompanyProfileService {
    /**
     * Get private profile for a company
     */
    static async getPrivateProfile() {
        const companyId = requestContext.getStore()?.companyId as string;
        const company = await CompanyRepository.findById(companyId, true);

        if (!company) {
            throw new Error('Company not found.');
        }

        const invoices = await prisma.invoice.findMany({ where: { companyId, status: 'paid' } });
        const expenses = await prisma.expenseTransaction.findMany({ where: { companyId } });
        const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        const financials = { totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses };
        const teamGrowth = {};
        const startupStage = "Early";

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
    static async updatePrivateProfile(updateData: any) {
        const companyId = requestContext.getStore()?.companyId as string;
        // Prevent changing core IDs and protected fields
        delete updateData.id;
        delete updateData.createdAt;
        delete updateData.updatedAt;
        delete updateData.stripeCustomerId;
        delete updateData.subscriptionId;

        const updatedCompany = await CompanyRepository.update(companyId, updateData);

        return updatedCompany;
    }

    /**
     * Get public profile by slug or id
     */
    static async getPublicProfile(idOrSlug: string, includeJobs: boolean = false) {
        const company = await CompanyRepository.findByIdOrSlug(idOrSlug, true);

        if (!company) {
            throw new Error('Company not found.');
        }

        const publicCompany: any = CompanyMapper.toPublicProfile(company);

        // Calculate dynamic fields
        const invoices = await prisma.invoice.findMany({ where: { companyId: company.id, status: 'paid' } });
        const expenses = await prisma.expenseTransaction.findMany({ where: { companyId: company.id } });
        const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        const financials = { totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses };
        const teamGrowth = {};
        const startupStage = "Early";
        
        publicCompany.calculatedFinancials = financials;
        publicCompany.teamGrowth = teamGrowth;
        publicCompany.evaluatedStartupStage = startupStage;

        if (includeJobs) {
            try {
                const jobs = await requestContext.run({ companyId: company.id }, async () => {
                    return await prisma.job.findMany({ where: { status: 'open' } });
                });
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
        const company = await CompanyRepository.findByIdOrSlug(idOrSlug);

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

        await CompanyRepository.update(company.id, {
            metadata: JSON.stringify(meta)
        });

        return true;
    }

    /**
     * Follow a company
     */
    static async followCompany(userId: string, idOrSlug: string) {
        const company = await CompanyRepository.findByIdOrSlug(idOrSlug);

        if (!company) {
            throw new Error('Company not found.');
        }

        const existingFollow = await CompanyRepository.getFollowStatus(userId, company.id);

        if (existingFollow) {
            return { alreadyFollowing: true };
        }

        await CompanyRepository.follow(userId, company.id);

        return { alreadyFollowing: false };
    }

    /**
     * Unfollow a company
     */
    static async unfollowCompany(userId: string, idOrSlug: string) {
        const company = await CompanyRepository.findByIdOrSlug(idOrSlug);

        if (!company) {
            throw new Error('Company not found.');
        }

        const existingFollow = await CompanyRepository.getFollowStatus(userId, company.id);

        if (!existingFollow) {
            return { notFollowing: true };
        }

        await CompanyRepository.unfollow(userId, company.id, existingFollow.id);

        return { notFollowing: false };
    }

    /**
     * Get follow status
     */
    static async getFollowStatus(userId: string, idOrSlug: string) {
        const company = await CompanyRepository.findByIdOrSlug(idOrSlug);

        if (!company) {
            throw new Error('Company not found.');
        }

        const existingFollow = await CompanyRepository.getFollowStatus(userId, company.id);

        return !!existingFollow;
    }

    /**
     * Update finance tab
     */
    static async updateFinanceTab(companyHighlights: any, pitchDeckUrl: string) {
        const companyId = requestContext.getStore()?.companyId as string;
        const company = await CompanyRepository.findById(companyId);

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

        const updatedCompany = await CompanyRepository.update(companyId, updateData);

        return updatedCompany;
    }

    /**
     * Get public reviews
     */
    static async getReviews(idOrSlug: string) {
        const company = await CompanyRepository.findByIdOrSlug(idOrSlug);

        if (!company) {
            throw new Error('Company not found.');
        }

        const reviews = await CompanyRepository.getReviews(company.id);

        return reviews;
    }

    /**
     * Add review
     */
    static async addReview(idOrSlug: string, userId: string, rating: number, title: string, description: string) {
        const company = await CompanyRepository.findByIdOrSlug(idOrSlug);

        if (!company) {
            throw new Error('Company not found.');
        }

        const newReview = await CompanyRepository.addReview(company.id, userId, rating, title, description);

        return newReview;
    }
    /**
     * Verify custom domain DNS settings
     */
    static async verifyDomain(domain: string, rootDomain: string) {
        const companyId = requestContext.getStore()?.companyId as string;
        if (!domain) {
            throw new Error('Domain is required');
        }

        // Check if domain is already registered globally
        const existingDomain = await prisma.domainRegistry.findUnique({
            where: { domain }
        });

        if (existingDomain && existingDomain.targetId !== companyId) {
            return {
                success: false,
                error: 'Domain Unavailable',
                message: 'This domain is already registered by another entity.'
            };
        }

        try {
            const records = await dns.resolveCname(domain);
            const isVerified = records.some((r: string) => r.includes(`cname.${rootDomain}`) || r.includes(rootDomain));
            
            if (!isVerified) {
                return {
                    success: false,
                    error: 'DNS Verification Failed',
                    message: `Domain is not pointing to cname.${rootDomain}. Please check your DNS settings.`
                };
            }
        } catch (error) {
            console.error('DNS Lookup Error:', error);
            return {
                success: false,
                message: 'Could not verify DNS records. Ensure you added the CNAME record and try again.'
            };
        }

        // Add to DomainRegistry (upsert to handle if it was already registered by this company)
        await prisma.domainRegistry.upsert({
            where: { domain },
            update: {
                type: 'COMPANY_PROFILE',
                targetId: companyId
            },
            create: {
                domain,
                type: 'COMPANY_PROFILE',
                targetId: companyId
            }
        });

        await CompanyRepository.update(companyId, { customDomain: domain });

        return { success: true, message: 'Domain successfully verified and linked' };
    }
}


