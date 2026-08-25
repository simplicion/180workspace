import { Request, Response, NextFunction } from 'express';
import { redis } from '../../../../system-configs/config/redis';
import { FinanceOverviewService } from '@workspace/finance';
import { PlausibleService } from '@workspace/insights';
import { prisma } from '@workspace/db';

export const getFinancialStats = async (req: Request, res: Response, next: NextFunction) => {
    const companyId = (req as any).user.companyId;
    const { startDate, endDate } = req.query;
    
    const cacheKey = `analytics:financial:${companyId}:${startDate || 'default'}:${endDate || 'default'}`;

    try {
        if (redis) {
            const cachedData = await redis.get(cacheKey);
            if (cachedData) {
                return res.json(JSON.parse(cachedData));
            }
        }

        const end = endDate ? new Date(endDate as string) : new Date();
        const start = startDate ? new Date(startDate as string) : new Date(new Date().setDate(end.getDate() - 30));

        const report = await FinanceOverviewService.getPLReport(start.toISOString(), end.toISOString());
        const forecast = await FinanceOverviewService.getCashFlowForecast();

        const responseData = {
            success: true,
            summary: {
                totalRevenue: report.revenue,
                totalExpenses: report.expenses.total,
                netProfit: report.netProfit,
                margin: report.margin
            },
            forecast,
            period: report.period,
            cachedAt: new Date()
        };

        if (redis) {
            await redis.set(cacheKey, JSON.stringify(responseData), 'EX', 600);
        }

        res.json(responseData);
    } catch (err) { next(err); }
};

export const getPLReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }
        const report = await FinanceOverviewService.getPLReport(startDate as string, endDate as string);
        res.json({ success: true, report });
    } catch (err) { next(err); }
};

export const getProjectFinancials = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const report = await FinanceOverviewService.getProjectProfitability(req.params.projectId);
        res.json({ success: true, report });
    } catch (err) { next(err); }
};

export const getAllProjectsProfitability = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const reports = await FinanceOverviewService.getAllProjectsProfitability();
        res.json({ success: true, reports });
    } catch (err) { next(err); }
};

export const getPlausibleStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { period, metrics, date } = req.query;
        const stats = await PlausibleService.getStats(period as string, metrics as string, date as string);
        res.json(stats);
    } catch (error: any) {
  const detailedError = error.response?.data?.error || error.message;
  next(error);
}
};

export const testPlausibleConnection = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let { plausibleApiKey, plausibleSiteId } = req.body;
        await PlausibleService.testConnection(plausibleApiKey, plausibleSiteId);
        res.json({ message: 'Plausible connection verified successfully!' });
    } catch (error: any) {
  next(error);
}
};

export const getTeamActivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const activities = await prisma.activityLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        res.json({ success: true, activities });
    } catch (err) { next(err); }
};
