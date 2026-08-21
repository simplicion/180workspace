import { Request, Response, NextFunction } from 'express';
import { LifecycleService, PlatformCompanyService } from '@workspace/platform-admin';

export const list = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page = '1', limit = '20', search = '', status } = req.query;
        const pageNum = Number(page);
        const limitNum = Number(limit);

        const result = await PlatformCompanyService.list(pageNum, limitNum, search as string, status as string);
        res.json(result);
    } catch (err: any) {
  next(err);
}
};

export const getOne = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await PlatformCompanyService.getOne(req.params.id);
        res.json(result);
    } catch (err: any) {
  next(err);
}
};

export const suspend = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { reason } = req.body;
        const company = await PlatformCompanyService.suspend(req.params.id, reason);
        res.json({ message: 'Company suspended', company });
    } catch (err: any) {
  next(err);
}
};

export const unsuspend = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const company = await PlatformCompanyService.unsuspend(req.params.id);
        res.json({ message: 'Company unsuspended', company });
    } catch (err: any) {
  next(err);
}
};

export const deleteCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await LifecycleService.performFullDelete(req.params.id);
        res.json({ message: 'Company and all associated data deleted permanently' });
    } catch (err: any) {
  next(err);
}
};

export const bulkDelete = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { companyIds } = req.body;

        const results = { success: [] as string[], failed: [] as any[], total: companyIds.length };
        
        console.log(`[Company Controller] Starting bulk delete for ${companyIds.length} companies...`);

        for (const id of companyIds) {
            try {
                await LifecycleService.performFullDelete(id);
                results.success.push(id);
                console.log(`[Company Controller] Bulk delete success for: ${id}`);
            } catch (err: any) {
                console.error(`[Company Controller] Bulk delete failed for ${id}:`, err.message);
                results.failed.push({ id, error: err.message });
            }
        }

        const successCount = results.success.length;
        const failCount = results.failed.length;

        res.json({ 
            message: `Processed ${companyIds.length} companies: ${successCount} deleted, ${failCount} failed.`,
            results,
            success: successCount > 0
        });
    } catch (err: any) {
  next(err);
}
};

export const resetAdminPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { newPassword } = req.body;
        const adminEmail = await PlatformCompanyService.resetAdminPassword(req.params.id, newPassword);
        res.json({ message: `Admin password reset for ${adminEmail}` });
    } catch (err: any) {
  next(err);
}
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let company = await PlatformCompanyService.create(req.body);
        // Initialize Lifecycle fields (Trial Dates, Status)
        company = await LifecycleService.handleOnboarding(company);
        res.status(201).json({ company });
    } catch (err: any) {
  next(err);
}
};
