import { Request, Response, NextFunction } from 'express';
import { CompanyCoreValuesService } from '@workspace/company';

export const addCoreValue = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id;
        const { title, description, iconUrl } = req.body;
        
        const newCoreValue = await CompanyCoreValuesService.addCoreValue(userId, title, description, iconUrl);
        res.status(201).json({ success: true, data: newCoreValue });
    } catch (error: any) {
  next(error);
}
};

export const deleteCoreValue = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id;
        const coreValueId = req.params.id;
        
        await CompanyCoreValuesService.deleteCoreValue(userId, coreValueId);
        res.status(200).json({ success: true, data: {} });
    } catch (error: any) {
  next(error);
}
};
