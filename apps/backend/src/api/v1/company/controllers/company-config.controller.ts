import { Request, Response, NextFunction } from 'express';
import { CompanyConfigService } from '@workspace/company';

// Mock redis implementation for the sake of completion. In a real app this comes from a common redis provider.
// But we'll try to require it from system-configs just like the JS controller did, 
// using a require to prevent TS compilation errors if it's not strongly typed.
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
}

export const getCompanyConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        const config = await CompanyConfigService.getCompanyConfig();
        res.json({ config });
    } catch (err: any) {
        if (err.message === 'Company not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

export const updateCompanyConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        const userId = (req as any).user?.id;
        const { config, updatedCompany } = await CompanyConfigService.updateCompanyConfig(req.body);

        await clearCompanyCache(companyId, userId);

        res.json({ config, message: 'Company configuration updated successfully' });
    } catch (err: any) {
        if (err.message === 'Company not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

export const updateEnabledApps = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { apps } = req.body;
        const companyId = (req as any).user?.companyId;
        const userId = (req as any).user?.id;

        const { config, updatedCompany } = await CompanyConfigService.updateEnabledApps(apps);

        await clearCompanyCache(companyId, userId);

        res.json({ config, message: 'Apps updated successfully' });
    } catch (err: any) {
        if (err.message === 'Apps must be an array') {
            return res.status(400).json({ error: err.message });
        }
        if (err.message === 'Company not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

export const updateEnabledModules = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { modules } = req.body;
        const companyId = (req as any).user?.companyId;
        const userId = (req as any).user?.id;

        const { config, updatedCompany } = await CompanyConfigService.updateEnabledModules(modules);

        await clearCompanyCache(companyId, userId);

        res.json({ config, message: 'Modules updated successfully' });
    } catch (err: any) {
        if (err.message === 'Modules must be an array') {
            return res.status(400).json({ error: err.message });
        }
        if (err.message === 'Company not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};
