import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from '@workspace/hr-management';
import { createNotification } from '@workspace/communications'; // Adjust path if needed

export const getAttendance = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { employeeId, date, month, page = 1, limit = 100 } = req.query;
        const query: any = {};
        if (employeeId) query.employeeId = employeeId;
        if (date) query.date = date;
        if (month) query.date = { startsWith: month };

        const skip = (Number(page) - 1) * Number(limit);
        
        const attendanceService = new AttendanceService();
        const { records, total } = await attendanceService.getAttendance(query, skip, Number(limit));
        
        res.json({ records, total });
    } catch (err) { next(err); }
};

export const getMyAttendance = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { month } = req.query;
        const attendanceService = new AttendanceService();
        const records = await attendanceService.getMyAttendance((req as any).user.id, month as string);
        res.json({ records });
    } catch (err) { next(err); }
};

export const getMonthlyReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { month } = req.query; 
        if (!month) return res.status(400).json({ error: 'month param required (YYYY-MM)' });
        const companyId = (req as any).companyId || (req as any).user?.companyId || (req.query?.companyId as string);

        const attendanceService = new AttendanceService();
        const report = await attendanceService.getMonthlyReport(month as string, companyId);
        
        res.json(report);
    } catch (err) { next(err); }
};

export const markAttendance = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const attendanceService = new AttendanceService();
        const record = await attendanceService.markAttendance(req.body, (req as any).user.id);

        if (record.status === 'late' || record.status === 'absent') {
            // AutomationService trigger removed or needs to be adapted 
            // since platform-communications is deprecated.
        }

        res.status(200).json({ record });
    } catch (err) { next(err); }
};

export const updateAttendance = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const attendanceService = new AttendanceService();
        const record = await attendanceService.updateAttendance(req.params.id, req.body);
        if (!record) return res.status(404).json({ error: 'Record not found' });
        res.json({ record });
    } catch (err) { next(err); }
};

export const autoCheckIn = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const now = new Date();
        const date = req.body.date || now.toISOString().split('T')[0];
        const checkInTime = req.body.time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const attendanceService = new AttendanceService();
        const result = await attendanceService.autoCheckIn((req as any).user.id, date as string, checkInTime as string);

        res.json(result);
    } catch (err) { next(err); }
};

export const autoCheckOut = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const now = new Date();
        const date = req.body.date || now.toISOString().split('T')[0];
        const checkOutTime = req.body.time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const attendanceService = new AttendanceService();
        const result = await attendanceService.autoCheckOut((req as any).user.id, date as string, checkOutTime as string);

        res.json(result);
    } catch (err) { next(err); }
};
