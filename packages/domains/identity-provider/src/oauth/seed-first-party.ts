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
        authDesktopDefault: 'popup',
        authMobileDefault: 'bottom_sheet',
        payDesktopDefault: 'bottom_sheet',
        payMobileDefault: 'bottom_sheet',
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
        authDesktopDefault: 'popup',
        authMobileDefault: 'bottom_sheet',
        payDesktopDefault: 'bottom_sheet',
        payMobileDefault: 'bottom_sheet',
        logoUrl: '/icon.svg'
    },
    {
        clientId: '180-social-studio-mobile',
        name: '180 Social Studio',
        description: 'Multi-Channel Social Media Automation & Analytics',
        redirectUris: [
            'workspace180://oauth/callback',
            'workspace180://oauth-callback',
            '180social://oauth-callback',
            '180social://oauth/callback',
            'socialstudio://oauth-callback',
            'socialstudio://oauth/callback',
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
        authDesktopDefault: 'popup',
        authMobileDefault: 'bottom_sheet',
        payDesktopDefault: 'bottom_sheet',
        payMobileDefault: 'bottom_sheet',
        logoUrl: '/social-studio.png'
    },
    {
        clientId: '180-traffic-director',
        name: '180 Traffic Director',
        description: 'Enterprise Edge Traffic Router, Safe Reverse Proxy & Bot Armor',
        redirectUris: [
            'http://localhost:3000/callback',
            'http://localhost:3006/callback',
            'http://localhost:3006/oauth/callback',
            'http://localhost:3009/callback',
            'http://localhost:3002/callback',
            'https://traffic.180workspace.com/callback',
            'https://traffic.180workspace.com/oauth/callback',
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
            'https://traffic.180workspace.com',
            'https://traffic-director.180workspace.com',
            'https://trafficdirector.180workspace.com',
            'https://*.180workspace.com'
        ],
        allowedScopes: [
            'openid',
            'identity:read',
            'identity:email',
            'pay:checkout',
            'pay:subscriptions'
        ],
        isVerified: true,
        isActive: true,
        enablePay: true,
        authDesktopDefault: 'popup',
        authMobileDefault: 'bottom_sheet',
        payDesktopDefault: 'bottom_sheet',
        payMobileDefault: 'bottom_sheet',
        webhookUrl: process.env.TRAFFIC_DIRECTOR_WEBHOOK_URL || 'http://localhost:4002/api/v1/traffic-director/billing/webhook',
        webhookSecret: process.env.TRAFFIC_DIRECTOR_WEBHOOK_SECRET || '180_webhook_traffic_director_prod_sec_991823',
        logoUrl: '/icon.svg'
    },
    {
        clientId: '180-developers-portal',
        name: '180 Developers Console',
        description: 'Developer Console & API Management for 180 Workspace Ecosystem',
        redirectUris: [
            'http://localhost:3000/callback',
            'http://localhost:3000/oauth/callback',
            'http://localhost:3008/callback',
            'http://localhost:3008/oauth/callback',
            'http://127.0.0.1:3008/callback',
            'http://127.0.0.1:3008/oauth/callback',
            'http://localhost:3002/callback',
            'https://developers.180workspace.com/callback',
            'https://developers.180workspace.com/oauth/callback',
            'https://*.180workspace.com/callback',
            'https://*.180workspace.com/oauth/callback'
        ],
        allowedOrigins: [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:3008',
            'http://127.0.0.1:3008',
            'http://localhost:3002',
            'http://127.0.0.1:3002',
            'https://developers.180workspace.com',
            'https://*.180workspace.com'
        ],
        allowedScopes: [
            'openid',
            'identity:read',
            'identity:email',
            'identity:phone',
            'developer:read',
            'developer:write'
        ],
        isVerified: true,
        isActive: true,
        authDesktopDefault: 'popup',
        authMobileDefault: 'bottom_sheet',
        payDesktopDefault: 'bottom_sheet',
        payMobileDefault: 'bottom_sheet',
        logoUrl: '/icon.svg'
    },
    {
        clientId: '180-developer-portal',
        name: '180 Developers Console',
        description: 'Developer Console & API Management for 180 Workspace Ecosystem',
        redirectUris: [
            'http://localhost:3000/callback',
            'http://localhost:3000/oauth/callback',
            'http://localhost:3008/callback',
            'http://localhost:3008/oauth/callback',
            'http://127.0.0.1:3008/callback',
            'http://127.0.0.1:3008/oauth/callback',
            'http://localhost:3002/callback',
            'https://developers.180workspace.com/callback',
            'https://developers.180workspace.com/oauth/callback',
            'https://*.180workspace.com/callback',
            'https://*.180workspace.com/oauth/callback'
        ],
        allowedOrigins: [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:3008',
            'http://127.0.0.1:3008',
            'http://localhost:3002',
            'http://127.0.0.1:3002',
            'https://developers.180workspace.com',
            'https://*.180workspace.com'
        ],
        allowedScopes: [
            'openid',
            'identity:read',
            'identity:email',
            'identity:phone',
            'developer:read',
            'developer:write'
        ],
        isVerified: true,
        isActive: true,
        authDesktopDefault: 'popup',
        authMobileDefault: 'bottom_sheet',
        payDesktopDefault: 'bottom_sheet',
        payMobileDefault: 'bottom_sheet',
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

            const knownSecret =
                app.clientId === '180-traffic-director'
                    ? (process.env.TRAFFIC_DIRECTOR_CLIENT_SECRET || '180_secret_traffic_director_prod_key_771829')
                    : app.clientId === '180_client_5cc136397553836e34eb37ce22d13a53'
                        ? (process.env.ONE_EIGHTY_CLIENT_SECRET || '180_secret_workspace_core_prod_key_5cc136')
                        : `180_secret_${app.clientId}`;

            if (!existing) {
                await prisma.oAuthApp.create({
                    data: {
                        name: app.name,
                        description: app.description,
                        clientId: app.clientId,
                        clientSecretHash: hashSecret(knownSecret),
                        clientSecretHint: knownSecret.slice(-4),
                        redirectUris: app.redirectUris,
                        allowedOrigins: app.allowedOrigins,
                        allowedScopes: app.allowedScopes,
                        isVerified: app.isVerified,
                        isActive: app.isActive,
                        enablePay: (app as any).enablePay !== undefined ? (app as any).enablePay : true,
                        authDesktopDefault: (app as any).authDesktopDefault || 'popup',
                        authMobileDefault: (app as any).authMobileDefault || 'bottom_sheet',
                        payDesktopDefault: (app as any).payDesktopDefault || 'bottom_sheet',
                        payMobileDefault: (app as any).payMobileDefault || 'bottom_sheet',
                        webhookUrl: (app as any).webhookUrl || '',
                        webhookSecret: (app as any).webhookSecret || '',
                        logoUrl: app.logoUrl,
                        userId: systemUser.id
                    }
                });
                console.log(`[SeedFirstParty] Created first-party OAuth app: ${app.name} (${app.clientId})`);
            } else {
                // Ensure redirect URIs, allowed origins, and UX default modes stay up-to-date
                const mergedUris = Array.from(new Set([...(existing.redirectUris || []), ...app.redirectUris]));
                const mergedOrigins = Array.from(new Set([...(existing.allowedOrigins || []), ...app.allowedOrigins]));
                const updateData: any = {};

                if (mergedUris.length !== (existing.redirectUris || []).length || mergedOrigins.length !== (existing.allowedOrigins || []).length) {
                    updateData.redirectUris = mergedUris;
                    updateData.allowedOrigins = mergedOrigins;
                    updateData.isActive = true;
                }

                if (!existing.authDesktopDefault) {
                    updateData.authDesktopDefault = (app as any).authDesktopDefault || 'popup';
                }
                if (!existing.authMobileDefault) {
                    updateData.authMobileDefault = (app as any).authMobileDefault || 'bottom_sheet';
                }

                if (app.clientId === '180_client_5cc136397553836e34eb37ce22d13a53') {
                    updateData.clientSecretHash = hashSecret(knownSecret);
                    updateData.clientSecretHint = knownSecret.slice(-4);
                    updateData.isActive = true;
                }

                if (app.clientId === '180-traffic-director') {
                    updateData.clientSecretHash = hashSecret(knownSecret);
                    updateData.clientSecretHint = knownSecret.slice(-4);
                    updateData.enablePay = true;
                    updateData.isActive = true;

                    const targetWebhookUrl = process.env.TRAFFIC_DIRECTOR_WEBHOOK_URL || (existing.webhookUrl ? existing.webhookUrl : (app as any).webhookUrl);
                    const targetWebhookSecret = process.env.TRAFFIC_DIRECTOR_WEBHOOK_SECRET || (existing.webhookSecret ? existing.webhookSecret : (app as any).webhookSecret);

                    if (targetWebhookUrl && targetWebhookUrl !== existing.webhookUrl) {
                        updateData.webhookUrl = targetWebhookUrl;
                    }
                    if (targetWebhookSecret && targetWebhookSecret !== existing.webhookSecret) {
                        updateData.webhookSecret = targetWebhookSecret;
                    }
                }

                if (Object.keys(updateData).length > 0) {
                    await prisma.oAuthApp.update({
                        where: { id: existing.id },
                        data: updateData
                    });
                    console.log(`[SeedFirstParty] Updated configurations for: ${app.name} (${app.clientId})`);
                }
            }

            // Seed default subscription plans for 180 Traffic Director
            if (app.clientId === '180-traffic-director') {
                const targetApp = await prisma.oAuthApp.findUnique({ where: { clientId: app.clientId } });
                if (targetApp) {
                    if (!targetApp.enablePay) {
                        await prisma.oAuthApp.update({
                            where: { id: targetApp.id },
                            data: { enablePay: true }
                        });
                    }

                    const DEFAULT_TRAFFIC_PLANS = [
                        {
                            planCode: 'traffic-starter',
                            name: 'Traffic Director Starter',
                            description: 'Max 2 Smart Links with Anycast Routing & Bot Shields',
                            amount: 25.0,
                            currency: 'USD',
                            interval: 'MONTHLY'
                        },
                        {
                            planCode: 'traffic-pro',
                            name: 'Traffic Director Pro',
                            description: 'Max 5 Smart Links with Dynamic Shield & AdBot Cloaking',
                            amount: 50.0,
                            currency: 'USD',
                            interval: 'MONTHLY'
                        },
                        {
                            planCode: 'traffic-enterprise',
                            name: 'Traffic Director Enterprise',
                            description: 'Unlimited Smart Links with Dedicated Tor RAM Sets',
                            amount: 75.0,
                            currency: 'USD',
                            interval: 'MONTHLY'
                        }
                    ];

                    for (const plan of DEFAULT_TRAFFIC_PLANS) {
                        await (prisma as any).subscriptionPlan.upsert({
                            where: {
                                appId_planCode: {
                                    appId: targetApp.id,
                                    planCode: plan.planCode
                                }
                            },
                            update: {
                                name: plan.name,
                                description: plan.description,
                                amount: plan.amount,
                                currency: plan.currency,
                                interval: plan.interval,
                                isActive: true
                            },
                            create: {
                                appId: targetApp.id,
                                planCode: plan.planCode,
                                name: plan.name,
                                description: plan.description,
                                amount: plan.amount,
                                currency: plan.currency,
                                interval: plan.interval,
                                isActive: true
                            }
                        });
                    }
                }
            }
        }
    } catch (e: any) {
        console.warn('[SeedFirstParty] Database seeding non-blocking note:', e.message);
    }
}
