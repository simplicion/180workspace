import { Request, Response, NextFunction } from 'express';
import { LeaveService } from '@workspace/hr-management';
import { createNotification } from '@workspace/communications'; // Adjust path if needed

export const applyForLeave = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { startDate, endDate } = req.body;
        if (!startDate || !endDate) return res.status(400).json({ error: 'Start and end date required' });
        
        const leave = await LeaveService.applyForLeave((req as any).user.id, req.body);
        res.status(201).json({ leave });
    } catch (err) { next(err); }
};

export const getLeaves = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { employeeId, status, month } = req.query;
        const companyId = (req as any).companyId || (req as any).user?.companyId || (req.query?.companyId as string);
        const leaves = await LeaveService.getLeaves(employeeId as string, status as string, month as string, (req as any).user.role, (req as any).user.id, companyId);
        res.json({ leaves });
    } catch (err) { next(err); }
};

export const reviewLeave = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { status, reviewNote } = req.body;
        
        let leave: any;
        try {
            leave = await LeaveService.reviewLeave(req.params.id, (req as any).user.id, status, reviewNote);
        } catch (e: any) {
            if (e.message === 'Invalid status') return res.status(400).json({ error: e.message });
            return res.status(404).json({ error: 'Leave not found' });
        }

        // Notify employee about the decision
        try {
            // Notification service might need to be adjusted
        } catch (e) { /* swallow notification errors */ }

        res.json({ leave });
    } catch (err) { next(err); }
};

export const deletePendingLeave = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await LeaveService.deletePendingLeave(req.params.id, (req as any).user.id, (req as any).user.role);
        res.json({ message: 'Leave request deleted' });
    } catch (err: any) { 
        if (err.message === 'Not found') return res.status(404).json({ error: err.message });
        if (err.message === 'Can only delete pending requests') return res.status(400).json({ error: err.message });
        if (err.message === 'Not authorized') return res.status(403).json({ error: err.message });
        next(err); 
    }
};
