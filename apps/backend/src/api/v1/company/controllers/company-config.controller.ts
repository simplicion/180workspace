import { Request, Response, NextFunction } from 'express';
import { CompanyConfigService } from '@workspace/company';
import { requestContext } from '@workspace/db';

const clearCompanyCache = async (companyId: string, userId?: string, next?: NextFunction) => {
    try {
        const { redis } = require('../../../../system-configs/config/redis');
        if (redis) {
            await redis.del(`company:${companyId}`);
            if (userId) {
                await redis.del(`init:user:${userId}:company:${companyId}`);
            }
            const initKeys = await redis.keys(`init:user:*:company:${companyId}`);
            if (initKeys && initKeys.length > 0) {
                await redis.del(...initKeys);
            }
        }
    } catch (cacheErr: any) {
        console.warn('[Cache] Failed to clear company config cache:', cacheErr.message);
        if (next) next(cacheErr);
    }
};

export const getCompanyConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        if (!companyId) {
            return res.status(401).json({ error: 'Workspace authentication required.' });
        }
        const config = await requestContext.run({ companyId }, async () => {
            return CompanyConfigService.getCompanyConfig(companyId);
        });
        res.json({ config });
    } catch (err: any) {
        if (err.message === 'Company not found') {
            return res.status(404).json({ error: err.message });
        }
        res.status(400).json({ error: err.message || 'Failed to retrieve company configuration' });
    }
};

export const updateCompanyConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        const userId = (req as any).user?.id;
        if (!companyId) {
            return res.status(401).json({ error: 'Workspace authentication required.' });
        }

        const { config, updatedCompany } = await requestContext.run({ companyId, userId }, async () => {
            return CompanyConfigService.updateCompanyConfig(req.body, companyId);
        });

        await clearCompanyCache(companyId, userId);

        res.json({ config, message: 'Company configuration updated successfully' });
    } catch (err: any) {
        if (err.message === 'Company not found') {
            return res.status(404).json({ error: err.message });
        }
        res.status(400).json({ error: err.message || 'Failed to update company configuration' });
    }
};

export const updateEnabledApps = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { apps } = req.body;
        const companyId = (req as any).user?.companyId;
        const userId = (req as any).user?.id;

        if (!companyId) {
            return res.status(401).json({ error: 'Workspace authentication required.' });
        }

        const { config, updatedCompany } = await requestContext.run({ companyId, userId }, async () => {
            return CompanyConfigService.updateEnabledApps(apps, companyId);
        });

        await clearCompanyCache(companyId, userId);

        res.json({ config, message: 'Apps updated successfully' });
    } catch (err: any) {
        const msg = err.message || '';
        if (msg === 'Apps must be an array') {
            return res.status(400).json({ error: msg });
        }
        if (msg === 'Company not found') {
            return res.status(404).json({ error: msg });
        }
        if (msg.includes('Free Starter') || msg.includes('upgrade') || msg.includes('plan') || msg.includes('requires')) {
            return res.status(403).json({ error: msg });
        }
        res.status(400).json({ error: msg || 'Failed to update enabled apps' });
    }
};

export const updateEnabledModules = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { modules } = req.body;
        const companyId = (req as any).user?.companyId;
        const userId = (req as any).user?.id;

        if (!companyId) {
            return res.status(401).json({ error: 'Workspace authentication required.' });
        }

        const { config, updatedCompany } = await requestContext.run({ companyId, userId }, async () => {
            return CompanyConfigService.updateEnabledModules(modules, companyId);
        });

        await clearCompanyCache(companyId, userId);

        res.json({ config, message: 'Modules updated successfully' });
    } catch (err: any) {
        const msg = err.message || '';
        if (msg === 'Modules must be an array') {
            return res.status(400).json({ error: msg });
        }
        if (msg === 'Company not found') {
            return res.status(404).json({ error: msg });
        }
        res.status(400).json({ error: msg || 'Failed to update enabled modules' });
    }
};
