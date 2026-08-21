import { Request, Response, NextFunction } from 'express';
import { ExpenseService } from '@workspace/finance';

export const getExpenses = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const expenses = await ExpenseService.getExpenses((req as any).user.companyId, (req as any).user);
        res.status(200).json({ status: 'success', results: expenses.length, data: { expenses } });
    } catch (error: any) {
  next(error);
}
};

export const getExpenseById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const expense = await ExpenseService.getExpenseById((req as any).user.companyId, req.params.id);
        res.status(200).json({ status: 'success', data: { expense } });
    } catch (error: any) {
  next(error);
}
};

export const createExpense = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const expense = await ExpenseService.createExpense((req as any).user.companyId, (req as any).user, req.body);
        res.status(201).json({ status: 'success', data: { expense } });
    } catch (error: any) {
  next(error);
}
};

export const approveClaim = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const updatedExpense = await ExpenseService.approveClaim((req as any).user.companyId, (req as any).user, req.params.id, req.body.reviewNote);
        res.status(200).json({ status: 'success', data: { expense: updatedExpense } });
    } catch (error: any) {
  next(error);
}
};

export const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { status, reviewNote } = req.body;
        const updatedExpense = await ExpenseService.updateStatus((req as any).user.companyId, id, status, reviewNote);
        res.status(200).json({ status: 'success', data: { expense: updatedExpense } });
    } catch (error: any) {
  next(error);
}
};
