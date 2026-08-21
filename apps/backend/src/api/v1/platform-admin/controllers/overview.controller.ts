import { Request, Response, NextFunction } from 'express';
import { PlatformOverviewService } from '@workspace/platform-admin';

export const getOverview = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await PlatformOverviewService.getOverview();
        res.json(data);
    } catch (err: any) {
  next(err);
}
};
