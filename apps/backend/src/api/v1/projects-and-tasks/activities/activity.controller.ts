import { Request, Response, NextFunction } from 'express';
import { ActivityService } from '@workspace/projects-and-tasks-domain';

export const getActivityLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ActivityService.getActivityLogs(req.query, (req as any).user);
        res.json(result);
    } catch (err) { next(err); }
};

export const updateActivityAccess = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ActivityService.updateActivityAccess(req.body.userId, req.body.canViewActivity);
        res.json(result);
    } catch (err: any) {
        if (err.message === 'User ID is required') return res.status(400).json({ error: err.message });
        if (err.message === 'User not found') return res.status(404).json({ error: err.message });
        next(err);
    }
};
