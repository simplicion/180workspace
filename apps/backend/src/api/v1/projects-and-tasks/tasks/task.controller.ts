import { Request, Response, NextFunction } from 'express';
import { TaskService } from '@workspace/projects-and-tasks-domain';

export const getTasks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await TaskService.getTasks(req.query, (req as any).user);
        res.json(result);
    } catch (err) { next(err); }
};

export const createTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await TaskService.createTask(req.body, (req as any).user);
        res.status(201).json({ success: true, ...result });
    } catch (err) { next(err); }
};

export const getTaskById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await TaskService.getTaskById(req.params.id, (req as any).user);
        res.json(result);
    } catch (err: any) {
        if (err.message === 'Task not found') return res.status(404).json({ error: err.message });
        next(err);
    }
};

export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await TaskService.updateTask(req.params.id, req.body, (req as any).user);
        res.json({ success: true, ...result });
    } catch (err: any) {
        if (err.message === 'Task not found') return res.status(404).json({ error: err.message });
        if (err.message.includes('Access denied') || err.message.includes('Cannot change status')) return res.status(403).json({ error: err.message });
        next(err);
    }
};

export const addAttachments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { urls } = req.body;
        if (!Array.isArray(urls)) {
            return res.status(400).json({ error: 'urls array is required' });
        }
        const result = await TaskService.addAttachments(req.params.id, urls, (req as any).user);
        res.json({ success: true, ...result });
    } catch (err: any) {
        if (err.message === 'Task not found') return res.status(404).json({ error: err.message });
        if (err.message.includes('Access denied')) return res.status(403).json({ error: err.message });
        next(err);
    }
};

export const deleteTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await TaskService.deleteTask(req.params.id, (req as any).user);
        res.json(result);
    } catch (err) { next(err); }
};

export const bulkDeleteTasks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'ids array is required' });
        }
        const result = await TaskService.bulkDeleteTasks(ids, (req as any).user);
        res.json(result);
    } catch (err) { next(err); }
};

export const bulkUpdateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { ids, status } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'ids array is required' });
        }
        if (!status) {
            return res.status(400).json({ error: 'status is required' });
        }
        const result = await TaskService.bulkUpdateStatus(ids, status, (req as any).user);
        res.json(result);
    } catch (err) { next(err); }
};
