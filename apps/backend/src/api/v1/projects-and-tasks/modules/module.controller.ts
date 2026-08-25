import { Request, Response, NextFunction } from 'express';
import { ModuleService } from '@workspace/projects-and-tasks-domain';

export const getModulesByProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ModuleService.getModulesByProject(req.params.projectId, (req as any).user);
        res.json(result);
    } catch (err) { next(err); }
};

export const createModule = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ModuleService.createModule(req.body, (req as any).user);
        res.status(201).json(result);
    } catch (err: any) {
        if (err.message === 'Project not found') return res.status(404).json({ error: err.message });
        if (err.message.includes('Only project owners')) return res.status(403).json({ error: err.message });
        next(err);
    }
};

export const updateModule = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ModuleService.updateModule(req.params.id, req.body, (req as any).user);
        res.json(result);
    } catch (err: any) {
        if (err.message === 'Module not found') return res.status(404).json({ error: err.message });
        if (err.message.includes('Not authorized')) return res.status(403).json({ error: err.message });
        next(err);
    }
};

export const deleteModule = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ModuleService.deleteModule(req.params.id, (req.query as any).mode, (req as any).user);
        res.json(result);
    } catch (err: any) {
        if (err.message === 'Module not found') return res.status(404).json({ error: err.message });
        if (err.message.includes('Only project owners')) return res.status(403).json({ error: err.message });
        next(err);
    }
};
