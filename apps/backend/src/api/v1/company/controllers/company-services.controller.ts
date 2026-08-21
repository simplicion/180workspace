import { Request, Response, NextFunction } from 'express';
import { CompanyServicesService } from '@workspace/company';

export const createService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const { name, description, startingPrice, imageUrl, detailedDescription } = req.body;
        const newService = await CompanyServicesService.createService(companyId, name, description, startingPrice, imageUrl, detailedDescription);
        res.status(201).json({ success: true, data: newService });
    } catch (error: any) {
  next(error);
}
};

export const updateService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        const { id } = req.params;

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const { name, description, startingPrice, imageUrl, detailedDescription } = req.body;
        const updatedService = await CompanyServicesService.updateService(companyId, id, name, description, startingPrice, imageUrl, detailedDescription);
        res.json({ success: true, data: updatedService });
    } catch (error: any) {
  next(error);
}
};

export const deleteService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        const { id } = req.params;

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        await CompanyServicesService.deleteService(companyId, id);
        res.json({ success: true, message: 'Service deleted successfully' });
    } catch (error: any) {
  next(error);
}
};

export const getPublicServiceDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id, serviceId } = req.params;
        const service = await CompanyServicesService.getPublicServiceDetails(id, serviceId);
        res.json({ success: true, data: service });
    } catch (error: any) {
  next(error);
}
};

export const createServiceRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id, serviceId } = req.params;
        const { requirements, requesterEmail, requesterName } = req.body;
        const newRequest = await CompanyServicesService.createServiceRequest(id, serviceId, requirements, requesterEmail, requesterName);
        res.status(201).json({ success: true, data: newRequest });
    } catch (error: any) {
  next(error);
}
};

export const getServiceRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const requests = await CompanyServicesService.getServiceRequests(companyId);
        res.json({ success: true, data: requests });
    } catch (error: any) {
  next(error);
}
};
