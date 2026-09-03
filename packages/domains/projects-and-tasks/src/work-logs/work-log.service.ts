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
        
        let companyId = user.companyId || (requestContext.getStore()?.companyId as string);
        if (!companyId) {
            const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
            companyId = dbUser?.companyId || undefined;
        }

        const workLog = await prisma.workLog.create({
            data: {
                userId: user.id,
                companyId,
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
                user: { select: { id: true, name: true, photoUrl: true, role: true } },
                task: { 
                    select: { 
                        id: true, 
                        title: true, 
                        description: true, 
                        estimatedHours: true,
                        creatorId: true,
                        assigneeId: true,
                        creator: { select: { id: true, name: true, email: true, photoUrl: true, role: true } },
                        assignee: { select: { id: true, name: true, email: true, photoUrl: true, role: true } }
                    } 
                },
                module: { select: { id: true, title: true } },
                project: { select: { id: true, name: true, ownerId: true } }
            }
        });
        
        if (taskId) {
            await prisma.task.update({
                where: { id: taskId },
                data: { status: 'in_review' }
            });

            // Notify the task creator/assigner that a work log has been submitted for review (fire-and-forget in background)
            if (workLog.task?.creatorId && workLog.task.creatorId !== user.id && triggerAutomation) {
                triggerAutomation({
                    eventType: 'work_log_submitted',
                    triggeredBy: user.id,
                    targetUser: workLog.task.creatorId,
                    relatedItem: { itemId: workLog.id, itemModel: 'WorkLog' },
                    description: `${user.name || 'An employee'} submitted a work log for review on task: "${workLog.task.title}"`,
                    sendEmailNotification: true,
                    metadata: {
                        taskTitle: workLog.task.title,
                        hoursSpent: hoursSpent || 0,
                        submittedBy: user.name || 'Employee',
                        workLogId: workLog.id
                    }
                }).catch(err => console.error('[WorkLogService] background automation error:', err));
            }
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
                user: { select: { id: true, name: true, photoUrl: true, role: true } },
                task: { 
                    select: { 
                        id: true, 
                        title: true, 
                        description: true, 
                        estimatedHours: true,
                        creatorId: true,
                        assigneeId: true,
                        creator: { select: { id: true, name: true, email: true, photoUrl: true, role: true } },
                        assignee: { select: { id: true, name: true, email: true, photoUrl: true, role: true } }
                    } 
                },
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
                user: { select: { id: true, name: true, photoUrl: true, role: true } },
                task: { 
                    select: { 
                        id: true, 
                        title: true, 
                        description: true, 
                        estimatedHours: true,
                        creatorId: true,
                        assigneeId: true,
                        creator: { select: { id: true, name: true, email: true, photoUrl: true, role: true } },
                        assignee: { select: { id: true, name: true, email: true, photoUrl: true, role: true } }
                    } 
                },
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
                user: { select: { id: true, name: true, photoUrl: true, role: true } },
                task: { 
                    select: { 
                        id: true, 
                        title: true, 
                        description: true, 
                        estimatedHours: true,
                        creatorId: true,
                        assigneeId: true,
                        creator: { select: { id: true, name: true, email: true, photoUrl: true, role: true } },
                        assignee: { select: { id: true, name: true, email: true, photoUrl: true, role: true } }
                    } 
                },
                module: { select: { id: true, title: true } },
                project: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, logs: mapLogs(logs) };
    }

    static async getPendingReviews(query: any, user: UserContext) {
        const companyId = user?.companyId || (requestContext.getStore()?.companyId as string);
        const userRoles = user?.roles || [user?.role || 'employee'];
        const isAdminOrCeo = userRoles.includes('admin') || userRoles.includes('ceo') || user?.role === 'admin' || user?.role === 'ceo';

        const baseWhere: any = { 
            ...getQueryFilters(query), 
            status: 'pending' 
        };
        if (companyId) {
            baseWhere.companyId = companyId;
        }

        if (!isAdminOrCeo && user?.id) {
            // Only show pending reviews for tasks where the current user is the assigner (creator) or self-assigned
            baseWhere.OR = [
                { task: { creatorId: user.id } },
                { userId: user.id },
                { project: { ownerId: user.id } }
            ];
        }

        const logs = await prisma.workLog.findMany({
            where: baseWhere,
            include: {
                user: { select: { id: true, name: true, photoUrl: true, role: true } },
                task: { 
                    select: { 
                        id: true, 
                        title: true, 
                        description: true, 
                        estimatedHours: true,
                        creatorId: true,
                        assigneeId: true,
                        creator: { select: { id: true, name: true, email: true, photoUrl: true, role: true } },
                        assignee: { select: { id: true, name: true, email: true, photoUrl: true, role: true } }
                    } 
                },
                module: { select: { id: true, title: true } },
                project: { select: { id: true, name: true, ownerId: true } }
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
                user: { select: { id: true, name: true, photoUrl: true, role: true } },
                task: { 
                    select: { 
                        id: true, 
                        title: true, 
                        description: true, 
                        estimatedHours: true,
                        creatorId: true,
                        assigneeId: true,
                        creator: { select: { id: true, name: true, email: true, photoUrl: true, role: true } },
                        assignee: { select: { id: true, name: true, email: true, photoUrl: true, role: true } }
                    } 
                },
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
        
        const existingLog = await prisma.workLog.findUnique({
            where: { id },
            include: { 
                task: { 
                    include: { 
                        creator: true,
                        assignee: true,
                        project: true 
                    } 
                },
                project: true
            }
        });

        if (!existingLog) {
            throw new Error('Work log not found');
        }

        const userRoles = user.roles || [user.role || 'employee'];
        const isAdminOrCeo = userRoles.includes('admin') || userRoles.includes('ceo') || user.role === 'admin' || user.role === 'ceo';
        const isTaskCreator = existingLog.task?.creatorId?.toString() === user.id.toString();
        const isSelfAssigned = isTaskCreator && existingLog.userId.toString() === user.id.toString();
        const isProjectOwner = existingLog.project?.ownerId?.toString() === user.id.toString();

        if (!isAdminOrCeo && !isTaskCreator && !isSelfAssigned && !isProjectOwner) {
            throw new Error('Access denied. Only the user who assigned this task or an administrator can review this work log.');
        }

        const workLog = await prisma.workLog.update({
            where: { id },
            data: { 
                status, 
                reviewComment: reviewComment || '',
                reviewedById: user.id,
                reviewedAt: new Date()
            },
            include: { 
                task: true,
                user: { select: { id: true, name: true, email: true } }
            }
        });
        
        if (status === 'rejected' && workLog.taskId) {
            await prisma.task.update({
                where: { id: workLog.taskId },
                data: { status: 'in_progress' }
            });

            if (triggerAutomation) {
                triggerAutomation({
                    eventType: 'work_log_rejected',
                    triggeredBy: user.id,
                    targetUser: workLog.userId,
                    relatedItem: { itemId: workLog.id, itemModel: 'WorkLog' },
                    description: `Your work log for task "${existingLog.task?.title || 'Task'}" was requested for revisions: "${reviewComment || 'Please revise and resubmit'}"`,
                    sendEmailNotification: true,
                    metadata: {
                        taskTitle: existingLog.task?.title,
                        reviewComment: reviewComment || '',
                        reviewedBy: user.name || 'Assigner'
                    }
                }).catch(err => console.error('[WorkLogService] rejection automation error:', err));
            }
        }
        
        if (status === 'approved' && workLog.taskId) {
            const oldTask = existingLog.task;
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
                    triggerAutomation({
                        eventType: 'task_completed',
                        triggeredBy: user.id,
                        targetUser: workLog.userId,
                        relatedItem: { itemId: oldTask.id, itemModel: 'Task' },
                        description: `Task "${oldTask.title}" review was approved and confirmed as completed!`,
                        sendEmailNotification: true,
                        metadata: { 
                            taskName: oldTask.title, 
                            completedOnTime: isOnTime,
                            reviewedBy: user.name || 'Assigner'
                        }
                    }).catch(err => console.error('[WorkLogService] approval automation error:', err));
                }
            }
        }
        
        return { success: true, data: workLog };
    }
}


