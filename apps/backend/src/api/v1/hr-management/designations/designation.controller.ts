import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from '@workspace/hr-management';

export const getDesignations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const employeeService = new EmployeeService();
        const designations = await employeeService.getDesignations((req as any).user.companyId, req.query.search);
        res.json({
            success: true,
            data: designations
        });
    } catch (error: any) {
  next(error);
}
};

export const createDesignation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const employeeService = new EmployeeService();
        const designation = await employeeService.createDesignation((req as any).user.companyId, req.body.name, req.body.category);
        res.status(201).json({
            success: true,
            data: designation
        });
    } catch (error: any) {
  next(error);
}
};
