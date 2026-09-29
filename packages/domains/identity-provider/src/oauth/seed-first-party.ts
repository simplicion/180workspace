'use strict';

import { developersPrisma as prisma } from '@workspace/db-180core';
import { hashSecret } from './oauth.service';

export const FIRST_PARTY_APPS = [
    {
        clientId: '180-workspace-platform',
        name: '180 Workspace',
        description: 'Unified Business Operating System & Collaboration Suite',
        redirectUris: [
            'http://localhost:3000/callback',
            'http://localhost:3000/oauth/callback',
            'http://localhost:3001/callback',
            'http://localhost:3001/oauth/callback',
            'http://localhost:3002/callback',
            'http://localhost:3002/oauth/callback',
            'http://localhost:3003/callback',
            'http://localhost:3003/oauth/callback',
            'http://localhost:3008/callback',
            'http://localhost:3008/oauth/callback',
            'http://localhost:3009/callback',
            'http://localhost:3009/oauth/callback',
            'https://180workspace.com/callback',
            'https://180workspace.com/oauth/callback',
            'https://*.180workspace.com/callback',
            'https://*.180workspace.com/oauth/callback'
        ],
        allowedOrigins: [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3001',
            'http://localhost:3002',
            'http://127.0.0.1:3002',
            'http://localhost:3003',
            'http://127.0.0.1:3003',
            'http://localhost:3008',
            'http://127.0.0.1:3008',
            'http://localhost:3009',
            'http://127.0.0.1:3009',
            'https://180workspace.com',
            'https://*.180workspace.com'
        ],
        allowedScopes: [
            'openid',
            'identity:read',
            'identity:email',
            'identity:phone'
        ],
        isVerified: true,
        isActive: true,
        logoUrl: '/icon.svg'
    },
    {
        clientId: '180_client_5cc136397553836e34eb37ce22d13a53',
        name: '180 Workspace Core Client',
        description: 'First-party application client for 180 Workspace web platform',
        redirectUris: [
            'http://localhost:3000/callback',
            'http://localhost:3000/oauth/callback',
            'http://localhost:3001/callback',
            'http://localhost:3001/oauth/callback',
            'http://localhost:3002/callback',
            'http://localhost:3002/oauth/callback',
            'http://localhost:3003/callback',
            'http://localhost:3003/oauth/callback',
            'http://localhost:3008/callback',
            'http://localhost:3008/oauth/callback',
            'http://localhost:3009/callback',
            'http://localhost:3009/oauth/callback',
            'https://180workspace.com/callback',
            'https://180workspace.com/oauth/callback',
            'https://*.180workspace.com/callback',
            'https://*.180workspace.com/oauth/callback'
        ],
        allowedOrigins: [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3001',
            'http://localhost:3002',
            'http://127.0.0.1:3002',
            'http://localhost:3003',
            'http://127.0.0.1:3003',
            'http://localhost:3008',
            'http://127.0.0.1:3008',
            'http://localhost:3009',
            'http://127.0.0.1:3009',
            'https://180workspace.com',
            'https://*.180workspace.com'
        ],
        allowedScopes: [
            'openid',
            'identity:read',
            'identity:email',
            'identity:phone'
        ],
        isVerified: true,
        isActive: true,
        logoUrl: '/icon.svg'
    },
    {
        clientId: '180-social-studio-mobile',
        name: '180 Social Studio',
        description: 'Multi-Channel Social Media Automation & Analytics',
        redirectUris: [
            '180social://oauth-callback',
            'http://localhost:3007/#/oauth-callback',
            'http://localhost:3007/oauth-callback',
            'http://localhost:3000/social/callback'
        ],
        allowedOrigins: [
            'http://localhost:3007',
            'http://127.0.0.1:3007',
            'http://localhost:3000'
        ],
        allowedScopes: [
            'openid',
            'identity:read',
            'identity:email'
        ],
        isVerified: true,
        isActive: true,
        logoUrl: '/icon.svg'
    },
    {
        clientId: '180-traffic-director',
        name: '180 Traffic Director',
        description: 'Enterprise Edge Traffic Router, Safe-Page Cloaker & Click Armor',
        redirectUris: [
            'http://localhost:3000/callback',
            'http://localhost:3006/callback',
            'http://localhost:3009/callback',
            'http://localhost:3002/callback',
            'https://traffic-director.180workspace.com/callback',
            'https://trafficdirector.180workspace.com/callback',
            'https://*.180workspace.com/callback'
        ],
        allowedOrigins: [
            'http://localhost:3000',
            'http://localhost:3006',
            'http://127.0.0.1:3006',
            'http://localhost:3009',
            'http://127.0.0.1:3009',
            'http://localhost:3002',
            'https://traffic-director.180workspace.com',
            'https://trafficdirector.180workspace.com',
            'https://*.180workspace.com'
        ],
        allowedScopes: [
            'openid',
            'identity:read',
            'identity:email'
        ],
        isVerified: true,
        isActive: true,
        logoUrl: '/icon.svg'
    }
];

/**
 * Ensures first-party applications are present in the database.
 */
export async function seedFirstPartyOAuthApps(): Promise<void> {
    try {
        // Find a system user or admin to associate first-party apps
        const systemUser = await prisma.user.findFirst({
            where: { role: 'SUPERADMIN' }
        }) || await prisma.user.findFirst();

        if (!systemUser) {
            console.log('[SeedFirstParty] No user record available yet for app seeding, will seed on first boot.');
            return;
        }

        for (const app of FIRST_PARTY_APPS) {
            const existing = await prisma.oAuthApp.findUnique({
                where: { clientId: app.clientId }
            });

            if (!existing) {
                const secret = `180_secret_${app.clientId}_${Date.now()}`;
                await prisma.oAuthApp.create({
                    data: {
                        name: app.name,
                        description: app.description,
                        clientId: app.clientId,
                        clientSecretHash: hashSecret(secret),
                        clientSecretHint: secret.slice(-4),
                        redirectUris: app.redirectUris,
                        allowedOrigins: app.allowedOrigins,
                        allowedScopes: app.allowedScopes,
                        isVerified: app.isVerified,
                        isActive: app.isActive,
                        logoUrl: app.logoUrl,
                        userId: systemUser.id
                    }
                });
                console.log(`[SeedFirstParty] Created first-party OAuth app: ${app.name} (${app.clientId})`);
            } else {
                // Ensure redirect URIs and allowed origins stay up-to-date
                const mergedUris = Array.from(new Set([...(existing.redirectUris || []), ...app.redirectUris]));
                const mergedOrigins = Array.from(new Set([...(existing.allowedOrigins || []), ...app.allowedOrigins]));
                if (mergedUris.length !== (existing.redirectUris || []).length || mergedOrigins.length !== (existing.allowedOrigins || []).length) {
                    await prisma.oAuthApp.update({
                        where: { id: existing.id },
                        data: {
                            redirectUris: mergedUris,
                            allowedOrigins: mergedOrigins,
                            isActive: true
                        }
                    });
                    console.log(`[SeedFirstParty] Updated redirect URIs and origins for: ${app.name} (${app.clientId})`);
                }
            }
        }
    } catch (e: any) {
        console.warn('[SeedFirstParty] Database seeding non-blocking note:', e.message);
    }
}
