import { Request, Response, NextFunction } from 'express';
import { CompanyProfileService } from '@workspace/company';

export const getPrivateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const data = await CompanyProfileService.getPrivateProfile();
        res.json({ success: true, data });
    } catch (error: any) {
  next(error);
}
};

export const updatePrivateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const updatedCompany = await CompanyProfileService.updatePrivateProfile(req.body);
        res.json({ success: true, data: updatedCompany, message: 'Profile updated successfully.' });
    } catch (error: any) {
  next(error);
}
};

export const getPublicProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const includeJobs = req.query.includeJobs === 'true';

        // getCompanyPrisma was passed in the old JS code but since we refactored it
        // to use repository, we might need to remove that parameter or let it be undefined.
        // The service now handles everything via repository.
        const data = await CompanyProfileService.getPublicProfile(id, includeJobs);
        res.json({ success: true, data });
    } catch (error: any) {
  next(error);
}
};

export const incrementProfileViews = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await CompanyProfileService.incrementProfileViews(req.params.id);
        res.json({ success: true, message: 'Profile views incremented' });
    } catch (error: any) {
  next(error);
}
};

export const incrementFollowers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?._id || (req as any).user?.id;
        const result = await CompanyProfileService.followCompany(userId, req.params.id);
        
        if (result.alreadyFollowing) {
            return res.json({ success: true, message: 'Already following' });
        }
        res.json({ success: true, message: 'Successfully followed company' });
    } catch (error: any) {
  next(error);
}
};

export const unfollowCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?._id || (req as any).user?.id;
        const result = await CompanyProfileService.unfollowCompany(userId, req.params.id);
        
        if (result.notFollowing) {
            return res.json({ success: true, message: 'Not following' });
        }
        res.json({ success: true, message: 'Successfully unfollowed company' });
    } catch (error: any) {
  next(error);
}
};

export const getFollowStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?._id || (req as any).user?.id;
        const isFollowing = await CompanyProfileService.getFollowStatus(userId, req.params.id);
        res.json({ success: true, isFollowing });
    } catch (error: any) {
  next(error);
}
};

export const updateFinanceTab = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const { companyHighlights, pitchDeckUrl } = req.body;
        const updatedCompany = await CompanyProfileService.updateFinanceTab(companyHighlights, pitchDeckUrl);
        res.json({ success: true, data: updatedCompany, message: 'Finance tab updated successfully.' });
    } catch (error: any) {
  next(error);
}
};

export const getReviews = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await CompanyProfileService.getReviews(req.params.id);
        res.json({ success: true, data });
    } catch (error: any) {
        next(error);
    }
};

export const addReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authUser = (req as any).user;
        const { rating, title, description, reviewerName, reviewerEmail } = req.body;

        if (!rating || Number(rating) < 1 || Number(rating) > 5) {
            return res.status(400).json({ success: false, message: 'Please provide a valid rating between 1 and 5 stars.' });
        }
        if (!title || !title.trim()) {
            return res.status(400).json({ success: false, message: 'Review title is required.' });
        }
        if (!description || !description.trim()) {
            return res.status(400).json({ success: false, message: 'Review description is required.' });
        }

        const data = await CompanyProfileService.addReview({
            idOrSlug: req.params.id,
            user: authUser ? {
                id: authUser._id || authUser.id,
                companyId: authUser.companyId,
                name: authUser.name,
                email: authUser.email
            } : null,
            reviewerName,
            reviewerEmail,
            rating: Number(rating),
            title: title.trim(),
            description: description.trim()
        });

        res.status(201).json({ success: true, data, message: 'Review submitted successfully.' });
    } catch (error: any) {
        if (error.message?.includes('cannot submit reviews for their own company') || error.message?.includes('cannot review their own company')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

export const getCompanyMilestones = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }
        
        // Placeholder for milestones logic (from existing controller)
        res.json({ success: true, data: [] });
    } catch (error: any) {
  next(error);
}
};

export const verifyDomain = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { domain } = req.body;
        const companyId = (req as any).user?.companyId;

        const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_MAIN_DOMAIN || '';
        const result = await CompanyProfileService.verifyDomain(domain, rootDomain);
        
        if (!result.success) {
            return res.status(400).json(result);
        }

        res.status(200).json(result);
    } catch (error: any) {
  next(error);
}
};
