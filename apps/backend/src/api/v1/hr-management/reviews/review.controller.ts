import { Request, Response, NextFunction } from 'express';
import { PerformanceService, ReviewService } from '@workspace/hr-management';

const performanceService = new PerformanceService();

export const getReviews = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const reviews = await ReviewService.getReviews((req as any).user, req.query);
        res.json({ reviews });
    } catch (error) { next(error); }
};

export const getReviewById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const review = await ReviewService.getReviewById(req.params.id, (req as any).user);
        res.json({ review });
    } catch (error) { next(error); }
};

export const getPerformanceInsights = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { employeeId, period } = req.query;
        if (!employeeId || !period) {
            return res.status(400).json({ error: 'employeeId and period are required' });
        }

        const insights = await performanceService.getPerformanceInsights(employeeId as string, period as string);
        res.json({ insights });
    } catch (error) { next(error); }
};

export const createReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!['admin', 'hr', 'manager'].includes((req as any).user.role)) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        const review = await ReviewService.createReview(req.body, (req as any).user.id);
        res.status(201).json({ review });
    } catch (error: any) { 
        if (error.message.includes('already exists')) return res.status(400).json({ error: error.message });
        next(error); 
    }
};

export const submitSelfEvaluation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const review = await ReviewService.submitSelfEvaluation(req.params.id, (req as any).user.id, req.body);
        res.json({ review });
    } catch (error: any) { 
        if (error.message === 'Review not found') return res.status(404).json({ error: error.message });
        if (error.message === 'Not authorized') return res.status(403).json({ error: error.message });
        next(error); 
    }
};

export const submitManagerEvaluation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const review = await ReviewService.submitManagerEvaluation(req.params.id, (req as any).user, req.body);
        res.json({ review });
    } catch (error: any) { 
        if (error.message === 'Review not found') return res.status(404).json({ error: error.message });
        if (error.message === 'Not authorized') return res.status(403).json({ error: error.message });
        next(error); 
    }
};

export const deleteReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await ReviewService.deleteReview(req.params.id);
        res.json({ success: true });
    } catch (error: any) { 
        if (error.message === 'Review not found') return res.status(404).json({ error: error.message });
        next(error); 
    }
};
