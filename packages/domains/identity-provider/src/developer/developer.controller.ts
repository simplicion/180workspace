'use strict';

import { prisma } from '@workspace/db';
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
     * Create a new OAuth application and generate Client ID + Secret
     */
    static async createApp(req: any, res: any) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Authentication required' });
            }

            const { name, description, redirectUris = [], allowedOrigins = [], logoUrl, homepageUrl, allowedScopes } = req.body;

            if (!name || String(name).trim().length < 2) {
                return res.status(400).json({ success: false, message: 'Application name is required (min 2 characters)' });
            }

            // Generate client ID and high-entropy secret
            const clientId = generateRandomToken('180_client', 16);
            const rawSecret = generateRandomToken('180_secret', 32);
            const clientSecretHash = hashSecret(rawSecret);
            const clientSecretHint = `...${rawSecret.slice(-4)}`;

            // Check if user has a company to link
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { companyId: true }
            });

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
                    userId,
                    companyId: user?.companyId || null
                }
            });

            return res.status(201).json({
                success: true,
                message: 'Application created successfully. Store your Client Secret safely, it will not be shown again.',
                app: {
                    id: app.id,
                    name: app.name,
                    clientId: app.clientId,
                    clientSecret: rawSecret, // RETURNED ONCE ON CREATION
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
     * Update an existing OAuth application
     */
    static async updateApp(req: any, res: any) {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            const { name, description, redirectUris, allowedOrigins, logoUrl, homepageUrl, allowedScopes, isActive } = req.body;

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
                    ...(isActive !== undefined && { isActive: Boolean(isActive) })
                }
            });

            return res.json({
                success: true,
                message: 'Application updated successfully',
                app: {
                    id: updated.id,
                    name: updated.name,
                    clientId: updated.clientId,
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
