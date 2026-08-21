import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from '@workspace/hr-management';

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const employeeService = new EmployeeService();
        const stats = await employeeService.getDashboardStats((req as any).user.id);
        return res.json(stats);
    } catch (error) {
  next(error);
}
};
