import { Request, Response, NextFunction } from 'express';
import { HrManagementService } from '@workspace/hr-management';

export const getDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const service = new HrManagementService();
        const data = await service.getDashboard((req as any).user?.companyId);
        res.json(data);
    } catch (err) { next(err); }
};

export const getAttendanceReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const service = new HrManagementService();
        const data = await service.getAttendanceReport((req as any).user?.companyId, req.query.month as string);
        res.json(data);
    } catch (err: any) {
        if (err.message === 'month param required (YYYY-MM)') return res.status(400).json({ error: err.message });
        next(err); 
    }
};

export const getSalaryReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const service = new HrManagementService();
        const data = await service.getSalaryReport((req as any).user?.companyId, req.query.month as string);
        res.json(data);
    } catch (err: any) {
        if (err.message === 'month param required (YYYY-MM)') return res.status(400).json({ error: err.message });
        next(err); 
    }
};

export const getWeeklyTrends = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const service = new HrManagementService();
        const data = await service.getWeeklyTrends((req as any).user?.companyId, req.query.range as string, req.query.grouping as string);
        res.json(data);
    } catch (err) { next(err); }
};

export const getCEOInsights = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const service = new HrManagementService();
        const data = await service.getCEOInsights((req as any).user?.companyId);
        res.json(data);
    } catch (err) { next(err); }
};

export const getAttendanceTrend = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const service = new HrManagementService();
        const data = await service.getAttendanceTrend((req as any).user?.companyId, req.query.range as string, req.query.grouping as string);
        res.json(data);
    } catch (err) { next(err); }
};
