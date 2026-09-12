import { Request, Response, NextFunction } from 'express';
import { HrManagementService } from '@workspace/hr-management';
import { prisma } from '@workspace/db';

export const getDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const service = new HrManagementService();
        const data = await service.getDashboard();
        res.json(data);
    } catch (err) { next(err); }
};

export const getAttendanceReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const service = new HrManagementService();
        const data = await service.getAttendanceReport(req.query.month as string);
        res.json(data);
    } catch (err: any) {
        if (err.message === 'month param required (YYYY-MM)') return res.status(400).json({ error: err.message });
        next(err); 
    }
};

export const getSalaryReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const service = new HrManagementService();
        const data = await service.getSalaryReport(req.query.month as string);
        res.json(data);
    } catch (err: any) {
        if (err.message === 'month param required (YYYY-MM)') return res.status(400).json({ error: err.message });
        next(err); 
    }
};

export const getWeeklyTrends = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const service = new HrManagementService();
        const data = await service.getWeeklyTrends(req.query.range as string, req.query.grouping as string);
        res.json(data);
    } catch (err) { next(err); }
};

export const getCEOInsights = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const service = new HrManagementService();
        const data = await service.getCEOInsights();
        res.json(data);
    } catch (err) { next(err); }
};

export const getAttendanceTrend = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const service = new HrManagementService();
        const data = await service.getAttendanceTrend(req.query.range as string, req.query.grouping as string);
        res.json(data);
    } catch (err) { next(err); }
};

export const getGoals = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
        const ownerId = (req as any).user?.id;
        const companyId = (req as any).companyId || (req as any).user?.companyId;
        const role = (req as any).user?.role;
        if (!ownerId) return res.status(401).json({ error: 'Unauthorized' });

        const where: any = {};
        if (['admin', 'manager', 'hr', 'super_admin'].includes(role)) {
            if (companyId) where.companyId = companyId;
        } else {
            where.ownerId = ownerId;
        }

        const goals = await prisma.goal.findMany({
            where,
            include: {
                owner: { select: { id: true, name: true, email: true } }
            },
            take: limit,
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, goals });
    } catch (err) { next(err); }
};
