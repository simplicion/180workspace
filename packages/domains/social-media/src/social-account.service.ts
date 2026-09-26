import { prisma, requestContext } from '@workspace/db';
import { SocialTokenVault } from './publishing/token-vault';
import { normalizePlatform } from './publishing/config';
import { SocialDomainError, notFound } from './tenant-scope';

export interface ConnectAccountDTO {
    platform: 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube' | 'x' | 'twitter';
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

/** Fields that must never leave the server. The vault table is never included by these queries at all. */
const SECRET_FIELDS = ['accessToken', 'refreshToken', 'credential'];

/** Client-safe view of a social account: no tokens, plus `hasCredential` / `reauthRequired` for the UI. */
export function toPublicAccount<T extends Record<string, any> | null | undefined>(a: T): any {
    if (!a) return a;
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(a)) if (!SECRET_FIELDS.includes(k)) out[k] = v;
    out.hasCredential = Boolean((a as any).credential || (a as any).accessToken || (a as any).hasCredential);
    return out;
}

const PUBLIC_INCLUDE = {
    project: { select: { id: true, name: true } },
    client: { select: { id: true, name: true } },
    credential: { select: { id: true, accessTokenExpiresAt: true } },
};

export class SocialAccountService {
    static async listAccounts(projectId?: string) {
        const companyId = requestContext.getStore()?.companyId as string;
        if (!companyId) throw new SocialDomainError('UNAUTHENTICATED', 401, 'Company context required');

        const whereClause: any = { companyId, isActive: true };
        if (projectId) whereClause.projectId = projectId;

        const rows = await (prisma as any).socialAccount.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: PUBLIC_INCLUDE,
        });
        return rows.map(toPublicAccount);
    }

    static async getAccount(id: string) {
        const companyId = requestContext.getStore()?.companyId as string;
        const account = await (prisma as any).socialAccount.findFirst({
            where: { id, companyId },
            include: PUBLIC_INCLUDE,
        });
        if (!account) throw notFound('Social account');
        return toPublicAccount(account);
    }

    /**
     * Manual connect with a token obtained elsewhere (legacy / admin tooling). The token goes straight into the
     * encrypted vault; the account row never stores it. Prefer the OAuth flow (SocialOAuthService).
     */
    static async connectAccount(data: ConnectAccountDTO) {
        const companyId = requestContext.getStore()?.companyId as string;
        if (!companyId) throw new SocialDomainError('UNAUTHENTICATED', 401, 'Company context required');
        const platform = normalizePlatform(data.platform);
        if (!platform) throw new SocialDomainError('VALIDATION_FAILED', 400, `Unsupported platform "${data.platform}"`);
        if (!data.platformAccountId || !data.accessToken) throw new SocialDomainError('VALIDATION_FAILED', 400, 'platformAccountId and accessToken are required');

        const fields = {
            accountName: data.accountName,
            username: data.username,
            profileImageUrl: data.profileImageUrl,
            scopes: data.scopes || [],
            metadata: data.metadata || {},
            projectId: data.projectId,
            clientId: data.clientId,
            isActive: true,
            accessToken: null,
            refreshToken: null,
        };
        const account = await (prisma as any).socialAccount.upsert({
            where: { companyId_platform_platformAccountId: { companyId, platform, platformAccountId: data.platformAccountId } },
            update: fields,
            create: { companyId, platform, platformAccountId: data.platformAccountId, ...fields },
        });
        await SocialTokenVault.saveTokens(account.id, companyId, {
            accessToken: data.accessToken,
            refreshToken: data.refreshToken ?? null,
            expiresAt: data.tokenExpiresAt ? new Date(data.tokenExpiresAt) : null,
            scopes: data.scopes || [],
        });
        return toPublicAccount({ ...account, hasCredential: true });
    }

    static async disconnectAccount(id: string) {
        const companyId = requestContext.getStore()?.companyId as string;
        const account = await (prisma as any).socialAccount.findFirst({ where: { id, companyId } });
        if (!account) throw notFound('Social account');

        await (prisma as any).socialAccount.update({
            where: { id },
            data: { isActive: false, accessToken: null, refreshToken: null },
        });
        // Tokens are destroyed on disconnect; reconnecting runs OAuth again.
        await SocialTokenVault.revoke(id);

        return { success: true, message: 'Account disconnected successfully' };
    }
}
