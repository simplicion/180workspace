import { Request, Response, NextFunction } from 'express';
import { TransactionService } from '@workspace/finance';

export const getTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!(req as any).user || !(req as any).user.companyId) {
            return res.status(403).json({ success: false, message: 'Unauthorized access.' });
        }

        const transactions = await TransactionService.getTransactions();

        res.status(200).json({ success: true, count: transactions.length, data: transactions });
    } catch (error) {
        next(error);
    }
};

export const getLedgerKPIs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!(req as any).user || !(req as any).user.companyId) {
            return res.status(403).json({ success: false, message: 'Unauthorized access.' });
        }

        const kpis = await TransactionService.getLedgerKPIs();

        res.status(200).json({ success: true, data: kpis });
    } catch (error) {
        next(error);
    }
};

export const addTransaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!(req as any).user || !(req as any).user.companyId) {
            return res.status(403).json({ success: false, message: 'Unauthorized access.' });
        }

        const transaction = await TransactionService.addTransaction({
            ...req.body,
            companyId: (req as any).user.companyId,
            userId: (req as any).user.id
        });

        res.status(201).json({ success: true, data: transaction });
    } catch (error) {
        next(error);
    }
};

export const deleteTransaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!(req as any).user || !(req as any).user.companyId) {
            return res.status(403).json({ success: false, message: 'Unauthorized access.' });
        }

        const { id } = req.params;
        const result = await TransactionService.deleteTransaction(id);

        res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        next(error);
    }
};

export const bulkDeleteTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!(req as any).user || !(req as any).user.companyId) {
            return res.status(403).json({ success: false, message: 'Unauthorized access.' });
        }

        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid or empty transaction IDs array.' });
        }

        const result = await (TransactionService as any).deleteTransactions(ids);
        res.status(200).json({ success: true, message: result.message, count: result.count });
    } catch (error) {
        next(error);
    }
};

