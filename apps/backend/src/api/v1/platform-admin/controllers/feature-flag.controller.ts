import { Request, Response, NextFunction } from 'express';
import { FeatureFlagService } from '@workspace/platform-admin';
import { redisClient } from '../../../../system-configs/utils/redis';

export const list = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const flags = await FeatureFlagService.list();
        res.json({ flags });
    } catch (err: any) {
        next(err);
    }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const flag = await FeatureFlagService.create(req.body, (req as any).superAdmin?.id);
        res.status(201).json({ flag });
    } catch (err: any) {
        next(err);
    }
};

export const toggle = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const flag = await FeatureFlagService.toggle(req.params.id, (req as any).superAdmin?.id);
        
        // Invalidate init caches in Redis so clients pick up changes immediately
        try {
            const keys = await redisClient.keys('init:*');
            if (keys.length > 0) {
                await redisClient.del(...keys);
            }
        } catch (e) {
            // Non-blocking cache flush error
        }

        res.json({ flag });
    } catch (err: any) {
        next(err);
    }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await FeatureFlagService.remove(req.params.id);
        res.json({ message: 'Feature flag deleted' });
    } catch (err: any) {
        next(err);
    }
};

export const sync = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await FeatureFlagService.syncPlatformFlags();
        const flags = await FeatureFlagService.list();
        res.json({ flags, message: 'Platform app flags synchronized successfully' });
    } catch (err: any) {
        next(err);
    }
};
