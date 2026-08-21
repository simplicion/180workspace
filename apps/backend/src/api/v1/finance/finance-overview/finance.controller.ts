import { Request, Response, NextFunction } from 'express';
import { FinanceOverviewService } from '@workspace/finance';
import { createNotification } from '@workspace/communications';

export const getPLReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) return res.status(400).json({ error: 'startDate and endDate required' });

        const report = await FinanceOverviewService.getPLReport((req as any).user.companyId, startDate as string, endDate as string);
        res.json({ success: true, report });
    } catch (err) { next(err); }
};

export const getCashFlowForecast = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const forecast = await FinanceOverviewService.getCashFlowForecast((req as any).user.companyId);
        res.json({ success: true, forecast });
    } catch (err) { next(err); }
};

export const getProjectProfitability = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.params.projectId) return res.status(400).json({ error: 'Project ID required' });
        const profitability = await FinanceOverviewService.getProjectProfitability((req as any).user.companyId, req.params.projectId);
        res.json({ success: true, profitability });
    } catch (err) { next(err); }
};

export const getConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const publicConfig = await FinanceOverviewService.getConfig((req as any).user.companyId);
        res.json({ success: true, paymentConfig: publicConfig });
    } catch (err) { next(err); }
};

export const updateConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body.companyPaymentConfig) return res.json({ success: true, message: 'No config provided' });
        
        const { activeProvider } = await FinanceOverviewService.updateConfig((req as any).user.companyId, req.body.companyPaymentConfig);

        // Optional: Trigger notifications instead of using deprecated AutomationService

        res.json({ success: true, message: 'Finance configuration updated securely' });
    } catch (err) { next(err); }
};

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const stats = await FinanceOverviewService.getDashboardStats((req as any).user.companyId);
        res.json({ success: true, stats });
    } catch (err) { next(err); }
};

export const generateInvoicePaymentLink = async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.status(501).json({ message: 'Legacy payment link generation to be migrated to provider patterns' });
    } catch (err) { next(err); }
};

export const downloadInvoicePDF = async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.status(501).json({ message: 'Legacy PDF generation to be migrated to new shared utility' });
    } catch (err) { next(err); }
};

export const initiateSalaryPayout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.status(501).json({ message: 'Legacy initiate salary payout to be migrated' });
    } catch (err) { next(err); }
};

export const verifyBankAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.status(501).json({ message: 'Legacy verify bank account to be migrated' });
    } catch (err) { next(err); }
};

export const triggerReminders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.status(501).json({ message: 'Legacy reminders trigger to be migrated' });
    } catch (err) { next(err); }
};

export const getTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.status(501).json({ message: 'Moved to transaction routes' });
    } catch (err) { next(err); }
};
