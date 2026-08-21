import { Request, Response, NextFunction } from 'express';
import { MilestoneService } from '@workspace/projects-and-tasks-domain';
import { InvoiceService } from '@workspace/finance';

export const getMilestones = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await MilestoneService.getMilestones(req.params.projectId, (req as any).user);
        res.json(result);
    } catch (error: any) { 
        if (error.message === 'Project not found') return res.status(404).json({ error: error.message });
        if (error.message === 'Not authorized for this project') return res.status(403).json({ error: error.message });
        next(error); 
    }
};

export const createMilestone = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await MilestoneService.createMilestone(req.params.projectId, req.body, (req as any).user);
        res.status(201).json(result);
    } catch (error: any) { 
        if (error.message === 'Project not found') return res.status(404).json({ error: error.message });
        if (error.message === 'Not authorized') return res.status(403).json({ error: error.message });
        next(error); 
    }
};

export const toggleMilestone = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await MilestoneService.toggleMilestone(
            req.params.id, 
            (req as any).user, 
            async (m: any, p: any) => InvoiceService.generateFromMilestone(m, p, (req as any).user)
        );
        res.json(result);
    } catch (error: any) { 
        if (error.message === 'Milestone not found') return res.status(404).json({ error: error.message });
        if (error.message === 'Not authorized') return res.status(403).json({ error: error.message });
        next(error); 
    }
};

export const deleteMilestone = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await MilestoneService.deleteMilestone(req.params.id, (req as any).user);
        res.json(result);
    } catch (error: any) { 
        if (error.message === 'Milestone not found') return res.status(404).json({ error: error.message });
        if (error.message.includes('Only managers or admins')) return res.status(403).json({ error: error.message });
        next(error); 
    }
};

export const updateMilestone = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await MilestoneService.updateMilestone(req.params.id, req.body, (req as any).user);
        res.json(result);
    } catch (error: any) { 
        if (error.message === 'Milestone not found') return res.status(404).json({ error: error.message });
        if (error.message === 'Not authorized') return res.status(403).json({ error: error.message });
        next(error); 
    }
};
