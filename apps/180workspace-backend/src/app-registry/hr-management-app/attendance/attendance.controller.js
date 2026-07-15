'use strict';

const { parse, isValid } = require('date-fns');

const calculateWorkHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    const [h1, m1] = checkIn.split(':').map(Number);
    const [h2, m2] = checkOut.split(':').map(Number);
    const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    return Math.max(0, Number((diff / 60).toFixed(2)));
};

exports.getAttendance = async (req, res, next) => {
    try {
        const Attendance = req.prisma.attendance;
        const { employeeId, date, month, page = 1, limit = 100 } = req.query;
        const query = {};
        if (employeeId) query.employeeId = employeeId;
        if (date) query.date = date;
        if (month) query.date = { startsWith: month }; // YYYY-MM prefix match

        const skip = (Number(page) - 1) * Number(limit);
        const [records, total] = await Promise.all([
            Attendance.findMany({
                where: query,
                include: {
                    employee: { select: { name: true, email: true, employeeId: true, photoUrl: true, department: true } },
                    markedBy: { select: { name: true, email: true } }
                },
                orderBy: { date: 'desc' },
                skip,
                take: Number(limit)
            }),
            Attendance.count({ where: query }),
        ]);
        res.json({ records, total });
    } catch (err) { next(err); }
};

exports.getMyAttendance = async (req, res, next) => {
    try {
        const Attendance = req.prisma.attendance;
        const { month } = req.query;
        const query = { employeeId: req.user.id };
        if (month) query.date = { startsWith: month };

        const records = await Attendance.findMany({ where: query, orderBy: { date: 'desc' } });
        res.json({ records });
    } catch (err) { next(err); }
};

exports.getMonthlyReport = async (req, res, next) => {
    try {
        const Attendance = req.prisma.attendance;
        const User = req.prisma.user;
        const { month } = req.query; // YYYY-MM
        if (!month) return res.status(400).json({ error: 'month param required (YYYY-MM)' });

        // Include ALL active users (not just employees)
        const employees = await User.findMany({ where: { isActive: true, role: { not: 'client' } } });
        const records = await Attendance.findMany({ where: { date: { startsWith: month } } });

        // Count working days in the month (Monâ€“Sat, or all â€” simplified to calendar days minus Sundays)
        const [y, m] = month.split('-').map(Number);
        const daysInMonth = new Date(y, m, 0).getDate();
        let workingDays = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            const day = new Date(y, m - 1, d).getDay();
            if (day !== 0) workingDays++; // exclude Sundays
        }

        // Build summary per employee
        const summary = employees.map((emp) => {
            const empIdStr = emp.id || emp._id;
            const empRecords = records.filter((r) => r.employeeId === empIdStr);
            const countBy = (status) => empRecords.filter((r) => r.status === status).length;
            const present = countBy('present');
            const late = countBy('late');
            const halfDay = countBy('half_day');
            const wfh = countBy('work_from_home');
            const onLeave = countBy('on_leave');
            const absent = countBy('absent');
            const totalMarked = empRecords.length;
            const attendanceRate = workingDays > 0 ? Math.round(((present + late + wfh + halfDay * 0.5) / workingDays) * 100) : 0;
            // Latest check-in/out
            const checkIns = empRecords.filter(r => r.checkIn).map(r => r.checkIn).sort();
            const checkOuts = empRecords.filter(r => r.checkOut).map(r => r.checkOut).sort().reverse();
            return {
                employee: { _id: empIdStr, name: emp.name, employeeId: emp.employeeId, department: emp.department, role: emp.role, photoUrl: emp.photoUrl },
                present, absent, late, halfDay, wfh, onLeave,
                total: totalMarked,
                workingDays,
                attendanceRate,
                avgCheckIn: checkIns[Math.floor(checkIns.length / 2)] || null,
            };
        });

        // Overall stats
        const totalPresent = summary.reduce((a, s) => a + s.present, 0);
        const totalAbsent = summary.reduce((a, s) => a + s.absent, 0);
        const totalLate = summary.reduce((a, s) => a + s.late, 0);
        const totalWFH = summary.reduce((a, s) => a + s.wfh, 0);
        const totalLeave = summary.reduce((a, s) => a + s.onLeave, 0);

        res.json({
            month, summary, employeeCount: employees.length, workingDays,
            totals: { present: totalPresent, absent: totalAbsent, late: totalLate, wfh: totalWFH, onLeave: totalLeave },
        });
    } catch (err) { next(err); }
};

exports.markAttendance = async (req, res, next) => {
    try {
        const Attendance = req.prisma.attendance;
        const { employeeId, date, status, checkIn, checkOut, notes } = req.body;
        const userId = req.user.id;
        const workHours = calculateWorkHours(checkIn, checkOut);

        const record = await Attendance.upsert({
            where: { employeeId_date: { employeeId, date } },
            update: { status, checkIn, checkOut, notes, workHours, markedById: userId },
            create: { employeeId, date, status, checkIn, checkOut, notes, workHours, markedById: userId }
        });

        // Trigger automation for late or absent
        if (status === 'late' || status === 'absent') {
            const AutomationService = require('../../../platform-core/platform-communications/services/automation.service');
            await AutomationService.trigger({
                eventType: `attendance_${status}`,
                triggeredBy: userId,
                targetUser: employeeId,
                description: `Employee was marked ${status} for ${date}`,
                metadata: { date, status }
            }, req.user.companyId); // Passing companyId for tenant context if needed
        }

        res.status(200).json({ record });
    } catch (err) { next(err); }
};

exports.updateAttendance = async (req, res, next) => {
    try {
        const Attendance = req.prisma.attendance;
        if (req.body.checkIn || req.body.checkOut) {
            const existing = await Attendance.findUnique({ where: { id: req.params.id } });
            if (existing) {
                const cIn = req.body.checkIn !== undefined ? req.body.checkIn : existing.checkIn;
                const cOut = req.body.checkOut !== undefined ? req.body.checkOut : existing.checkOut;
                req.body.workHours = calculateWorkHours(cIn, cOut);
            }
        }
        
        const record = await Attendance.update({ where: { id: req.params.id }, data: req.body });
        if (!record) return res.status(404).json({ error: 'Record not found' });
        res.json({ record });
    } catch (err) { next(err); }
};

// --- Automated Attendance Methods ---


const determineShiftStatus = (checkIn, standardStart, gracePeriod) => {
    const [h1, m1] = checkIn.split(':').map(Number);
    const [h2, m2] = standardStart.split(':').map(Number);
    const actualTotal = h1 * 60 + m1;
    const standardTotal = h2 * 60 + m2;
    
    if (actualTotal < standardTotal) return 'before_start';
    if (actualTotal <= standardTotal + gracePeriod) return 'on_time';
    return 'late';
};

const determineExitStatus = (checkOut, standardEnd) => {
    if (!checkOut || !standardEnd) return 'on_time';
    const [h1, m1] = checkOut.split(':').map(Number);
    const [h2, m2] = standardEnd.split(':').map(Number);
    const actualTotal = h1 * 60 + m1;
    const standardTotal = h2 * 60 + m2;
    
    if (actualTotal < standardTotal) return 'early_exit';
    return 'on_time';
};

exports.autoCheckIn = async (req, res, next) => {
    try {
        const Attendance = req.prisma.attendance;
        const CompanyConfig = req.prisma.companyConfig;
        const config = await CompanyConfig.findFirst({ where: { companyId: req.user.companyId } }) || {};
        
        const date = new Date().toISOString().split('T')[0];
        const now = new Date();
        const checkInTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const userId = req.user.id;

        // Check if already checked in today
        let record = await Attendance.findFirst({ where: { employeeId: userId, date } });
        if (record && record.checkIn) {
            return res.json({ message: 'Already checked in', record });
        }

        const standardStart = config.standardStartTime || '09:00';
        const grace = config.gracePeriod || 15;
        const shiftStatus = determineShiftStatus(checkInTime, standardStart, grace);

        record = await Attendance.upsert({
            where: { employeeId_date: { employeeId: userId, date } },
            update: { 
                checkIn: checkInTime, 
                status: shiftStatus === 'late' ? 'late' : 'present',
                shiftStatus,
                markedById: userId 
            },
            create: {
                employeeId: userId,
                date,
                checkIn: checkInTime,
                status: shiftStatus === 'late' ? 'late' : 'present',
                shiftStatus,
                markedById: userId
            }
        });

        res.json({ message: 'Checked in successfully', record });
    } catch (err) { next(err); }
};

exports.autoCheckOut = async (req, res, next) => {
    try {
        const Attendance = req.prisma.attendance;
        const date = new Date().toISOString().split('T')[0];
        const now = new Date();
        const checkOutTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const userId = req.user.id;

        const record = await Attendance.findFirst({ where: { employeeId: userId, date } });
        if (!record) return res.status(404).json({ error: 'No attendance record found for today' });
        if (!record.checkIn) return res.status(400).json({ error: 'Cannot check out without check-in' });

        const CompanyConfig = req.prisma.companyConfig;
        const config = await CompanyConfig.findFirst({ where: { companyId: req.user.companyId } }) || {};
        const standardEnd = config.standardEndTime || '18:00';

        const workHours = calculateWorkHours(record.checkIn, checkOutTime);
        const exitStatus = determineExitStatus(checkOutTime, standardEnd);
        
        const updated = await Attendance.update({ 
            where: { id: record.id }, 
            data: { 
                checkOut: checkOutTime, 
                workHours,
                shiftStatus: exitStatus === 'early_exit' ? 'early_exit' : record.shiftStatus 
            } 
        });

        res.json({ message: 'Checked out successfully', record: updated });
    } catch (err) { next(err); }
};
