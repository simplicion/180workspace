import { Request, Response, NextFunction } from 'express';
import { WebsitesService } from '@workspace/advertising';
import { BillingService } from '@workspace/platform-billing';


export const getWebsites = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await WebsitesService.getWebsites();
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const checkAvailability = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { slug, companySlug } = req.query;
        
        const result = await WebsitesService.checkAvailability(
            typeof slug === 'string' ? slug : undefined,
            typeof companySlug === 'string' ? companySlug : undefined
        );
        
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const createWebsite = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user.companyId;
        const userId = (req as any).user.id;
        
        const limitCheck = await BillingService.enforceWebsiteLimit(companyId);
        if (!limitCheck.allowed) {
            return res.status(403).json({ 
                error: `Your current plan (${limitCheck.plan}) only allows ${limitCheck.max} websites. Please upgrade to create more.` 
            });
        }

        const website = await WebsitesService.createWebsite(userId, req.body);

        res.status(201).json({ website });
    } catch (err: any) {
        if (err.message === 'A website with this slug already exists.') {
            return res.status(400).json({ error: err.message });
        }
        next(err);
    }
};

export const getWebsite = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const website = await WebsitesService.getWebsite(req.params.id);

        res.json({ website });
    } catch (err: any) {
        if (err.message === 'Website not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

export const updateWebsite = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const website = await WebsitesService.updateWebsite(req.params.id, req.body);

        res.json({ website });
    } catch (err: any) {
        if (err.message === 'Website not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

export const deleteWebsite = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const website = await WebsitesService.getWebsite(req.params.id);
        
        await WebsitesService.deleteWebsite(req.params.id);

        res.json({ message: 'Website deleted' });
    } catch (err: any) {
        if (err.message === 'Website not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};



export const getWebsitePixels = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const pixels = await WebsitesService.getWebsitePixels(req.params.id);
        res.json({ pixels });
    } catch (err: any) {
        if (err.message === 'Website not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

export const createWebsitePixel = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const pixel = await WebsitesService.createWebsitePixel(req.params.id, req.body);
        res.status(201).json({ pixel });
    } catch (err: any) {
        if (err.message === 'Website not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

export const getWebsiteStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const stats = await WebsitesService.getWebsiteStats(req.params.id);
        res.json(stats);
    } catch (err: any) {
        if (err.message === 'Website not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

export const publicGetWebsite = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { domain } = req.query;
        console.log('publicGetWebsite called with:', { domain });
        const result = await WebsitesService.publicGetWebsite(domain as string);
        console.log('publicGetWebsite success:', result.website?.id);
        res.json(result);
    } catch (err: any) {
        console.error('publicGetWebsite error:', err.message);
        if (err.message === 'Domain is required') {
            return res.status(400).json({ error: err.message });
        }
        if (err.message === 'Company not found for this domain' || err.message === 'Website not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};


