import { prisma, requestContext } from '@workspace/db';

export interface ConnectAccountDTO {
    platform: 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube';
    platformAccountId: string;
    accountName: string;
    username: string;
    profileImageUrl?: string;
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
    scopes?: string[];
    metadata?: Record<string, any>;
    projectId?: string;
    clientId?: string;
}

export class SocialAccountService {
    static async listAccounts(projectId?: string) {
        const companyId = requestContext.getStore()?.companyId as string;
        if (!companyId) throw new Error('Company context required');

        const whereClause: any = { companyId, isActive: true };
        if (projectId) whereClause.projectId = projectId;

        return await (prisma as any).socialAccount.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: {
                project: { select: { id: true, name: true } },
                client: { select: { id: true, name: true } }
            }
        });
    }

    static async getAccount(id: string) {
        const companyId = requestContext.getStore()?.companyId as string;
        const account = await (prisma as any).socialAccount.findUnique({
            where: { id },
            include: {
                project: true,
                client: true
            }
        });

        if (!account || account.companyId !== companyId) {
            throw new Error('Social account not found');
        }

        return account;
    }

    static async connectAccount(data: ConnectAccountDTO) {
        const companyId = requestContext.getStore()?.companyId as string;
        if (!companyId) throw new Error('Company context required');

        const account = await (prisma as any).socialAccount.upsert({
            where: {
                companyId_platform_platformAccountId: {
                    companyId,
                    platform: data.platform,
                    platformAccountId: data.platformAccountId
                }
            },
            update: {
                accountName: data.accountName,
                username: data.username,
                profileImageUrl: data.profileImageUrl,
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
                tokenExpiresAt: data.tokenExpiresAt,
                scopes: data.scopes || [],
                metadata: data.metadata || {},
                projectId: data.projectId,
                clientId: data.clientId,
                isActive: true
            },
            create: {
                companyId,
                platform: data.platform,
                platformAccountId: data.platformAccountId,
                accountName: data.accountName,
                username: data.username,
                profileImageUrl: data.profileImageUrl,
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
                tokenExpiresAt: data.tokenExpiresAt,
                scopes: data.scopes || [],
                metadata: data.metadata || {},
                projectId: data.projectId,
                clientId: data.clientId,
                isActive: true
            }
        });

        return account;
    }

    static async disconnectAccount(id: string) {
        const companyId = requestContext.getStore()?.companyId as string;
        const account = await (prisma as any).socialAccount.findUnique({ where: { id } });
        
        if (!account || account.companyId !== companyId) {
            throw new Error('Social account not found');
        }

        await (prisma as any).socialAccount.update({
            where: { id },
            data: { isActive: false }
        });

        return { success: true, message: 'Account disconnected successfully' };
    }
}
