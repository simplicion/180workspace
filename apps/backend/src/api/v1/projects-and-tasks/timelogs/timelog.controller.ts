import { Request, Response, NextFunction } from 'express';
import { TimeLogService } from '@workspace/projects-and-tasks-domain';

export const getTimeLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await TimeLogService.getTimeLogs(req.query, (req as any).user);
        res.json(result);
    } catch (err) { next(err); }
};

export const startTimer = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await TimeLogService.startTimer(req.body, (req as any).user);
        res.status(201).json(result);
    } catch (err) { next(err); }
};

export const stopTimer = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await TimeLogService.stopTimer((req as any).user);
        res.json(result);
    } catch (err: any) {
        if (err.message === 'No active timer found.') return res.status(404).json({ error: err.message });
        next(err);
    }
};

export const createEntry = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await TimeLogService.createEntry(req.body, (req as any).user);
        res.status(201).json(result);
    } catch (err) { next(err); }
};

export const deleteTimeLog = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await TimeLogService.deleteTimeLog(req.params.id, (req as any).user);
        res.json(result);
    } catch (err: any) {
        if (err.message === 'Log not found.') return res.status(404).json({ error: err.message });
        if (err.message === 'Permission denied.') return res.status(403).json({ error: err.message });
        next(err);
    }
};
