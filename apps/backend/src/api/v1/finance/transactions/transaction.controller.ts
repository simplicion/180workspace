import { Request, Response, NextFunction } from 'express';
import { TransactionService } from '@workspace/finance';

export const getTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!(req as any).user || !(req as any).user.companyId) {
            return res.status(403).json({ success: false, message: 'Unauthorized access.' });
        }

        const transactions = await TransactionService.getTransactions((req as any).user.companyId);

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

        const kpis = await TransactionService.getLedgerKPIs((req as any).user.companyId);

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

        const transaction = await TransactionService.addTransaction((req as any).user.companyId, req.body);

        res.status(201).json({ success: true, data: transaction });
    } catch (error) {
        next(error);
    }
};
