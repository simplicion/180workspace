import { Request, Response, NextFunction } from 'express';
import { HolidayService } from '@workspace/hr-management';

export const getHolidays = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { year } = req.query;
        const companyId = (req as any).user.companyId;
        if (!companyId) return res.status(403).json({ error: 'Company ID is required' });
        
        const holidays = await HolidayService.getHolidays(companyId, year as string);
        res.json({ holidays });
    } catch (err) { next(err); }
};

export const createHoliday = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, date } = req.body;
        if (!name || !date) return res.status(400).json({ error: 'Name and date are required' });
        if (!(req as any).user.companyId) return res.status(403).json({ error: 'Company ID is required to create a holiday' });
        
        const holiday = await HolidayService.createHoliday((req as any).user.companyId, req.body);
        res.status(201).json({ holiday });
    } catch (err) { 
        console.error('Error creating holiday:', err);
        next(err); 
    }
};

export const updateHoliday = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const holiday = await HolidayService.updateHoliday(req.params.id, (req as any).user.companyId, req.body);
        res.json({ holiday });
    } catch (err: any) {
        if (err.message === 'Holiday not found') return res.status(404).json({ error: err.message });
        console.error('Error updating holiday:', err);
        next(err); 
    }
};

export const deleteHoliday = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await HolidayService.deleteHoliday(req.params.id, (req as any).user.companyId);
        res.json({ message: 'Holiday deleted' });
    } catch (err: any) {
        if (err.message === 'Holiday not found') return res.status(404).json({ error: err.message });
        next(err); 
    }
};
