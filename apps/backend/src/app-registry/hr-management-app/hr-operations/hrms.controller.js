const { HrManagementService } = require('@workspace/hr-management');

exports.getDashboard = async (req, res, next) => {
    try {
        const service = new HrManagementService();
        const data = await service.getDashboard(req.user?.companyId);
        res.json(data);
    } catch (err) { next(err); }
};

exports.getAttendanceReport = async (req, res, next) => {
    try {
        const service = new HrManagementService();
        const data = await service.getAttendanceReport(req.user?.companyId, req.query.month);
        res.json(data);
    } catch (err) {
        if (err.message === 'month param required (YYYY-MM)') return res.status(400).json({ error: err.message });
        next(err); 
    }
};

exports.getSalaryReport = async (req, res, next) => {
    try {
        const service = new HrManagementService();
        const data = await service.getSalaryReport(req.user?.companyId, req.query.month);
        res.json(data);
    } catch (err) {
        if (err.message === 'month param required (YYYY-MM)') return res.status(400).json({ error: err.message });
        next(err); 
    }
};

exports.getWeeklyTrends = async (req, res, next) => {
    try {
        const service = new HrManagementService();
        const data = await service.getWeeklyTrends(req.user?.companyId, req.query.range, req.query.grouping);
        res.json(data);
    } catch (err) { next(err); }
};

exports.getCEOInsights = async (req, res, next) => {
    try {
        const service = new HrManagementService();
        const data = await service.getCEOInsights(req.user?.companyId);
        res.json(data);
    } catch (err) { next(err); }
};

exports.getAttendanceTrend = async (req, res, next) => {
    try {
        const service = new HrManagementService();
        const data = await service.getAttendanceTrend(req.user?.companyId, req.query.range, req.query.grouping);
        res.json(data);
    } catch (err) { next(err); }
};
