'use strict';
const { SalaryService } = require('@workspace/finance');
const EmailService = require('../../../platform-core/platform-communications/services/email.service');
const AutomationService = require('../../../platform-core/platform-communications/services/automation.service');

exports.reviewSalary = async (req, res, next) => {
    try {
        const salary = await SalaryService.reviewSalary(req.user.companyId, req.params.id, req.body);
        res.json({ success: true, salary });
    } catch (err) { next(err); }
};

exports.getMySalaries = async (req, res, next) => {
    try {
        const salaries = await SalaryService.getMySalaries(req.user.companyId, req.user.id);
        res.json({ success: true, salaries });
    } catch (err) { next(err); }
};

exports.getSalaryPreview = async (req, res, next) => {
    try {
        const { employeeId, month } = req.query;
        if (!employeeId || !month) {
            return res.status(400).json({ error: 'employeeId and month are required' });
        }
        const PayrollService = require('../../hr-management-app/hr/payroll.service.js');
        const preview = await PayrollService.calculateMonthlySalary(employeeId, month);
        res.json({ success: true, preview });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.generateSalary = async (req, res, next) => {
    try {
        const salary = await SalaryService.generateSalary(req.user.companyId, req.user.id, req.body);
        
        await AutomationService.trigger({
            eventType: 'salary_generated',
            triggeredBy: req.user.id,
            targetUser: salary.employeeId,
            relatedItem: { itemId: salary.id, itemModel: 'Salary' },
            description: `Salary for ${salary.month} has been generated. Net Payable: $${salary.netSalary.toLocaleString()}`,
            metadata: { month: salary.month, netSalary: salary.netSalary }
        });

        res.status(201).json({ success: true, salary });
    } catch (err) { next(err); }
};

exports.approveSalary = async (req, res, next) => {
    try {
        const salary = await SalaryService.approveSalary(req.user.companyId, req.params.id);
        res.json({ success: true, salary });
    } catch (err) { next(err); }
};

exports.markPaid = async (req, res, next) => {
    try {
        const salary = await SalaryService.markPaid(req.user.companyId, req.params.id);

        try {
            await EmailService.notify(salary.employee, 'salary_generated', {
                employeeName: salary.employee.name,
                month: salary.month,
                netSalary: salary.netSalary,
                dashboardUrl: process.env.CLIENT_URL || 'http://localhost:3000'
            });
        } catch (emailErr) {
            console.error('[Salary] Failed to send payslip email:', emailErr.message);
        }

        res.json({ success: true, salary });
    } catch (err) { next(err); }
};

exports.initiateSalaryPayout = async (req, res, next) => {
    try {
        // Keeping logic minimal as it might rely on PayoutService which is domain specific
        const PayoutService = require('../finance/PayoutService.js');
        const result = await PayoutService.initiateSalaryPayout(req.params.id);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
