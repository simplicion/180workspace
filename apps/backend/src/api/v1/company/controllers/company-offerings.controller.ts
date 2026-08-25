import { Request, Response, NextFunction } from 'express';
import { CompanyOfferingsService } from '@workspace/company';

export const createOffering = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const { name, description, startingPrice, imageUrl, detailedDescription, link } = req.body;
        const newOffering = await CompanyOfferingsService.createOffering(name, description, startingPrice, imageUrl, detailedDescription, link);
        res.status(201).json({ success: true, data: newOffering });
    } catch (error: any) {
  next(error);
}
};

export const updateOffering = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        const { id } = req.params;

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const { name, description, startingPrice, imageUrl, detailedDescription, link } = req.body;
        const updatedOffering = await CompanyOfferingsService.updateOffering(id, name, description, startingPrice, imageUrl, detailedDescription, link);
        res.json({ success: true, data: updatedOffering });
    } catch (error: any) {
  next(error);
}
};

export const deleteOffering = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        const { id } = req.params;

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        await CompanyOfferingsService.deleteOffering(id);
        res.json({ success: true, message: 'Offering deleted successfully' });
    } catch (error: any) {
  next(error);
}
};

export const getPublicOfferingDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id, offeringId } = req.params;
        const offering = await CompanyOfferingsService.getPublicOfferingDetails(id, offeringId);
        res.json({ success: true, data: offering });
    } catch (error: any) {
  next(error);
}
};

export const createOfferingRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id, offeringId } = req.params;
        const { requirements, requesterEmail, requesterName } = req.body;
        const newRequest = await CompanyOfferingsService.createOfferingRequest(id, offeringId, requirements, requesterEmail, requesterName);
        res.status(201).json({ success: true, data: newRequest });
    } catch (error: any) {
  next(error);
}
};

export const getOfferingRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const requests = await CompanyOfferingsService.getOfferingRequests();
        res.json({ success: true, data: requests });
    } catch (error: any) {
  next(error);
}
};
