import { Request, Response, NextFunction } from 'express';
import { CompanyMediaService } from '@workspace/company';

export const addMedia = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const { imageUrl } = req.body;
        const media = await CompanyMediaService.addMedia(imageUrl);
        res.status(201).json({ success: true, data: media });
    } catch (error: any) {
  next(error);
}
};

export const deleteMedia = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        const mediaId = req.params.id;

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        await CompanyMediaService.deleteMedia(mediaId);
        res.json({ success: true, message: 'Media deleted successfully.' });
    } catch (error: any) {
  next(error);
}
};
