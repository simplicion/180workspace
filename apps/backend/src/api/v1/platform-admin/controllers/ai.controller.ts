import { Request, Response, NextFunction } from 'express';
import { PlatformAiVaultService } from '@workspace/ai';

export class PlatformAiAdminController {
    /**
     * Get platform AI summary, configured providers, masked previews, and default provider.
     */
    static async getAiConfig(req: Request, res: Response, next: NextFunction) {
        try {
            const summary = await PlatformAiVaultService.getAdminSummary();
            res.json({
                success: true,
                data: summary
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Save/update a provider's API key with AES-256-GCM encryption in the database.
     */
    static async saveKey(req: Request, res: Response, next: NextFunction) {
        try {
            const { provider, apiKey, model, endpointUrl, isActive } = req.body;
            if (!provider || typeof provider !== 'string') {
                return res.status(400).json({ error: 'Provider name is required (openai, gemini, claude, groq, custom).' });
            }
            if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
                return res.status(400).json({ error: 'API key is required.' });
            }

            const superAdmin = (req as any).superAdmin;
            const updatedBy = superAdmin?.email || superAdmin?.name || 'SuperAdmin';

            const result = await PlatformAiVaultService.setProviderKey({
                provider,
                apiKey: apiKey.trim(),
                model,
                endpointUrl,
                isActive: isActive !== undefined ? Boolean(isActive) : true,
                updatedBy
            });

            res.json({
                success: true,
                message: `Successfully updated and encrypted ${provider.toUpperCase()} credentials in database.`,
                preview: result.preview
            });
        } catch (err: any) {
            next(err);
        }
    }

    /**
     * Update model, endpoint or status without re-entering the key.
     */
    static async updateMetadata(req: Request, res: Response, next: NextFunction) {
        try {
            const { provider, model, endpointUrl, isActive } = req.body;
            if (!provider) {
                return res.status(400).json({ error: 'Provider is required.' });
            }

            await PlatformAiVaultService.updateProviderMetadata({
                provider,
                model,
                endpointUrl,
                isActive: isActive !== undefined ? Boolean(isActive) : undefined
            });

            res.json({
                success: true,
                message: `Updated settings for ${provider.toUpperCase()}.`
            });
        } catch (err: any) {
            next(err);
        }
    }

    /**
     * Test real connection against an AI provider.
     */
    static async testConnection(req: Request, res: Response, next: NextFunction) {
        try {
            const { provider, apiKey, endpointUrl, model } = req.body;
            if (!provider) {
                return res.status(400).json({ error: 'Provider is required.' });
            }

            const result = await PlatformAiVaultService.testConnection({
                provider,
                apiKey,
                endpointUrl,
                model
            });

            res.json({
                success: true,
                data: result
            });
        } catch (err: any) {
            res.status(400).json({
                success: false,
                error: err.message || 'Connection test failed'
            });
        }
    }

    /**
     * Set default platform AI provider.
     */
    static async setDefaultProvider(req: Request, res: Response, next: NextFunction) {
        try {
            const { provider } = req.body;
            if (!provider) {
                return res.status(400).json({ error: 'Provider is required.' });
            }

            await PlatformAiVaultService.setDefaultProvider(provider);
            res.json({
                success: true,
                message: `Default platform AI provider set to ${provider.toUpperCase()}.`
            });
        } catch (err: any) {
            next(err);
        }
    }

    /**
     * Remove a provider key from database.
     */
    static async deleteKey(req: Request, res: Response, next: NextFunction) {
        try {
            const { provider } = req.params;
            if (!provider) {
                return res.status(400).json({ error: 'Provider is required.' });
            }

            await PlatformAiVaultService.deleteProviderKey(provider);
            res.json({
                success: true,
                message: `Cleared ${provider.toUpperCase()} credentials from database.`
            });
        } catch (err: any) {
            next(err);
        }
    }
}
