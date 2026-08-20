'use strict';

const { EmployeeService } = require('@workspace/hr-management');

exports.getDashboardStats = async (req, res) => {
    try {
        const employeeService = new EmployeeService();
        const stats = await employeeService.getDashboardStats(req.user.id);
        return res.json(stats);
    } catch (error) {
        console.error('Employee dashboard error:', error);
        res.status(500).json({ error: 'Failed to load employee dashboard', details: String(error) });
    }
};
