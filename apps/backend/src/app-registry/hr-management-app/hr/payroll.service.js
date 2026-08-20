const { prisma } = require('@workspace/db');
'use strict';

const moment = require('moment');

class PayrollService {
    /**
     * Calculate monthly salary for an employee based on attendance, leaves and holidays
     * @param {string} employeeId 
     * @param {string} month - YYYY-MM
     * @param {Object} prisma 
     */
    async calculateMonthlySalary(employeeId, month, prisma) {
        const User = prisma.user;
        const Attendance = prisma.attendance;
        const Leave = prisma.leave;
        const Holiday = prisma.holiday;

        // 1. Fetch Employee details
        const employee = await User.findUnique({
            where: { id: employeeId },
            select: { id: true, name: true, salary: true, joinDate: true }
        });
        if (!employee) {
            throw new Error('Employee not found');
        }

        const baseSalary = employee.salary || 0; // Allow 0-salary employees — HR will set before generating
        const employeeBonuses = 0; // Removing since it's not in schema
        const daysInMonth = moment(month, 'YYYY-MM').daysInMonth();
        
        let cycleDays = daysInMonth;
        const today = moment();
        if (today.format('YYYY-MM') === month) {
            cycleDays = today.date();
        }
        if (employee.joinDate) {
            const joinM = moment(employee.joinDate);
            if (joinM.format('YYYY-MM') === month) {
                const maxDate = (today.format('YYYY-MM') === month) ? today.date() : daysInMonth;
                if (joinM.date() <= maxDate) {
                    cycleDays = maxDate - joinM.date() + 1;
                }
            } else if (joinM.isAfter(moment(month, 'YYYY-MM').endOf('month'))) {
                cycleDays = 0; // Joined after this month
            }
        }
        
        // Use ISO string formats for Prisma date comparisons
        const startOfMonthStr = `${month}-01`;
        const endOfMonthStr = `${month}-${daysInMonth}`;
        const startOfMonthDate = new Date(`${month}-01T00:00:00Z`);
        const endOfMonthDate = new Date(`${month}-${daysInMonth}T23:59:59Z`);

        // 2. Parallel Data Fetching
        const [attendanceRecords, leaves, monthlyHolidays] = await Promise.all([
            Attendance.findMany({ 
                where: { 
                    employeeId, 
                    date: { gte: startOfMonthStr, lte: endOfMonthStr } 
                } 
            }),
            Leave.findMany({ 
                where: { 
                    employeeId, 
                    status: 'approved', 
                    OR: [
                        { startDate: { gte: startOfMonthStr, lte: endOfMonthStr } },
                        { endDate: { gte: startOfMonthStr, lte: endOfMonthStr } }
                    ]
                }
            }),
            Holiday.findMany({ 
                where: { 
                    date: { gte: startOfMonthDate, lte: endOfMonthDate } 
                } 
            })
        ]);

        // 3. Counters
        let presentDays = 0;
        let halfDays = 0;
        let absentDays = 0;
        let lateDays = 0;
        let paidLeaveDays = 0;
        let unpaidLeaveDays = 0;

        attendanceRecords.forEach(rec => {
            if (rec.status === 'present' || rec.status === 'work_from_home') presentDays++;
            else if (rec.status === 'late') { presentDays++; lateDays++; }
            else if (rec.status === 'half_day') halfDays++;
            else if (rec.status === 'absent') absentDays++;
        });

        const mStart = moment(startOfMonthDate);
        const mEnd = moment(endOfMonthDate);

        leaves.forEach(l => {
            const lStart = moment(l.startDate);
            const lEnd = moment(l.endDate);
            
            // Intersection of leave period and month period
            const intersectStart = moment.max(mStart, lStart);
            const intersectEnd = moment.min(mEnd, lEnd);
            
            if (intersectStart.isSameOrBefore(intersectEnd)) {
                const monthDays = intersectEnd.diff(intersectStart, 'days') + 1;
                if (l.type === 'unpaid') unpaidLeaveDays += monthDays;
                else paidLeaveDays += monthDays;
            }
        });

        const holidayCount = monthlyHolidays.length;

        // 4. Enterprise Calculation Logic
        const perDaySalary = daysInMonth > 0 ? baseSalary / daysInMonth : 0;
        
        // Effective days = (Present + HalfDay*0.5 + PaidLeave + Holidays)
        // Note: Holidays are usually paid for full-time employees.
        let effectiveDays = presentDays + (halfDays * 0.5) + paidLeaveDays + holidayCount;
        
        // Cap effective days to total days in month to prevent logic errors/double counting
        effectiveDays = Math.min(cycleDays, effectiveDays);
        
        const grossSalary = Math.round(effectiveDays * perDaySalary);
        
        // Deductions
        // Professional Tax (PT) - Simplistic Enterprise Rule (e.g. ₹200 if Gross > 15k)
        let ptDeduction = 0;
        if (grossSalary > 15000) ptDeduction = 200;

        // Late Coming Deduction (Optional: e.g. 5% of per day if > 3 late days)
        let lateDeduction = 0;
        if (lateDays > 3) {
            lateDeduction = Math.round((lateDays - 3) * (perDaySalary * 0.1)); // 10% penalty for late coming beyond 3 days
        }

        const totalDeductions = ptDeduction + lateDeduction;
        const netSalary = grossSalary + employeeBonuses - totalDeductions;

        let totalTenureDays = 0;
        if (employee.joinDate) {
            totalTenureDays = moment().diff(moment(employee.joinDate), 'days');
        }

        return {
            employeeId: employee.id,
            totalTenureDays,
            employeeName: employee.name,
            month,
            baseSalary,
            perDaySalary: Math.round(perDaySalary),
            totalDays: cycleDays,
            presentDays,
            halfDays,
            holidayCount,
            paidLeaves: paidLeaveDays,
            unpaidLeaves: unpaidLeaveDays,
            absentDays: Math.max(0, cycleDays - Math.floor(effectiveDays)),
            lateDays,
            bonuses: employeeBonuses,
            deductions: totalDeductions,
            netSalary: Math.max(0, Math.round(netSalary)),
            notes: baseSalary === 0
                ? `âš ï¸ No base salary set for this employee. Please set it before generating payroll. PT: â‚¹${ptDeduction}. Late Penalty: â‚¹${lateDeduction}. Holiday Credit: ${holidayCount} days.`
                : `Auto-generated. PT: â‚¹${ptDeduction}. Late Penalty: â‚¹${lateDeduction}. Holiday Credit: ${holidayCount} days.`,
            meta: {
                pt: ptDeduction,
                latePenalty: lateDeduction,
                gross: grossSalary
            }
        };
    }
}

module.exports = new PayrollService();
