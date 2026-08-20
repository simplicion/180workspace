'use strict';

const { AttendanceService } = require('@workspace/hr-management');

exports.getAttendance = async (req, res, next) => {
    try {
        const { employeeId, date, month, page = 1, limit = 100 } = req.query;
        const query = {};
        if (employeeId) query.employeeId = employeeId;
        if (date) query.date = date;
        if (month) query.date = { startsWith: month };

        const skip = (Number(page) - 1) * Number(limit);
        
        const attendanceService = new AttendanceService();
        const { records, total } = await attendanceService.getAttendance(query, skip, Number(limit));
        
        res.json({ records, total });
    } catch (err) { next(err); }
};

exports.getMyAttendance = async (req, res, next) => {
    try {
        const { month } = req.query;
        const attendanceService = new AttendanceService();
        const records = await attendanceService.getMyAttendance(req.user.id, month);
        res.json({ records });
    } catch (err) { next(err); }
};

exports.getMonthlyReport = async (req, res, next) => {
    try {
        const { month } = req.query; 
        if (!month) return res.status(400).json({ error: 'month param required (YYYY-MM)' });

        const attendanceService = new AttendanceService();
        const report = await attendanceService.getMonthlyReport(month);
        
        res.json(report);
    } catch (err) { next(err); }
};

exports.markAttendance = async (req, res, next) => {
    try {
        const attendanceService = new AttendanceService();
        const record = await attendanceService.markAttendance(req.body, req.user.id);

        if (record.status === 'late' || record.status === 'absent') {
            const AutomationService = require('../../../platform-core/platform-communications/services/automation.service');
            await AutomationService.trigger({
                eventType: `attendance_${record.status}`,
                triggeredBy: req.user.id,
                targetUser: record.employeeId,
                description: `Employee was marked ${record.status} for ${record.date}`,
                metadata: { date: record.date, status: record.status }
            }, req.user.companyId); 
        }

        res.status(200).json({ record });
    } catch (err) { next(err); }
};

exports.updateAttendance = async (req, res, next) => {
    try {
        const attendanceService = new AttendanceService();
        const record = await attendanceService.updateAttendance(req.params.id, req.body);
        if (!record) return res.status(404).json({ error: 'Record not found' });
        res.json({ record });
    } catch (err) { next(err); }
};

exports.autoCheckIn = async (req, res, next) => {
    try {
        const now = new Date();
        const date = req.body.date || now.toISOString().split('T')[0];
        const checkInTime = req.body.time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const attendanceService = new AttendanceService();
        const result = await attendanceService.autoCheckIn(req.user.id, req.user.companyId, date, checkInTime);

        res.json(result);
    } catch (err) { next(err); }
};

exports.autoCheckOut = async (req, res, next) => {
    try {
        const now = new Date();
        const date = req.body.date || now.toISOString().split('T')[0];
        const checkOutTime = req.body.time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const attendanceService = new AttendanceService();
        const result = await attendanceService.autoCheckOut(req.user.id, req.user.companyId, date, checkOutTime);

        res.json(result);
    } catch (err) { next(err); }
};
