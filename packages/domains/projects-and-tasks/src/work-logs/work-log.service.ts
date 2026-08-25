import type { UserContext } from '../tasks/task.service.js';

import { prisma, requestContext } from '@workspace/db';
import { triggerAutomation } from '@workspace/backend-infra';

const mapLogs = (logs: any[]) => logs.map(log => {
    const mapped: any = {
        ...log,
        userId: log.user,
        taskId: log.task,
        moduleId: log.module,
        projectId: log.project
    };
    delete mapped.user;
    delete mapped.task;
    delete mapped.module;
    delete mapped.project;
    return mapped;
});

const getQueryFilters = (query: any) => {
    const { projectId, moduleId, userId, startDate, endDate } = query;
    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (moduleId) where.moduleId = moduleId;
    if (userId) where.userId = userId;
    if (startDate && endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        where.workDate = {
            gte: new Date(startDate),
            lte: endOfDay
        };
    }
    return where;
};

export class WorkLogService {
    static async submitWorkLog(data: any, user: UserContext) {
        const { projectId, moduleId, taskId, description, hoursSpent, workDate, links, attachmentUrls, voiceMessageUrl, isWorkCompleted, status, reviewComment } = data;
        
        const workLog = await prisma.workLog.create({
            data: {
                userId: user.id,
                projectId,
                moduleId: moduleId || null,
                taskId: taskId || null,
                description,
                hoursSpent: hoursSpent ? parseFloat(hoursSpent) : 0,
                workDate: workDate ? new Date(workDate) : undefined,
                links: links || [],
                attachmentUrls: attachmentUrls || [],
                voiceMessageUrl,
                isWorkCompleted: isWorkCompleted || false,
                status: status || 'pending',
                reviewComment: reviewComment || ''
            },
            include: {
                user: { select: { id: true, name: true, photoUrl: true } },
                task: { select: { id: true, title: true, description: true, estimatedHours: true } },
                module: { select: { id: true, title: true } },
                project: { select: { id: true, name: true } }
            }
        });
        
        if (taskId) {
            await prisma.task.update({
                where: { id: taskId },
                data: { status: 'in_review' }
            });
        }
        
        const mappedLog = mapLogs([workLog])[0];
        return { success: true, workLog: mappedLog };
    }

    static async getLogs(query: any) {
        const { projectId } = query;
        if (!projectId) throw new Error('projectId is required');
        
        const logs = await prisma.workLog.findMany({
            where: { projectId },
            include: {
                user: { select: { id: true, name: true, photoUrl: true } },
                task: { select: { id: true, title: true, description: true, estimatedHours: true } },
                module: { select: { id: true, title: true } },
                project: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        return { success: true, logs: mapLogs(logs) };
    }

    static async getMyLogs(query: any, user: UserContext) {
        const where = { ...getQueryFilters(query), userId: user.id };
        const logs = await prisma.workLog.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, photoUrl: true } },
                task: { select: { id: true, title: true, description: true, estimatedHours: true } },
                module: { select: { id: true, title: true } },
                project: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, logs: mapLogs(logs) };
    }

    static async getAllLogs(query: any) {
        const where = getQueryFilters(query);
        const logs = await prisma.workLog.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, photoUrl: true } },
                task: { select: { id: true, title: true, description: true, estimatedHours: true } },
                module: { select: { id: true, title: true } },
                project: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, logs: mapLogs(logs) };
    }

    static async getPendingReviews(query: any) {
        const where = { ...getQueryFilters(query), status: 'pending' };
        const logs = await prisma.workLog.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, photoUrl: true } },
                task: { select: { id: true, title: true, description: true, estimatedHours: true } },
                module: { select: { id: true, title: true } },
                project: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, logs: mapLogs(logs) };
    }

    static async getDashboardStats(query: any, user: UserContext) {
        const where = getQueryFilters(query);
        const companyId = requestContext.getStore()?.companyId as string;
        
        const logs = await prisma.workLog.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, photoUrl: true } },
                task: { select: { id: true, title: true, description: true, estimatedHours: true } },
                module: { select: { id: true, title: true } },
                project: { select: { id: true, name: true } }
            },
            orderBy: { workDate: 'desc' }
        });

        const totalHours = logs.reduce((sum: number, log: any) => sum + (log.hoursSpent || 0), 0);
        const approved = logs.filter((l: any) => l.status === 'approved').length;
        const pending = logs.filter((l: any) => l.status === 'pending').length;
        const rejected = logs.filter((l: any) => l.status === 'rejected').length;

        const chartMap: Record<string, number> = {};
        logs.forEach((log: any) => {
            const dateKey = log.workDate.toISOString().split('T')[0];
            chartMap[dateKey] = (chartMap[dateKey] || 0) + (log.hoursSpent || 0);
        });
        const chartData = Object.entries(chartMap)
            .map(([date, hours]) => ({ date, hours }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const projects = await prisma.project.findMany({
            where: { companyId },
            select: { id: true, name: true }
        });

        const modules = await prisma.module.findMany({
            where: { project: { companyId } },
            select: { id: true, title: true, projectId: true }
        });

        const users = await prisma.user.findMany({
            where: { companyId },
            select: { id: true, name: true, photoUrl: true }
        });

        return {
            success: true,
            summary: { totalHours, approved, pending, rejected },
            chartData,
            logs: mapLogs(logs),
            filterOptions: {
                projects,
                modules: modules.map((m: any) => ({ id: m.id, name: m.title, projectId: m.projectId })),
                users
            }
        };
    }

    static async reviewWorkLog(id: string, data: any, user: UserContext) {
        const { status, reviewComment } = data;
        
        const workLog = await prisma.workLog.update({
            where: { id },
            data: { status, reviewComment },
            include: { task: true }
        });
        
        if (status === 'rejected' && workLog.taskId) {
            await prisma.task.update({
                where: { id: workLog.taskId },
                data: { status: 'in_progress' }
            });
        }
        
        if (status === 'approved' && workLog.taskId) {
            const oldTask = workLog.task;
            if (oldTask && oldTask.status !== 'done') {
                const now = new Date();
                const isOnTime = oldTask.dueDate ? now <= new Date(oldTask.dueDate) : true;
                
                await prisma.task.update({
                    where: { id: oldTask.id },
                    data: {
                        status: 'done',
                        completedOnTime: isOnTime
                    }
                });

                if (oldTask.assigneeId && isOnTime) {
                    const assignee = await prisma.user.findUnique({ where: { id: oldTask.assigneeId } });
                    if (assignee) {
                        const newScore = Math.min((assignee.performanceScore || 100) + 1, 500);
                        await prisma.user.update({ where: { id: oldTask.assigneeId }, data: { performanceScore: newScore } });
                    }
                }

                if (triggerAutomation) {
                    await triggerAutomation({
                        eventType: 'task_completed',
                        triggeredBy: user.id,
                        relatedItem: { itemId: oldTask.id, itemModel: 'Task' },
                        description: `Task "${oldTask.title}" has been completed! +1 achievement point awarded.`,
                        metadata: { taskName: oldTask.title, completedOnTime: isOnTime }
                    });
                }
            }
        }
        
        return { success: true, data: workLog };
    }
}


