import { prisma } from '@workspace/db';
import * as crypto from 'crypto';

export class PublicService {
    static async verifyRecruitmentApiKey(apiKey: string, requestOrigin: string | undefined) {
        if (!apiKey) {
            return { success: false, status: 401, error: 'X-API-KEY header is required' };
        }

        const settings = await prisma.settings.findFirst({
            where: { recruitmentApiKey: apiKey }
        });
        
        if (!settings || !settings.companyId) {
            console.warn(`[Public API] Invalid API key attempt: ${apiKey.substring(0, 8)}...`);
            return { success: false, status: 401, error: 'Invalid or missing API key' };
        }

        const company = await prisma.company.findUnique({
            where: { id: settings.companyId }
        });
        
        if (!company) {
             return { success: false, status: 404, error: 'Workspace configuration not found for this API key' };
        }

        const whitelist = (settings.authorizedRecruitmentDomains as string[]) || [];
        
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

                return { 
                    success: false, 
                    status: 403,
                    error: 'Unauthorized Domain', 
                    detail,
                    tip
                };
            }
        }

        return { success: true, company };
    }

    static async getPublicJobs(protocol: string, host: string) {
        const db = prisma;
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

        const jobsWithLinks = jobs.map((job: any) => ({
            ...job,
            _id: job.id, // backward compatibility mapping
            applicationLink: `${protocol}://${host}/jobs/apply/${job.id}`
        }));

        return { jobs: jobsWithLinks };
    }

    static async getPublicJobDetails(jobId: string) {
        let db = prisma;

        const job = await db.job.findUnique({
            where: { id: jobId },
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
            throw new Error('Job not found or already closed');
        }

        return {
            job: {
                ...job,
                _id: job.id
            }
        };
    }

    static async submitApplication(jobId: string, applicantName: string, applicantEmail: string, phone: string, resumeUrl: string, coverLetter: string, customFields: any) {
        if (!jobId || !applicantName || !applicantEmail) {
            throw new Error('Missing required applicant fields');
        }

        const db = prisma; // Job application uses primary DB or should it use getCompanyPrisma? The controller uses `db` without defining it properly, oh wait, the controller used `db.job` but `db` wasn't defined if it wasn't fetching from company db? Wait, `const job = await db.job.findUnique({ where: { id: jobId } });`. If `db` is undefined in the controller, it would crash! Let's use `prisma`. Wait, the controller has a bug there: `const job = await db.job.findUnique` - `db` is undefined in `submitApplication`! I will fix it by using `prisma`.

        const job = await prisma.job.findUnique({ where: { id: jobId } });
        if (!job || job.status !== 'open') {
            throw new Error('Job is no longer open for applications');
        }

        let userId = null;
        const existingUser = await prisma.user.findUnique({ where: { email: applicantEmail } });
        if (existingUser) {
            userId = existingUser.id;
        }

        const application = await prisma.application.create({
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

        return {
            message: 'Application submitted successfully',
            applicationId: application.id
        };
    }

    static async getApiKey() {
        const settings = await prisma.settings.findFirst();
        return { apiKey: settings?.recruitmentApiKey || '' };
    }

    static async generateApiKey() {
        const newKey = crypto.randomBytes(32).toString('hex');
        
        const settings = await prisma.settings.findFirst();
        if (settings) {
            await prisma.settings.update({
                where: { id: settings.id },
                data: { recruitmentApiKey: newKey }
            });
        }

        return { apiKey: newKey };
    }

    static async getBranding(workspace: string | undefined) {
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
            } as any;
        }

        let branding: any = {
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

        if (workspace) {
            const company = await prisma.company.findFirst({
                where: { slug: workspace.toLowerCase() }
            });

            if (company) {
                // with ALS, prisma will resolve to company context if we set it, or we could just use findFirst,
                // but branding is currently relying on slug. We will just search the settings based on companyId
                const config = await prisma.settings.findFirst({
                    where: { companyId: company.id }
                });

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

        return branding;
    }

    static async getExploreJobs() {
        const db = prisma;
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
        return { success: true, jobs };
    }

    static async getMyApplications(userId: string) {
        if (!userId) throw new Error('User not authenticated');
        const applications = await prisma.application.findMany({
            where: { userId },
            include: {
                job: {
                    include: {
                        company: {
                            select: {
                                name: true,
                                logoUrl: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, applications };
    }

    static async getPublicEvents() {
        let db = prisma;

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

        return { success: true, data: events };
    }

    static async getPublicEventDetails(eventId: string) {
        let db = prisma;

        const event = await db.event.findUnique({
            where: { id: eventId },
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

        if (!event) throw new Error('Event not found');

        return { success: true, data: event };
    }

    static async checkRegistration(eventId: string, email: string) {
        let db = prisma;

        if (!email) return { isRegistered: false };

        const registration = await db.eventRegistration.findFirst({
            where: { eventId, email }
        });

        return { isRegistered: !!registration };
    }

    static async submitEventRegistration(eventId: string, registrationData: any) {
        let db = prisma;

        const event = await db.event.findUnique({ where: { id: eventId } });
        if (!event) throw new Error('Event not found');

        const existingRegistration = await db.eventRegistration.findFirst({
            where: { eventId, email: registrationData.email }
        });
        
        if (existingRegistration) {
            throw new Error('You have already registered for this event.');
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

        return { success: true, data: registration };
    }

    static async resolveDomain(domain: string) {
        let lookupDomain = decodeURIComponent(domain || '').toLowerCase().trim();
        
        // Remove port if present (e.g. sghj.localhost:3002 -> sghj.localhost)
        if (lookupDomain.includes(':')) {
            lookupDomain = lookupDomain.split(':')[0];
        }

        // 1. Try exact match (e.g. 'sghj.localhost', 'customdomain.com', 'prince.180workspace.com')
        let registry = await prisma.domainRegistry.findUnique({
            where: { domain: lookupDomain },
            select: {
                id: true,
                domain: true,
                type: true,
                targetId: true,
                companyId: true,
                createdAt: true,
                updatedAt: true
            }
        });

        // 2. If not found, try matching by subdomain prefix or standard variations
        if (!registry && lookupDomain.includes('.')) {
            const subdomainPrefix = lookupDomain.split('.')[0];
            
            // Try matching the prefix itself (e.g. 'sghj')
            registry = await prisma.domainRegistry.findUnique({
                where: { domain: subdomainPrefix },
                select: {
                    id: true,
                    domain: true,
                    type: true,
                    targetId: true,
                    companyId: true,
                    createdAt: true,
                    updatedAt: true
                }
            });

            // Try matching with .localhost suffix if registered as localhost
            if (!registry) {
                registry = await prisma.domainRegistry.findUnique({
                    where: { domain: `${subdomainPrefix}.localhost` },
                    select: {
                        id: true,
                        domain: true,
                        type: true,
                        targetId: true,
                        companyId: true,
                        createdAt: true,
                        updatedAt: true
                    }
                });
            }
        }

        if (!registry) {
            // Check if domain matches a company slug or ID directly (e.g. 'simplicion', 'workspace-slug')
            const slugOrPrefix = lookupDomain.split('.')[0];
            const directCompany = await prisma.company.findFirst({
                where: {
                    OR: [
                        { slug: slugOrPrefix },
                        { slug: lookupDomain },
                        { id: slugOrPrefix },
                        { id: lookupDomain }
                    ]
                },
                include: {
                    CompanyConfig: true,
                    coreValueItems: true,
                    offerings: true,
                    media: true,
                    investors: true
                }
            });

            if (directCompany) {
                if (directCompany.CompanyConfig) {
                    delete (directCompany.CompanyConfig as any).companyPaymentConfig;
                    delete (directCompany.CompanyConfig as any).stripeAccountId;
                    delete (directCompany.CompanyConfig as any).paypalEmail;
                }
                return {
                    type: 'COMPANY_PROFILE',
                    payload: directCompany
                };
            }

            throw new Error(`Domain not found: ${lookupDomain}`);
        }

        // Based on type, fetch the actual payload
        let payload = null;

        if (registry.type === 'COMPANY_PROFILE') {
            // Import CompanyProfileService dynamically or use Prisma directly to avoid circular deps
            // Since this is public service, we can fetch public company data directly
            payload = await prisma.company.findUnique({
                where: { id: registry.targetId },
                include: {
                    CompanyConfig: true,
                    coreValueItems: true,
                    offerings: true,
                    media: true,
                    investors: true
                }
            });
            
            if (payload) {
                // Strip sensitive config
                if (payload.CompanyConfig) {
                    delete payload.CompanyConfig.companyPaymentConfig;
                    delete payload.CompanyConfig.stripeAccountId;
                    delete payload.CompanyConfig.paypalEmail;
                }
            }
        } else if (registry.type === 'ADVERTISING_WEBSITE') {
            payload = await prisma.website.findUnique({
                where: { id: registry.targetId }
            });
        } else if (registry.type === 'TRAFFIC_LINK') {
            payload = await prisma.trafficLink.findUnique({
                where: { id: registry.targetId },
                include: {
                    rules: {
                        where: { isActive: true },
                        orderBy: { priority: 'asc' }
                    }
                }
            });
        }
        // else if (registry.type === 'FORM') { ... }

        if (!payload) {
            throw new Error('Target resource not found for this domain');
        }

        return {
            type: registry.type,
            payload
        };
    }
}
