import { Request, Response, NextFunction } from 'express';
import { sendEmail } from '@workspace/communications';

// SERVICES CRUD
export const addService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        if (!companyId) return res.status(400).json({ success: false, message: 'User does not belong to a company.' });

        const { name, description, startingPrice, icon, link } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Offering name is required.' });

        const offering = await (req as any).prisma.companyOffering.create({
            data: {
                companyId,
                name,
                description,
                startingPrice,
                icon,
                link
            }
        });

        res.json({ success: true, data: offering });
    } catch (error: any) {
  next(error);
}
};

export const updateService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        const offeringId = req.params.id;

        const { name, description, startingPrice, icon, link } = req.body;

        const offering = await (req as any).prisma.companyOffering.update({
            where: { id: offeringId, companyId },
            data: { name, description, startingPrice, icon, link }
        });

        res.json({ success: true, data: offering });
    } catch (error) {
  next(error);
}
};

export const deleteService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        const offeringId = req.params.id;

        await (req as any).prisma.companyOffering.delete({
            where: { id: offeringId, companyId }
        });

        res.json({ success: true, message: 'Offering deleted.' });
    } catch (error) {
  next(error);
}
};

export const getServices = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.params.companyId || (req as any).user?.companyId;

        const offerings = await (req as any).prisma.companyOffering.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: offerings });
    } catch (error) {
  next(error);
}
};

// LEAD GENERATION (REQUEST SERVICE)
export const submitServiceRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { offeringId, companyId, requesterName, requesterEmail, requesterCompanyName, companySize, requirements, budgetRange, timeline } = req.body;

        if (!offeringId || !companyId || !requesterName || !requesterEmail || !requirements) {
            return res.status(400).json({ success: false, message: 'Missing required fields.' });
        }

        const request = await (req as any).prisma.serviceRequest.create({
            data: {
                offeringId,
                companyId,
                requesterName,
                requesterEmail,
                requesterCompanyName,
                companySize,
                requirements,
                budgetRange,
                timeline
            }
        });

        // Try to fetch company admin email to send notification
        const company = await (req as any).prisma.company.findUnique({
            where: { id: companyId },
            select: { adminEmail: true, name: true }
        });

        const offering = await (req as any).prisma.companyOffering.findUnique({
            where: { id: offeringId }
        });

        if (company && company.adminEmail) {
            try {
                await sendEmail(company.adminEmail, 'New Offering Request - 180workspace', `
                    <h3>New Offering Request Received!</h3>
                    <p>You have a new request for the offering: <strong>${offering ? offering.name : 'Unknown'}</strong>.</p>
                    <p><strong>From:</strong> ${requesterName} (${requesterEmail})</p>
                    <p><strong>Company:</strong> ${requesterCompanyName || 'N/A'}</p>
                    <p><strong>Requirements:</strong> ${requirements}</p>
                    <p><strong>Budget:</strong> ${budgetRange || 'N/A'} | <strong>Timeline:</strong> ${timeline || 'N/A'}</p>
                    <br/>
                    <p>Log in to your 180workspace Dashboard to manage this request.</p>
                `);
            } catch (emailError) {
                console.error("Failed to send lead email notification", emailError);
                // We don't fail the request if the email fails
            }
        }

        res.json({ success: true, data: request, message: 'Request submitted successfully.' });
    } catch (error: any) {
  next(error);
}
};

export const getServiceRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;

        const requests = await (req as any).prisma.serviceRequest.findMany({
            where: { companyId },
            include: {
                offering: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: requests });
    } catch (error) {
  next(error);
}
};

export const updateServiceRequestStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        const requestId = req.params.id;
        const { status } = req.body;

        const request = await (req as any).prisma.serviceRequest.update({
            where: { id: requestId, companyId },
            data: { status }
        });

        res.json({ success: true, data: request });
    } catch (error) {
  next(error);
}
};
