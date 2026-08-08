'use strict';

/**
 * TimeLog Controller
 * Handles manual logging, timers, and auto-logging with multi-company support.
 */

exports.getTimeLogs = async (req, res, next) => {
    try {
        const TimeLog = req.prisma.timeLog;
        const { userId, projectId, date, startDate, endDate } = req.query;

        const filter = {};
        
        // Employees can only see their own logs
        if (req.user.role === 'employee') {
            filter.userId = req.user.id;
        } else if (userId) {
            filter.userId = userId;
        }

        if (projectId) filter.projectId = projectId;
        if (date) filter.date = date;
        
        if (startDate || endDate) {
            filter.startTime = {};
            if (startDate) filter.startTime.gte = new Date(startDate);
            if (endDate) filter.startTime.lte = new Date(endDate);
        }

        const logs = await TimeLog.findMany({
            where: filter,
            include: {
                user: { select: { name: true, email: true, photoUrl: true } },
                project: { select: { name: true } },
                task: { select: { title: true } }
            },
            orderBy: { startTime: 'desc' }
        });

        res.json({ logs });
    } catch (err) { next(err); }
};

exports.startTimer = async (req, res, next) => {
    try {
        const TimeLog = req.prisma.timeLog;
        const { projectId, taskId, description } = req.body;

        const now = new Date();

        // Stop any currently running timer for this user
        await TimeLog.updateMany({
            where: { userId: req.user.id, status: 'running' },
            data: { 
                status: 'stopped', 
                endTime: now
            }
        });

        const log = await TimeLog.create({ 
            data: {
                userId: req.user.id,
                projectId: projectId || undefined,
                taskId: taskId || undefined,
                description: description || '',
                startTime: now,
                date: now.toISOString().split('T')[0],
                status: 'running',
            } 
        });

        res.status(201).json({ log });
    } catch (err) { next(err); }
};

exports.stopTimer = async (req, res, next) => {
    try {
        const TimeLog = req.prisma.timeLog;
        const now = new Date();

        const running = await TimeLog.findFirst({ where: { userId: req.user.id, status: 'running' } });
        if (!running) {
            return res.status(404).json({ error: 'No active timer found.' });
        }

        const durationMinutes = Math.round((now - running.startTime) / 60000);
        
        const updatedLog = await TimeLog.update({
            where: { id: running.id },
            data: {
                status: 'stopped',
                endTime: now,
                durationMinutes
            }
        });

        res.json({ log: updatedLog });
    } catch (err) { next(err); }
};

exports.createEntry = async (req, res, next) => {
    try {
        const TimeLog = req.prisma.timeLog;
        const { projectId, taskId, description, startTime, endTime, hours } = req.body;

        let start, end, durationMinutes;

        if (hours && !startTime) {
            // If hours provided directly, set date to today and end to now
            end = new Date();
            start = new Date(end.getTime() - (hours * 3600000));
            durationMinutes = Math.round(hours * 60);
        } else {
            start = new Date(startTime);
            end = new Date(endTime || Date.now());
            durationMinutes = Math.round((end - start) / 60000);
        }

        const log = await TimeLog.create({ 
            data: {
                userId: req.user.id,
                projectId: projectId || undefined,
                taskId: taskId || undefined,
                description: description || '',
                startTime: start,
                endTime: end,
                durationMinutes,
                date: start.toISOString().split('T')[0],
                status: 'stopped',
            } 
        });

        res.status(201).json({ log });
    } catch (err) { next(err); }
};

exports.deleteTimeLog = async (req, res, next) => {
    try {
        const TimeLog = req.prisma.timeLog;
        
        const log = await TimeLog.findFirst({ where: { id: req.params.id } });
        if (!log) return res.status(404).json({ error: 'Log not found.' });

        // Only owner or admin/manager can delete
        const isOwner = log.userId === req.user.id;
        const isAdmin = ['admin', 'manager'].includes(req.user.role);

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: 'Permission denied.' });
        }

        await TimeLog.delete({ where: { id: req.params.id } });
        res.json({ message: 'Time log deleted successfully.' });
    } catch (err) { next(err); }
};
