import { Request, Response, NextFunction } from 'express';
import { WebsitesService } from '@workspace/advertising';
import { BillingService } from '@workspace/platform-billing';

/** Tenant scope always comes from the authenticated user, never from body/query/headers. */
const companyOf = (req: Request): string => (req as any).user?.companyId;

/** Maps typed service errors (`statusCode` + `code`) to JSON responses; everything else goes to next(). */
const handleError = (err: any, res: Response, next: NextFunction) => {
    if (err && typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 500) {
        return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    if (err?.message === 'Website not found') {
        return res.status(404).json({ error: err.message, code: 'WEBSITE_NOT_FOUND' });
    }
    next(err);
};

export const getWebsites = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await WebsitesService.getWebsites(companyOf(req));
        res.json(result);
    } catch (err) {
        handleError(err, res, next);
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
        const companyId = companyOf(req);
        const userId = (req as any).user.id;

        const limitCheck = await BillingService.enforceWebsiteLimit(companyId);
        if (!limitCheck.allowed) {
            return res.status(403).json({
                error: `Your current plan (${limitCheck.plan}) only allows ${limitCheck.max} websites. Please upgrade to create more.`
            });
        }

        const website = await WebsitesService.createWebsite(companyId, userId, req.body);

        res.status(201).json({ website });
    } catch (err: any) {
        handleError(err, res, next);
    }
};

export const getWebsite = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const website = await WebsitesService.getWebsite(companyOf(req), String(req.params.id));
        res.json({ website });
    } catch (err: any) {
        handleError(err, res, next);
    }
};

export const updateWebsite = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const website = await WebsitesService.updateWebsite(companyOf(req), String(req.params.id), req.body);
        res.json({ website });
    } catch (err: any) {
        handleError(err, res, next);
    }
};

export const deleteWebsite = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await WebsitesService.deleteWebsite(companyOf(req), String(req.params.id));
        res.json({ message: 'Website deleted' });
    } catch (err: any) {
        handleError(err, res, next);
    }
};

export const getWebsitePixels = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const pixels = await WebsitesService.getWebsitePixels(companyOf(req), String(req.params.id));
        res.json({ pixels });
    } catch (err: any) {
        handleError(err, res, next);
    }
};

export const createWebsitePixel = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const pixel = await WebsitesService.createWebsitePixel(companyOf(req), String(req.params.id), req.body);
        res.status(201).json({ pixel });
    } catch (err: any) {
        handleError(err, res, next);
    }
};

export const getWebsiteStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const stats = await WebsitesService.getWebsiteStats(companyOf(req), String(req.params.id));
        res.json(stats);
    } catch (err: any) {
        handleError(err, res, next);
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
