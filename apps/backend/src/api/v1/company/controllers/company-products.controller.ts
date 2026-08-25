import { Request, Response, NextFunction } from 'express';
import { CompanyProductsService } from '@workspace/company';

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const { name, description, link, logoUrl } = req.body;
        const product = await CompanyProductsService.createProduct(name, description, link, logoUrl);
        res.status(201).json({ success: true, data: product });
    } catch (error: any) {
  next(error);
}
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        const productId = req.params.id;
        
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const { name, description, link, logoUrl } = req.body;
        const product = await CompanyProductsService.updateProduct(productId, name, description, link, logoUrl);
        res.json({ success: true, data: product });
    } catch (error: any) {
  next(error);
}
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        const productId = req.params.id;

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        await CompanyProductsService.deleteProduct(productId);
        res.json({ success: true, message: 'Product deleted successfully.' });
    } catch (error: any) {
  next(error);
}
};
