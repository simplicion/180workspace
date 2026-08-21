import { Request, Response, NextFunction } from 'express';
import { SystemLogService } from '@workspace/platform-admin';

export const activityLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page = '1', limit = '50' } = req.query;
        const pageNum = Number(page);
        const limitNum = Number(limit);

        const { logs, total } = await SystemLogService.getActivityLogs(pageNum, limitNum);
        res.json({ logs, total });
    } catch (err: any) {
  next(err);
}
};

export const failedLogins = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page = '1', limit = '50' } = req.query;
        const pageNum = Number(page);
        const limitNum = Number(limit);

        const { logs, total } = await SystemLogService.getFailedLogins(pageNum, limitNum);
        res.json({ logs, total });
    } catch (err: any) {
  next(err);
}
};
