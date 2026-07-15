'use strict';

const AnalyticsService = require('../../insights-app/analytics/analytics.service');
const EmailService = require('../../productivity-tools-app/emails/email.service');

exports.getSalaries = async (req, res, next) => {
    try {
        const Salary = req.prisma.salary;
        const { month, status, employeeId } = req.query;
        const query = { companyId: req.user.companyId };

        if (month) query.month = month;
        if (status) query.status = status;
        if (employeeId) query.employeeId = employeeId;

        const salaries = await Salary.findMany({
            where: query,
            include: {
                employee: { select: { name: true, email: true, employeeId: true, department: true, position: true } },
                generatedByUser: { select: { name: true, email: true } }
            },
            orderBy: [
                { month: 'desc' },
                { createdAt: 'desc' }
            ]
        });
        res.json({ success: true, salaries });
    } catch (err) { next(err); }
};

exports.hrApproveSalary = async (req, res, next) => {
    try {
        const Salary = req.prisma.salary;
        const { deductions, bonuses, notes } = req.body;
        const salary = await Salary.findFirst({ 
            where: { id: req.params.id, companyId: req.user.companyId },
            include: { employee: true }
        });
        if (!salary) return res.status(404).json({ error: 'Salary record not found' });
        
        if (['paid', 'approved'].includes(salary.status)) {
            return res.status(400).json({ error: `Cannot review salary in '${salary.status}' status` });
        }

        const base = salary.baseSalary || salary.employee?.salary || 0;
        const netSalary = Math.max(0, base - (deductions || 0) + (bonuses || 0));

        const updatedSalary = await Salary.update({
            where: { id: req.params.id },
            data: {
                status: 'hr_approved',
                deductions: deductions || 0,
                bonuses: bonuses || 0,
                netSalary: netSalary,
                notes: notes
            }
        });

        res.json({ success: true, salary: updatedSalary });
    } catch (err) { next(err); }
};

exports.getMySalaries = async (req, res, next) => {
    try {
        const Salary = req.prisma.salary;
        const userId = req.user.id;
        const salaries = await Salary.findMany({
            where: {
                employeeId: userId,
                companyId: req.user.companyId
            },
            orderBy: { month: 'desc' }
        });
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
        const preview = await PayrollService.calculateMonthlySalary(employeeId, month, req.prisma);
        res.json({ success: true, preview });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.generateSalary = async (req, res, next) => {
    try {
        const Salary = req.prisma.salary;
        const userId = req.user.id;
        const { 
            employeeId, month, baseSalary, deductions = 0, bonuses = 0, notes, 
            totalDays, presentDays, halfDays, absentDays, paidLeaves, unpaidLeaves, perDaySalary 
        } = req.body;

        if (!employeeId || !month || baseSalary === undefined || baseSalary === null || baseSalary === '') {
            return res.status(400).json({ error: 'employeeId, month, and baseSalary are required' });
        }

        const existing = await Salary.findFirst({ where: { employeeId, month, companyId: req.user.companyId } });
        if (existing && ['paid', 'approved'].includes(existing.status)) {
            return res.status(400).json({ error: `Salary for this month is already ${existing.status} and cannot be regenerated.` });
        }

        const netSalary = Math.max(0, Number(baseSalary) - Number(deductions) + Number(bonuses));
        
        const salaryData = { 
            companyId: req.user.companyId,
            baseSalary, deductions, bonuses, netSalary, notes, generatedBy: userId, status: 'pending',
            totalDays, presentDays, halfDays, absentDays, paidLeaves, unpaidLeaves, perDaySalary
        };

        const salary = await Salary.upsert({
            where: {
                employeeId_month: { employeeId, month }
            },
            update: salaryData,
            create: {
                ...salaryData,
                employeeId,
                month
            },
            include: {
                employee: { select: { name: true, email: true } }
            }
        });

        const AutomationService = require('../../../platform-core/platform-communications/services/automation.service');
        await AutomationService.trigger({
            eventType: 'salary_generated',
            triggeredBy: userId,
            targetUser: employeeId,
            relatedItem: { itemId: salary.id, itemModel: 'Salary' },
            description: `Salary for ${month} has been generated. Net Payable: â‚¹${netSalary.toLocaleString()}`,
            metadata: { month, netSalary }
        }, req.prisma);

        res.status(201).json({ success: true, salary });
    } catch (err) { 
        // fallback if employeeId_month unique constraint is not there
        if (err.code === 'P2012' || true) {
            const Salary = req.prisma.salary;
            const userId = req.user.id;
            const { employeeId, month, baseSalary, deductions = 0, bonuses = 0, notes, totalDays, presentDays, halfDays, absentDays, paidLeaves, unpaidLeaves, perDaySalary } = req.body;
            const netSalary = Math.max(0, Number(baseSalary) - Number(deductions) + Number(bonuses));
            
            const existing = await Salary.findFirst({ where: { employeeId, month, companyId: req.user.companyId } });
            
            let salary;
            const data = { baseSalary, deductions, bonuses, netSalary, notes, generatedBy: userId, status: 'pending', totalDays, presentDays, halfDays, absentDays, paidLeaves, unpaidLeaves, perDaySalary };
            if (existing) {
                salary = await Salary.update({ where: { id: existing.id }, data, include: { employee: { select: { name: true, email: true } } } });
            } else {
                salary = await Salary.create({ data: { ...data, employeeId, month, companyId: req.user.companyId }, include: { employee: { select: { name: true, email: true } } } });
            }
            const AutomationService = require('../../../platform-core/platform-communications/services/automation.service');
            await AutomationService.trigger({ eventType: 'salary_generated', triggeredBy: userId, targetUser: employeeId, relatedItem: { itemId: salary.id, itemModel: 'Salary' }, description: `Salary for ${month} has been generated. Net Payable: â‚¹${netSalary.toLocaleString()}`, metadata: { month, netSalary } }, req.prisma);
            return res.status(201).json({ success: true, salary });
        }
        next(err); 
    }
};

exports.approveSalary = async (req, res, next) => {
    try {
        const Salary = req.prisma.salary;
        const existing = await Salary.findFirst({ where: { id: req.params.id, companyId: req.user.companyId } });
        if (!existing) return res.status(404).json({ error: 'Salary record not found' });
        
        const salary = await Salary.update({
            where: { id: req.params.id },
            data: { status: 'approved' }
        });
        res.json({ success: true, salary });
    } catch (err) { next(err); }
};

exports.markPaid = async (req, res, next) => {
    try {
        const Salary = req.prisma.salary;
        const existing = await Salary.findFirst({ where: { id: req.params.id, companyId: req.user.companyId } });
        if (!existing) return res.status(404).json({ error: 'Salary record not found' });

        const salary = await Salary.update({
            where: { id: req.params.id },
            data: { status: 'paid', paidAt: new Date() },
            include: { employee: { select: { name: true, email: true } } }
        });

        // Generate and email Payslip
        try {
            await EmailService.notify(salary.employee, 'salary_generated', {
                employeeName: salary.employee.name,
                month: salary.month,
                netSalary: salary.netSalary,
                dashboardUrl: process.env.CLIENT_URL || 'http://localhost:3000'
            }, req.prisma);
        } catch (emailErr) {
            console.error('[Salary] Failed to send payslip email:', emailErr.message);
        }

        res.json({ success: true, salary });
    } catch (err) { next(err); }
};

exports.initiateSalaryPayout = async (req, res, next) => {
    try {
        const PayoutService = require('../finance/PayoutService.js');
        const result = await PayoutService.initiateSalaryPayout(req.prisma, req.params.id);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
