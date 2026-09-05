import { prisma } from '@workspace/db';

export class PlatformCompanyRepository {
    static async list(page: number, limit: number, search: string, status: string) {
        const where: any = {};

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { adminEmail: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (status) where.subscriptionStatus = status;

        return Promise.all([
            prisma.company.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.company.count({ where }),
        ]);
    }

    static async findById(id: string) {
        return prisma.company.findUnique({
            where: { id },
        });
    }

    static async getCompanyDetailed(id: string) {
        const [
            company,
            users,
            subscriptions,
            paymentHistories,
            projectsCount,
            tasksCount,
            documentsCount,
            assetsCount,
            clientsCount,
            trafficLinksCount,
            formsCount,
            ticketsCount,
            auditLogsRaw,
            teamActivityLogsRaw,
            emailLogsRaw
        ] = await Promise.all([
            prisma.company.findUnique({ where: { id } }),
            prisma.user.findMany({
                where: { companyId: id, deletedAt: null },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    role: true,
                    position: true,
                    department: true,
                    isActive: true,
                    photoUrl: true,
                    image: true,
                    createdAt: true,
                    joinDate: true,
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.subscription.findMany({
                where: { companyId: id },
                include: {
                    plan: true
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.paymentHistory.findMany({
                where: { companyId: id },
                orderBy: { createdAt: 'desc' },
                take: 25
            }),
            prisma.project.count({ where: { companyId: id } }).catch(() => 0),
            prisma.task.count({ where: { companyId: id } }).catch(() => 0),
            prisma.document.count({ where: { companyId: id } }).catch(() => 0),
            prisma.asset.count({ where: { companyId: id } }).catch(() => 0),
            prisma.client.count({ where: { companyId: id } }).catch(() => 0),
            prisma.trafficLink.count({ where: { companyId: id } }).catch(() => 0),
            prisma.form.count({ where: { companyId: id } }).catch(() => 0),
            prisma.supportTicket.count({ where: { companyId: id } }).catch(() => 0),
            prisma.auditLog.findMany({
                where: { companyId: id },
                include: {
                    user: { select: { id: true, name: true, email: true, role: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: 100
            }).catch(() => []),
            prisma.teamActivityLog.findMany({
                where: { companyId: id },
                include: {
                    actor: { select: { id: true, name: true, email: true, role: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: 100
            }).catch(() => []),
            prisma.emailLog.findMany({
                where: { companyId: id },
                include: {
                    sentBy: { select: { id: true, name: true, email: true, role: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: 50
            }).catch(() => [])
        ]);

        if (!company) return null;

        // Combine and normalize all logs
        const normalizedLogs: any[] = [];

        // 1. Audit Logs (Security & Administration)
        (auditLogsRaw || []).forEach((log: any) => {
            normalizedLogs.push({
                id: log.id,
                logType: 'audit',
                action: log.action || 'Administrative Event',
                resourceType: log.resourceType || 'SECURITY',
                resourceId: log.resourceId || '',
                details: log.details || {},
                ipAddress: log.ipAddress || '',
                userAgent: log.userAgent || '',
                userName: log.user?.name || company.adminName || 'Admin User',
                userEmail: log.user?.email || company.adminEmail || '',
                userRole: log.user?.role || 'admin',
                createdAt: log.createdAt,
            });
        });

        // 2. Team Activity Logs (Workspace Operations)
        (teamActivityLogsRaw || []).forEach((log: any) => {
            normalizedLogs.push({
                id: log.id,
                logType: 'activity',
                action: log.actionType || 'Team Operation',
                resourceType: log.entityType || 'WORKSPACE',
                resourceId: log.entityId || '',
                details: log.metadata || {},
                ipAddress: (log.metadata as any)?.ip || '',
                userAgent: (log.metadata as any)?.userAgent || '',
                userName: log.actor?.name || 'Team Member',
                userEmail: log.actor?.email || '',
                userRole: log.actor?.role || 'employee',
                createdAt: log.createdAt,
            });
        });

        // 3. Email Logs (Communications)
        (emailLogsRaw || []).forEach((log: any) => {
            normalizedLogs.push({
                id: log.id,
                logType: 'email',
                action: `Email Sent: ${log.subject || log.templateName || 'System Notification'}`,
                resourceType: 'COMMUNICATIONS',
                resourceId: log.to,
                details: { to: log.to, template: log.templateName, status: log.status, error: log.errorMessage },
                ipAddress: '',
                userAgent: 'Platform Mail Dispatcher',
                userName: log.sentBy?.name || 'System Mailer',
                userEmail: log.sentBy?.email || 'mailer@system.180',
                userRole: 'system',
                createdAt: log.createdAt,
            });
        });

        // 4. Synthesize foundational Company Lifecycle Milestones
        normalizedLogs.push({
            id: `lifecycle-reg-${company.id}`,
            logType: 'lifecycle',
            action: 'Organization Workspace Initialized & Onboarded',
            resourceType: 'TENANT',
            resourceId: company.id,
            details: {
                companyName: company.name,
                adminEmail: company.adminEmail,
                industry: company.industry || 'General',
                country: company.country || 'Global',
            },
            ipAddress: 'System Core Engine',
            userAgent: 'Platform Provisioner',
            userName: company.adminName || 'System Admin',
            userEmail: company.adminEmail || 'admin@workspace',
            userRole: 'admin',
            createdAt: company.createdAt,
        });

        if (company.trialStartDate || company.subscriptionStatus) {
            normalizedLogs.push({
                id: `lifecycle-sub-${company.id}`,
                logType: 'subscription',
                action: `Subscription Tier Provisioned: ${(company.subscriptionStatus || 'TRIAL').toUpperCase()}`,
                resourceType: 'BILLING',
                resourceId: company.id,
                details: {
                    status: company.subscriptionStatus,
                    trialStart: company.trialStartDate,
                    trialEnd: company.trialEndDate,
                    nextChargeDate: company.nextChargeDate,
                    autopayEnabled: company.autopayEnabled,
                },
                ipAddress: 'Billing Gateway',
                userAgent: 'Subscription Guard Engine',
                userName: 'Platform Billing Engine',
                userEmail: 'billing@180workspace.com',
                userRole: 'system',
                createdAt: company.trialStartDate || company.createdAt,
            });
        }

        if (company.accountStatus === 'suspended') {
            normalizedLogs.push({
                id: `lifecycle-susp-${company.id}`,
                logType: 'security',
                action: `Company Access Suspended: ${(company.metadata as any)?.suspendedReason || 'Administrative Hold'}`,
                resourceType: 'SECURITY',
                resourceId: company.id,
                details: company.metadata || {},
                ipAddress: 'SuperAdmin Console',
                userAgent: 'Administrative Action',
                userName: 'SuperAdmin Security Officer',
                userEmail: 'superadmin@180workspace.com',
                userRole: 'superadmin',
                createdAt: (company.metadata as any)?.suspendedAt || company.updatedAt,
            });
        }

        // Sort all logs newest first
        normalizedLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Calculate storage estimation from documents
        let storageUsedMb = 0;
        try {
            const docs = await prisma.document.findMany({
                where: { companyId: id },
                select: { size: true }
            });
            const totalBytes = docs.reduce((acc, doc) => acc + (Number(doc.size) || 0), 0);
            storageUsedMb = Math.round((totalBytes / (1024 * 1024)) * 10) / 10;
        } catch {}

        return {
            company: {
                ...company,
                companyName: company.name || (company as any).companyName || 'Unnamed Company',
            },
            users,
            subscriptions,
            paymentHistories,
            stats: {
                usersCount: users.length,
                projectsCount,
                tasksCount,
                documentsCount,
                assetsCount,
                clientsCount,
                trafficLinksCount,
                formsCount,
                ticketsCount,
                storageUsedMb,
            },
            activityLogs: normalizedLogs
        };
    }

    static async findSubscriptions(companyId: string) {
        return prisma.subscription.findMany({
            where: { companyId },
            include: {
                plan: { select: { id: true, planName: true, price: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });
    }

    static async update(id: string, data: any) {
        return prisma.company.update({
            where: { id },
            data,
        });
    }

    static async updateAdminPassword(adminEmail: string, hashed: string) {
        return prisma.user.updateMany({
            where: { email: adminEmail },
            data: { password: hashed },
        });
    }

    static async create(data: any) {
        return prisma.company.create({ data });
    }

    static async listAll() {
        return prisma.company.findMany();
    }
}
