import type { UserContext } from '../tasks/task.service.js';

const { prisma } = require('@workspace/db');

export class TimeLogService {
    static async getTimeLogs(queryOptions: any, user: UserContext) {
        const { userId, projectId, date, startDate, endDate } = queryOptions;
        const filter: any = {};
        
        if (user.role === 'employee') {
            filter.userId = user.id;
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

        const logs = await prisma.timeLog.findMany({
            where: filter,
            include: {
                user: { select: { name: true, email: true, photoUrl: true } },
                project: { select: { name: true } },
                task: { select: { title: true } }
            },
            orderBy: { startTime: 'desc' }
        });

        return { logs };
    }

    static async startTimer(data: any, user: UserContext) {
        const { projectId, taskId, description } = data;
        const now = new Date();

        await prisma.timeLog.updateMany({
            where: { userId: user.id, status: 'running' },
            data: { 
                status: 'stopped', 
                endTime: now
            }
        });

        const log = await prisma.timeLog.create({ 
            data: {
                userId: user.id,
                projectId: projectId || undefined,
                taskId: taskId || undefined,
                description: description || '',
                startTime: now,
                date: now.toISOString().split('T')[0],
                status: 'running',
            } 
        });

        return { log };
    }

    static async stopTimer(user: UserContext) {
        const now = new Date();

        const running = await prisma.timeLog.findFirst({ where: { userId: user.id, status: 'running' } });
        if (!running) {
            throw new Error('No active timer found.');
        }

        const durationMinutes = Math.round((now.getTime() - running.startTime.getTime()) / 60000);
        
        const updatedLog = await prisma.timeLog.update({
            where: { id: running.id },
            data: {
                status: 'stopped',
                endTime: now,
                durationMinutes
            }
        });

        return { log: updatedLog };
    }

    static async createEntry(data: any, user: UserContext) {
        const { projectId, taskId, description, startTime, endTime, hours } = data;

        let start: Date;
        let end: Date;
        let durationMinutes: number;

        if (hours && !startTime) {
            end = new Date();
            start = new Date(end.getTime() - (hours * 3600000));
            durationMinutes = Math.round(hours * 60);
        } else {
            start = new Date(startTime);
            end = new Date(endTime || Date.now());
            durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
        }

        const log = await prisma.timeLog.create({ 
            data: {
                userId: user.id,
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

        return { log };
    }

    static async deleteTimeLog(logId: string, user: UserContext) {
        const log = await prisma.timeLog.findFirst({ where: { id: logId } });
        if (!log) throw new Error('Log not found.');

        const isOwner = log.userId === user.id;
        const isAdmin = ['admin', 'manager'].includes(user.role || '');

        if (!isOwner && !isAdmin) {
            throw new Error('Permission denied.');
        }

        await prisma.timeLog.delete({ where: { id: logId } });
        return { message: 'Time log deleted successfully.' };
    }
}
