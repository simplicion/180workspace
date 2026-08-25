import { Request, Response, NextFunction } from 'express';
import { WorkLogService } from '@workspace/projects-and-tasks-domain';

export const submitWorkLog = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await WorkLogService.submitWorkLog(req.body, (req as any).user);
        res.status(201).json(result);
    } catch (err) { next(err); }
};

export const getLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await WorkLogService.getLogs(req.query, (req as any).user);
        res.json(result);
    } catch (err: any) {
        if (err.message === 'projectId is required') return res.status(400).json({ success: false, message: err.message });
        next(err);
    }
};

export const getMyLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await WorkLogService.getMyLogs(req.query, (req as any).user);
        res.json(result);
    } catch (err) { next(err); }
};

export const getAllLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await WorkLogService.getAllLogs(req.query, (req as any).user);
        res.json(result);
    } catch (err) { next(err); }
};

export const getPendingReviews = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await WorkLogService.getPendingReviews(req.query, (req as any).user);
        res.json(result);
    } catch (err) { next(err); }
};

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await WorkLogService.getDashboardStats(req.query, (req as any).user);
        res.json(result);
    } catch (err) { next(err); }
};

export const reviewWorkLog = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await WorkLogService.reviewWorkLog(req.params.id, req.body, (req as any).user);
        res.json(result);
    } catch (err) { next(err); }
};
