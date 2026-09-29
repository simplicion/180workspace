'use strict';

import { developersPrisma as prisma } from '@workspace/db-180core';
import { generateRandomToken, hashSecret } from '../oauth/oauth.service';

export class DeveloperController {
    /**
     * List all OAuth applications owned by the authenticated developer
     */
    static async listApps(req: any, res: any) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Authentication required' });
            }

            const apps = await prisma.oAuthApp.findMany({
                where: { userId },
                include: {
                    _count: {
                        select: {
                            tokens: true,
                            consents: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            const sanitized = apps.map((app: any) => ({
                id: app.id,
                name: app.name,
                description: app.description,
                clientId: app.clientId,
                clientSecretHint: app.clientSecretHint,
                redirectUris: app.redirectUris,
                allowedOrigins: app.allowedOrigins,
                logoUrl: app.logoUrl,
                homepageUrl: app.homepageUrl,
                isVerified: app.isVerified,
                isActive: app.isActive,
                enableAuth: app.enableAuth ?? true,
                enablePay: app.enablePay ?? true,
                webhookUrl: app.webhookUrl || '',
                webhookSecret: app.webhookSecret || '',
                allowedScopes: app.allowedScopes,
                metrics: {
                    activeTokens: app._count.tokens,
                    authorizedUsers: app._count.consents
                },
                createdAt: app.createdAt,
                updatedAt: app.updatedAt
            }));

            return res.json({ success: true, apps: sanitized });
        } catch (err: any) {
            console.error('[DeveloperController] listApps error:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
    }

    /**
     * Get a single OAuth application by ID or Client ID
     */
    static async getApp(req: any, res: any) {
        try {
            const userId = req.user?.id;
            const { id } = req.params;

            const app = await prisma.oAuthApp.findFirst({
                where: {
                    OR: [
                        { id, userId },
                        { clientId: id, userId }
                    ]
                },
                include: {
                    _count: {
                        select: {
                            tokens: true,
                            consents: true
                        }
                    }
                }
            });

            if (!app) {
                return res.status(404).json({ success: false, message: 'OAuth application not found' });
            }

            return res.json({
                success: true,
                app: {
                    id: app.id,
                    name: app.name,
                    description: app.description,
                    clientId: app.clientId,
                    clientSecretHint: app.clientSecretHint,
                    redirectUris: app.redirectUris,
                    allowedOrigins: app.allowedOrigins,
                    logoUrl: app.logoUrl,
                    homepageUrl: app.homepageUrl,
                    isVerified: app.isVerified,
                    isActive: app.isActive,
                    enableAuth: (app as any).enableAuth ?? true,
                    enablePay: (app as any).enablePay ?? true,
                    webhookUrl: (app as any).webhookUrl || '',
                    webhookSecret: (app as any).webhookSecret || '',
                    allowedScopes: app.allowedScopes,
                    metrics: {
                        activeTokens: app._count.tokens,
                        authorizedUsers: app._count.consents
                    },
                    createdAt: app.createdAt,
                    updatedAt: app.updatedAt
                }
            });
        } catch (err: any) {
            console.error('[DeveloperController] getApp error:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
    }

    /**
     * Create a new OAuth application and generate Client ID + Secret + Webhook Secret
     */
    static async createApp(req: any, res: any) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Authentication required' });
            }

            const {
                name,
                description,
                redirectUris = [],
                allowedOrigins = [],
                logoUrl,
                homepageUrl,
                allowedScopes,
                enableAuth = true,
                enablePay = true,
                webhookUrl = ''
            } = req.body;

            if (!name || String(name).trim().length < 2) {
                return res.status(400).json({ success: false, message: 'Application name is required (min 2 characters)' });
            }

            // Generate client ID, high-entropy secret, and webhook secret
            const clientId = generateRandomToken('180_client', 16);
            const rawSecret = generateRandomToken('180_secret', 32);
            const clientSecretHash = hashSecret(rawSecret);
            const clientSecretHint = `...${rawSecret.slice(-4)}`;
            const webhookSecret = generateRandomToken('whsec', 24);

            const app = await prisma.oAuthApp.create({
                data: {
                    name: String(name).trim(),
                    description: description ? String(description).trim() : '',
                    clientId,
                    clientSecretHash,
                    clientSecretHint,
                    redirectUris: Array.isArray(redirectUris) ? redirectUris.filter(Boolean) : [],
                    allowedOrigins: Array.isArray(allowedOrigins) ? allowedOrigins.filter(Boolean) : [],
                    logoUrl: logoUrl || '',
                    homepageUrl: homepageUrl || '',
                    allowedScopes: Array.isArray(allowedScopes) && allowedScopes.length > 0 ? allowedScopes : ['identity:read'],
                    enableAuth: Boolean(enableAuth),
                    enablePay: Boolean(enablePay),
                    webhookUrl: String(webhookUrl || '').trim(),
                    webhookSecret,
                    userId
                } as any
            });

            return res.status(201).json({
                success: true,
                message: 'Application created successfully. Store your Client Secret safely, it will not be shown again.',
                app: {
                    id: app.id,
                    name: app.name,
                    clientId: app.clientId,
                    clientSecret: rawSecret, // RETURNED ONCE ON CREATION
                    webhookSecret,
                    enableAuth: (app as any).enableAuth,
                    enablePay: (app as any).enablePay,
                    webhookUrl: (app as any).webhookUrl,
                    redirectUris: app.redirectUris,
                    allowedScopes: app.allowedScopes
                }
            });
        } catch (err: any) {
            console.error('[DeveloperController] createApp error:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
    }

    /**
     * Update an existing OAuth application (toggles, settings, webhooks)
     */
    static async updateApp(req: any, res: any) {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            const {
                name,
                description,
                redirectUris,
                allowedOrigins,
                logoUrl,
                homepageUrl,
                allowedScopes,
                isActive,
                enableAuth,
                enablePay,
                webhookUrl
            } = req.body;

            const app = await prisma.oAuthApp.findFirst({
                where: { id, userId }
            });

            if (!app) {
                return res.status(404).json({ success: false, message: 'OAuth application not found' });
            }

            const updated = await prisma.oAuthApp.update({
                where: { id },
                data: {
                    ...(name && { name: String(name).trim() }),
                    ...(description !== undefined && { description: String(description).trim() }),
                    ...(redirectUris && { redirectUris: Array.isArray(redirectUris) ? redirectUris.filter(Boolean) : [] }),
                    ...(allowedOrigins && { allowedOrigins: Array.isArray(allowedOrigins) ? allowedOrigins.filter(Boolean) : [] }),
                    ...(logoUrl !== undefined && { logoUrl }),
                    ...(homepageUrl !== undefined && { homepageUrl }),
                    ...(allowedScopes && { allowedScopes }),
                    ...(isActive !== undefined && { isActive: Boolean(isActive) }),
                    ...(enableAuth !== undefined && { enableAuth: Boolean(enableAuth) }),
                    ...(enablePay !== undefined && { enablePay: Boolean(enablePay) }),
                    ...(webhookUrl !== undefined && { webhookUrl: String(webhookUrl).trim() })
                } as any
            });

            return res.json({
                success: true,
                message: 'Application updated successfully',
                app: {
                    id: updated.id,
                    name: updated.name,
                    clientId: updated.clientId,
                    enableAuth: (updated as any).enableAuth,
                    enablePay: (updated as any).enablePay,
                    webhookUrl: (updated as any).webhookUrl,
                    redirectUris: updated.redirectUris,
                    allowedScopes: updated.allowedScopes,
                    isActive: updated.isActive
                }
            });
        } catch (err: any) {
            console.error('[DeveloperController] updateApp error:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
    }

    /**
     * Rotate Client Secret
     */
    static async rotateSecret(req: any, res: any) {
        try {
            const userId = req.user?.id;
            const { id } = req.params;

            const app = await prisma.oAuthApp.findFirst({
                where: { id, userId }
            });

            if (!app) {
                return res.status(404).json({ success: false, message: 'OAuth application not found' });
            }

            const newRawSecret = generateRandomToken('180_secret', 32);
            const clientSecretHash = hashSecret(newRawSecret);
            const clientSecretHint = `...${newRawSecret.slice(-4)}`;

            await prisma.oAuthApp.update({
                where: { id },
                data: {
                    clientSecretHash,
                    clientSecretHint
                }
            });

            return res.json({
                success: true,
                message: 'Client secret rotated successfully. Copy the new secret now.',
                clientSecret: newRawSecret
            });
        } catch (err: any) {
            console.error('[DeveloperController] rotateSecret error:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
    }

    /**
     * Rotate Webhook Secret
     */
    static async rotateWebhookSecret(req: any, res: any) {
        try {
            const userId = req.user?.id;
            const { id } = req.params;

            const app = await prisma.oAuthApp.findFirst({
                where: { id, userId }
            });

            if (!app) {
                return res.status(404).json({ success: false, message: 'OAuth application not found' });
            }

            const newWebhookSecret = generateRandomToken('whsec', 24);

            await prisma.oAuthApp.update({
                where: { id },
                data: {
                    webhookSecret: newWebhookSecret
                } as any
            });

            return res.json({
                success: true,
                message: 'Webhook signing secret rotated successfully.',
                webhookSecret: newWebhookSecret
            });
        } catch (err: any) {
            console.error('[DeveloperController] rotateWebhookSecret error:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
    }

    /**
     * Test Webhook Dispatch directly to Developer Server
     */
    static async testWebhook(req: any, res: any) {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            const axios = require('axios');
            const crypto = require('crypto');

            const app = await prisma.oAuthApp.findFirst({
                where: { id, userId }
            });

            if (!app) {
                return res.status(404).json({ success: false, message: 'OAuth application not found' });
            }

            const targetUrl = (app as any).webhookUrl || req.body?.url;
            if (!targetUrl || !targetUrl.startsWith('http')) {
                return res.status(400).json({ success: false, message: 'No valid webhook URL configured for this app' });
            }

            const signingSecret = (app as any).webhookSecret || app.clientSecretHash;
            const payload = {
                event: 'payment.test',
                id: `evt_test_${Date.now()}`,
                createdAt: new Date().toISOString(),
                data: {
                    sessionId: `cs_test_${generateRandomToken('180', 8)}`,
                    amount: 499.00,
                    currency: 'INR',
                    title: 'Test Webhook Verification Payment',
                    customer: {
                        name: '180 Test Customer',
                        email: 'test@180workspace.com'
                    },
                    metadata: {
                        tier: 'pro_monthly',
                        isSandbox: true
                    },
                    timestamp: new Date().toISOString()
                }
            };

            const payloadString = JSON.stringify(payload);
            const signature = crypto
                .createHmac('sha256', signingSecret)
                .update(payloadString)
                .digest('hex');

            const startTime = Date.now();
            let deliveryStatus = 'SUCCESS';
            let responseStatus = 200;
            let responseBody = '';

            try {
                const response = await axios.post(targetUrl, payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-180-Signature': signature,
                        'X-180-Event': 'payment.test',
                        'User-Agent': '180-Webhook-Dispatcher/1.0'
                    },
                    timeout: 8000
                });
                responseStatus = response.status;
                responseBody = typeof response.data === 'string' ? response.data.slice(0, 500) : JSON.stringify(response.data).slice(0, 500);
            } catch (httpErr: any) {
                deliveryStatus = 'FAILED';
                responseStatus = httpErr.response?.status || 500;
                responseBody = httpErr.response?.data ? JSON.stringify(httpErr.response.data).slice(0, 500) : httpErr.message;
            }

            const latencyMs = Date.now() - startTime;

            return res.json({
                success: deliveryStatus === 'SUCCESS',
                targetUrl,
                event: 'payment.test',
                signature,
                statusCode: responseStatus,
                latencyMs,
                response: responseBody,
                message: deliveryStatus === 'SUCCESS' 
                    ? `Webhook verified successfully (HTTP ${responseStatus} in ${latencyMs}ms)` 
                    : `Webhook delivered with error (HTTP ${responseStatus} in ${latencyMs}ms)`
            });
        } catch (err: any) {
            console.error('[DeveloperController] testWebhook error:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
    }

    /**
     * Delete an OAuth Application
     */
    static async deleteApp(req: any, res: any) {
        try {
            const userId = req.user?.id;
            const { id } = req.params;

            const app = await prisma.oAuthApp.findFirst({
                where: { id, userId }
            });

            if (!app) {
                return res.status(404).json({ success: false, message: 'OAuth application not found' });
            }

            await prisma.oAuthApp.delete({
                where: { id }
            });

            return res.json({ success: true, message: 'Application deleted successfully' });
        } catch (err: any) {
            console.error('[DeveloperController] deleteApp error:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
    }
}
