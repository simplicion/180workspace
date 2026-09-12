import { Request, Response, NextFunction } from 'express';
import { SalaryService } from '@workspace/finance';
import { EmailService } from '@workspace/communications';
// AutomationService is deprecated; consider migrating to new notification systems if needed.

export const reviewSalary = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const salary = await SalaryService.reviewSalary(req.params.id, req.body);
        res.json({ success: true, salary });
    } catch (err) { next(err); }
};

export const hrApproveSalary = reviewSalary;

export const getSalaries = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        const { month } = req.query;
        const salaries = await SalaryService.getSalaries({
            month: month as string,
            companyId
        });
        res.json({ success: true, salaries });
    } catch (err) { next(err); }
};

export const getMySalaries = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const salaries = await SalaryService.getMySalaries((req as any).user.id);
        res.json({ success: true, salaries });
    } catch (err) { next(err); }
};

export const getSalaryPreview = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { employeeId, month } = req.query;
        if (!employeeId || !month) {
            return res.status(400).json({ error: 'employeeId and month are required' });
        }
        // Since we are migrating backend gateway, require domain services here directly.
        const { PayrollService } = require('@workspace/hr-management');
        const payrollService = new PayrollService();
        const preview = await payrollService.calculateMonthlySalary(employeeId, month);
        res.json({ success: true, preview });
    } catch (err: any) {
  next(err);
}
};

export const generateSalary = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const salary = await SalaryService.generateSalary((req as any).user.id, req.body);
        
        // AutomationService removed
        res.status(201).json({ success: true, salary });
    } catch (err) { next(err); }
};

export const approveSalary = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const salary = await SalaryService.approveSalary(req.params.id);
        res.json({ success: true, salary });
    } catch (err) { next(err); }
};

export const markPaid = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const salary = await SalaryService.markPaid(req.params.id);

        try {
            await EmailService.notify(salary.employee, 'salary_generated', {
                employeeName: salary.employee.name,
                month: salary.month,
                netSalary: salary.netSalary,
                dashboardUrl: process.env.CLIENT_URL || 'http://localhost:3000'
            });
        } catch (emailErr: any) {
            console.error('[Salary] Failed to send payslip email:', emailErr.message);
        }

        res.json({ success: true, salary });
    } catch (err) { next(err); }
};

export const initiateSalaryPayout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const PayoutService = require('../../../../packages/finance-domain/src/services/PayoutService.js');
        const result = await PayoutService.initiateSalaryPayout(req.params.id);
        res.json(result);
    } catch (err: any) {
  next(err);
}
};
