import { Request, Response, NextFunction } from 'express';
import { ContentCalendarService } from '@workspace/social-media';

export const listCalendars = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = parseInt(req.query.offset as string) || 0;
        const calendars = await ContentCalendarService.listCalendars(limit, offset);
        res.json({ calendars });
    } catch (err) { next(err); }
};

export const getCalendar = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ContentCalendarService.getCalendar(req.params.id);
        res.json(result);
    } catch (err: any) { 
        if (err.message === 'Calendar not found') {
            return res.status(404).json({ error: 'Calendar not found' });
        }
        next(err); 
    }
};

export const createCalendar = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ContentCalendarService.createCalendar(req.body, (req as any).user);
        res.status(201).json(result);
    } catch (err: any) { 
        if (err.message) {
            return res.status(400).json({ error: err.message });
        }
        next(err); 
    }
};

export const updateCalendar = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const calendar = await ContentCalendarService.updateCalendar(req.params.id, req.body);
        res.json({ calendar });
    } catch (err) { next(err); }
};

export const deleteCalendar = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ContentCalendarService.deleteCalendar(req.params.id);
        res.json(result);
    } catch (err) { next(err); }
};

export const getCalendarPieces = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const pieces = await ContentCalendarService.getCalendarPieces(req.params.id);
        res.json({ pieces });
    } catch (err) { next(err); }
};

export const updateCalendarPiece = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const piece = await ContentCalendarService.updateCalendarPiece(req.params.pieceId, req.body);
        res.json({ piece });
    } catch (err) { next(err); }
};
