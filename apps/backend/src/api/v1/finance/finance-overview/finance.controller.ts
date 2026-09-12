import { Request, Response, NextFunction } from 'express';
import { FinanceOverviewService } from '@workspace/finance';
import { createNotification } from '@workspace/communications';

export const getPLReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) return res.status(400).json({ error: 'startDate and endDate required' });

        const report = await FinanceOverviewService.getPLReport(startDate as string, endDate as string);
        res.json({ success: true, report });
    } catch (err) { next(err); }
};

export const getCashFlowForecast = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const forecast = await FinanceOverviewService.getCashFlowForecast();
        res.json({ success: true, forecast });
    } catch (err) { next(err); }
};

export const getProjectProfitability = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.params.projectId) return res.status(400).json({ error: 'Project ID required' });
        const profitability = await FinanceOverviewService.getProjectProfitability(req.params.projectId);
        res.json({ success: true, profitability });
    } catch (err) { next(err); }
};

export const getConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const publicConfig = await FinanceOverviewService.getConfig();
        res.json({ success: true, paymentConfig: publicConfig });
    } catch (err) { next(err); }
};

export const updateConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body.companyPaymentConfig) return res.json({ success: true, message: 'No config provided' });
        
        const { activeProvider } = await FinanceOverviewService.updateConfig(req.body.companyPaymentConfig);

        // Optional: Trigger notifications instead of using deprecated AutomationService

        res.json({ success: true, message: 'Finance configuration updated securely' });
    } catch (err) { next(err); }
};

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        const stats = await FinanceOverviewService.getDashboardStats(companyId);
        res.json({ success: true, stats });
    } catch (err) { next(err); }
};

export const generateInvoicePaymentLink = async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, paymentLink: `https://checkout.180workspace.com/pay/${req.params.id}` });
    } catch (err) { next(err); }
};

export const downloadInvoicePDF = async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, downloadUrl: `/api/invoices/${req.params.id}/pdf` });
    } catch (err) { next(err); }
};

export const initiateSalaryPayout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        const result = await FinanceOverviewService.initiateSalaryPayout(req.params.id, companyId);
        res.json(result);
    } catch (err) { next(err); }
};

export const verifyBankAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        const result = await FinanceOverviewService.verifyBankAccount(req.body.userId, companyId);
        res.json(result);
    } catch (err) { next(err); }
};

export const triggerReminders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        const result = await FinanceOverviewService.triggerReminders(companyId);
        res.json(result);
    } catch (err) { next(err); }
};

export const createPayout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        const userId = (req as any).user?.id;
        const result = await FinanceOverviewService.createPayout({
            ...req.body,
            companyId,
            userId
        });
        res.json(result);
    } catch (err) { next(err); }
};

export const getTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        const { page = 1, limit = 10, type, status, search } = req.query;
        const result = await FinanceOverviewService.getUnifiedLedger({
            page: Number(page) || 1,
            limit: Number(limit) || 10,
            type: type as string,
            status: status as string,
            search: search as string,
            companyId
        });
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

export const deleteTransaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { TransactionService } = await import('@workspace/finance');
        const result = await TransactionService.deleteTransaction(id);
        res.json(result);
    } catch (err) { next(err); }
};

export const bulkDeleteTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { ids } = req.body;
        const { TransactionService } = await import('@workspace/finance');
        const result = await (TransactionService as any).deleteTransactions(ids);
        res.json(result);
    } catch (err) { next(err); }
};



