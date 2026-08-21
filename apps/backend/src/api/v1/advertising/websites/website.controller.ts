import { Request, Response, NextFunction } from 'express';
import { WebsitesService } from '@workspace/advertising';


export const getWebsites = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user.companyId;
        const result = await WebsitesService.getWebsites(companyId);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const createWebsite = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user.companyId;
        const userId = (req as any).user.id;
        
        const website = await WebsitesService.createWebsite(userId, companyId, req.body);

        res.status(201).json({ website });
    } catch (err: any) {
        if (err.message === 'A website with this slug already exists.' || err.message === 'This company subdomain is already taken. Please try another one.') {
            return res.status(400).json({ error: err.message });
        }
        next(err);
    }
};

export const getWebsite = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user.companyId;
        const website = await WebsitesService.getWebsite(companyId, req.params.id);

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
        const companyId = (req as any).user.companyId;
        const website = await WebsitesService.updateWebsite(companyId, req.params.id, req.body);

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
        const companyId = (req as any).user.companyId;
        const website = await WebsitesService.getWebsite(companyId, req.params.id);
        
        await WebsitesService.deleteWebsite(companyId, req.params.id);

        res.json({ message: 'Website deleted' });
    } catch (err: any) {
        if (err.message === 'Website not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

export const getWebsiteLeads = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user.companyId;
        const leads = await WebsitesService.getWebsiteLeads(companyId, req.params.id);
        res.json({ leads });
    } catch (err: any) {
        if (err.message === 'Website not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

export const getWebsitePixels = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user.companyId;
        const pixels = await WebsitesService.getWebsitePixels(companyId, req.params.id);
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
        const companyId = (req as any).user.companyId;
        const pixel = await WebsitesService.createWebsitePixel(companyId, req.params.id, req.body);
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
        const companyId = (req as any).user.companyId;
        const stats = await WebsitesService.getWebsiteStats(companyId, req.params.id);
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
        const { domain, slug } = req.query;
        const result = await WebsitesService.publicGetWebsite(domain as string, slug as string);
        res.json(result);
    } catch (err: any) {
        if (err.message === 'Domain is required') {
            return res.status(400).json({ error: err.message });
        }
        if (err.message === 'Company not found for this domain' || err.message === 'Website not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

const rateLimitCache = new Map();

export const publicSubmitLead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ip = req.ip || req.socket?.remoteAddress || 'unknown';
        const now = Date.now();
        const limitInfo = rateLimitCache.get(ip) || { count: 0, firstRequest: now };

        if (now - limitInfo.firstRequest > 60000) {
            limitInfo.count = 0;
            limitInfo.firstRequest = now;
        }

        if (limitInfo.count >= 10) {
            return res.status(429).json({ error: 'Too many submissions. Please try again later.' });
        }

        limitInfo.count++;
        rateLimitCache.set(ip, limitInfo);

        const { domain, slug } = req.query;
        const userAgent = req.headers['user-agent'] || 'unknown';
        
        const { lead, website } = await WebsitesService.publicSubmitLead(domain as string, slug as string, req.body, ip, userAgent);

        res.status(201).json({ success: true, leadId: lead.id });
    } catch (err: any) {
        if (err.message === 'Domain is required') {
            return res.status(400).json({ error: err.message });
        }
        if (err.message === 'Company not found for this domain' || err.message === 'Website not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

export const setPrimaryWebsite = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const websiteId = req.params.id;
        const companyId = (req as any).user.companyId;

        const updated = await WebsitesService.setPrimaryWebsite(companyId, websiteId);

        res.json({ message: 'Primary website updated successfully', website: updated });
    } catch (error: any) {
        if (error.message === 'Website not found or unauthorized') {
            return res.status(404).json({ error: error.message });
        }
        next(error);
    }
};
