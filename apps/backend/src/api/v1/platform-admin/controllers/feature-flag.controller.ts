import { Request, Response, NextFunction } from 'express';
import { FeatureFlagService } from '@workspace/platform-admin';

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
        const flag = await FeatureFlagService.create(req.body, (req as any).superAdmin.id);
        res.status(201).json({ flag });
    } catch (err: any) {
  next(err);
}
};

export const toggle = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const flag = await FeatureFlagService.toggle(req.params.id, (req as any).superAdmin.id);
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
