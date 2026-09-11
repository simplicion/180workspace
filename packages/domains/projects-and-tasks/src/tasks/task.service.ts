import { prisma, requestContext } from '@workspace/db';
import { logAction, triggerAutomation, emitSocket, paginateWithCursor, extractPaginationParams } from '@workspace/backend-infra';

export interface UserContext {
    id: string;
    role?: string;
    roles?: string[];
    companyId?: string;
    name?: string;
}

export class TaskService {
    static async getTasks(
        filters: any = {},
        user: UserContext
    ) {
        const { 
            projectId, assigneeId, moduleId, status, priority, clientId, date, 
            page = 1, limit = 100, cursor, direction, sortField, sortOrder 
        } = filters;

        const query: any = { deletedAt: null };
        if (projectId) query.projectId = projectId;
        if (assigneeId) query.assigneeId = assigneeId;
        if (moduleId) query.moduleId = moduleId;
        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (clientId) query.clientId = clientId;
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setUTCHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setUTCHours(23, 59, 59, 999);
            query.dueDate = {
                gte: startOfDay,
                lte: endOfDay
            };
        }

        const userRoles = user.roles || [user.role || 'employee'];
        const isAdminOrCeo = userRoles.includes('admin') || userRoles.includes('ceo') || user.role === 'admin' || user.role === 'ceo';

        if (!isAdminOrCeo) {
            query.OR = [
                { assigneeId: user.id },
                { creatorId: user.id }
            ];
        }

        const selectIncludes = {
            assignee: { select: { id: true, name: true, email: true, photoUrl: true, role: true } },
            creator: { select: { id: true, name: true, email: true, photoUrl: true, role: true } },
            project: { select: { id: true, name: true, status: true } }
        };

        if (cursor) {
            const paginatedResult = await paginateWithCursor(prisma.task, {
                where: query,
                cursor,
                limit: Number(limit) || 20,
                direction: direction || 'forward',
                sortField: sortField || 'createdAt',
                sortOrder: sortOrder || 'desc',
                include: selectIncludes,
                includeTotalCount: true
            });

            const mappedTasks = paginatedResult.items.map((t: any) => ({
                ...t,
                projectId: t.project ? { id: t.projectId, name: t.project.name, status: t.project.status } : t.projectId,
                project: undefined
            }));

            return { 
                tasks: mappedTasks, 
                total: paginatedResult.pageInfo.totalCount,
                pageInfo: paginatedResult.pageInfo 
            };
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [tasks, total] = await Promise.all([
            prisma.task.findMany({
                where: query,
                include: selectIncludes,
                orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
                skip,
                take: Number(limit)
            }),
            prisma.task.count({ where: query })
        ]);

        const mappedTasks = tasks.map((t: any) => ({
            ...t,
            projectId: t.project ? { id: t.projectId, name: t.project.name, status: t.project.status } : t.projectId,
            project: undefined
        }));

        return { tasks: mappedTasks, total };
    }

    static async createTask(data: any, user: UserContext) {
        const body = { ...data, creatorId: user.id };

        if (body.projectId) {
            delete body.clientId;
        }

        if (body.dueDate && !body.estimatedHours) {
            const now = new Date();
            const due = new Date(body.dueDate);
            const diffMs = due.getTime() - now.getTime();
            body.estimatedHours = diffMs > 0 ? Math.round(diffMs / (1000 * 60 * 60)) : 0;
        }

        const allowedFields = ['title', 'description', 'status', 'priority', 'dueDate', 'estimatedHours', 'projectId', 'moduleId', 'assigneeId', 'creatorId', 'voiceMessageUrl', 'attachments', 'clientId'];
        const cleanData: any = {};
        allowedFields.forEach(f => {
            if (body[f] !== undefined) {
                if (f === 'dueDate') {
                    cleanData[f] = body[f] ? new Date(body[f]) : null;
                } else if (f === 'estimatedHours') {
                    cleanData[f] = parseInt(body[f], 10) || 0;
                } else {
                    if (body[f] === '' || body[f] === 'undefined' || body[f] === 'null') {
                        cleanData[f] = null;
                    } else {
                        cleanData[f] = body[f];
                    }
                }
            }
        });

        if (cleanData.projectId) {
            cleanData.project = { connect: { id: cleanData.projectId } };
            delete cleanData.projectId;
        } else {
            delete cleanData.projectId;
        }

        if (cleanData.assigneeId) {
            cleanData.assignee = { connect: { id: cleanData.assigneeId } };
            delete cleanData.assigneeId;
        } else {
            delete cleanData.assigneeId;
        }

        if (cleanData.creatorId) {
            cleanData.creator = { connect: { id: cleanData.creatorId } };
            delete cleanData.creatorId;
        } else {
            delete cleanData.creatorId;
        }

        if (cleanData.moduleId) {
            cleanData.module = { connect: { id: cleanData.moduleId } };
            delete cleanData.moduleId;
        } else {
            delete cleanData.moduleId;
        }

        if (cleanData.clientId) {
            cleanData.client = { connect: { id: cleanData.clientId } };
            delete cleanData.clientId;
        } else {
            delete cleanData.clientId;
        }

        const task = await prisma.task.create({
            data: cleanData,
            include: {
                assignee: { select: { id: true, name: true, email: true, photoUrl: true, role: true } },
                creator: { select: { id: true, name: true, email: true, photoUrl: true, role: true } },
                project: { select: { id: true, name: true, status: true, description: true, progress: true } }
            }
        });

        if (logAction) {
            await logAction(user.id, 'CREATE_TASK', 'task', task.id, { title: task.title, projectId: task.projectId, assignee: task.assignee?.name, status: task.status, priority: task.priority });
        }

        let notificationResult = null;
        if (task.assigneeId && triggerAutomation) {
            const project = task.projectId ? await prisma.project.findUnique({ where: { id: task.projectId }, select: { name: true } }) : null;
            const companyId = requestContext.getStore()?.companyId as string || (user as any).companyId;
            const triggerResult = await triggerAutomation({
                eventType: 'task_assigned',
                triggeredBy: user.id,
                targetUser: task.assigneeId,
                companyId: companyId,
                relatedItem: { itemId: task.id, itemModel: 'Task' },
                description: `You were assigned to task: ${task.title}`,
                sendEmailNotification: data.sendEmailNotification !== false,
                metadata: {
                    taskName: task.title,
                    taskTitle: task.title,
                    projectName: project ? project.name : 'Personal',
                    priority: task.priority || 'medium',
                    dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date',
                    description: task.description || 'No description provided.',
                    assignedBy: user.name || 'System'
                }
            });
            notificationResult = triggerResult?.notificationResult;
        }

        if (task.projectId) {
            await this.updateProjectAndModuleProgress(task.projectId, task.moduleId);
        }

        const companyId = requestContext.getStore()?.companyId as string;
        if (companyId) {
            emitSocket(companyId, 'task:created', { task });
        }

        return { task, notificationResult };
    }

    static async getTaskById(taskId: string) {
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
                assignee: { select: { id: true, name: true, email: true, photoUrl: true, role: true } },
                creator: { select: { id: true, name: true, email: true, photoUrl: true, role: true } },
                project: { select: { id: true, name: true, status: true, description: true, progress: true } },
                module: { select: { id: true, title: true } },
                workLogs_TaskWorkLogs: {
                    orderBy: { workDate: 'desc' },
                    include: {
                        user: { select: { id: true, name: true, photoUrl: true } }
                    }
                }
            }
        });

        if (!task) throw new Error('Task not found');

        const mappedTask: any = {
            ...task,
            project: task.project ? { id: task.project.id, name: task.project.name, status: task.project.status, description: task.project.description, progress: task.project.progress } : null,
            module: task.module ? { id: task.module.id, name: task.module.title } : null,
            assignee: task.assignee ? { id: task.assignee.id, name: task.assignee.name, email: task.assignee.email, photoUrl: task.assignee.photoUrl, role: task.assignee.role } : null,
            creator: task.creator ? { id: task.creator.id, name: task.creator.name, email: task.creator.email, photoUrl: task.creator.photoUrl, role: task.creator.role } : null,
        };

        const attachments = await prisma.document.findMany({
            where: { relatedId: task.id, relatedModel: 'Task' }
        });
        mappedTask.attachments = attachments || [];

        return { task: mappedTask };
    }

    static async updateTask(taskId: string, data: any, user: UserContext) {
        const body = { ...data };
        if (body.projectId) {
            body.clientId = null;
        }

        const oldTask = await prisma.task.findUnique({ where: { id: taskId } });
        if (!oldTask) throw new Error('Task not found');

        const isAdmin = ['admin', 'manager', 'ceo'].includes(user.role || '');
        const isCreator = oldTask.creatorId?.toString() === user.id.toString();
        const isAssignee = oldTask.assigneeId?.toString() === user.id.toString();

        let isModuleOwner = false;
        if (oldTask.moduleId) {
            const mod = await prisma.module.findUnique({ where: { id: oldTask.moduleId } });
            if (mod && mod.ownerId?.toString() === user.id.toString()) {
                isModuleOwner = true;
            }
        }

        if (!isAdmin && !isCreator && !isAssignee && !isModuleOwner) {
            throw new Error('Access denied. You do not have permission to edit this task.');
        }

        const updateData: any = {};
        const allowedFields = ['title', 'description', 'status', 'priority', 'dueDate', 'estimatedHours', 'projectId', 'moduleId', 'assigneeId', 'voiceMessageUrl', 'attachments', 'clientId'];
        allowedFields.forEach(f => {
            if (body[f] !== undefined) {
                if (f === 'dueDate') {
                    updateData[f] = body[f] ? new Date(body[f]) : null;
                } else if (f === 'estimatedHours') {
                    updateData[f] = parseInt(body[f], 10) || 0;
                } else {
                    if (body[f] === '' || body[f] === 'undefined' || body[f] === 'null') {
                        updateData[f] = null;
                    } else {
                        updateData[f] = body[f];
                    }
                }
            }
        });

        if (updateData.projectId !== undefined) {
            if (updateData.projectId) {
                updateData.project = { connect: { id: updateData.projectId } };
            } else {
                updateData.project = { disconnect: true };
            }
            delete updateData.projectId;
        }

        if (updateData.assigneeId !== undefined) {
            if (updateData.assigneeId) {
                updateData.assignee = { connect: { id: updateData.assigneeId } };
            } else {
                updateData.assignee = { disconnect: true };
            }
            delete updateData.assigneeId;
        }

        if (updateData.moduleId !== undefined) {
            if (updateData.moduleId) {
                updateData.module = { connect: { id: updateData.moduleId } };
            } else {
                updateData.module = { disconnect: true };
            }
            delete updateData.moduleId;
        }

        if (updateData.clientId !== undefined) {
            if (updateData.clientId) {
                updateData.client = { connect: { id: updateData.clientId } };
            } else {
                updateData.client = { disconnect: true };
            }
            delete updateData.clientId;
        }

        const task = await prisma.task.update({
            where: { id: taskId },
            data: updateData,
            include: {
                assignee: { select: { id: true, name: true, email: true, photoUrl: true, role: true } },
                creator: { select: { id: true, name: true, email: true, photoUrl: true, role: true } },
                project: { select: { id: true, name: true, status: true, description: true, progress: true } }
            }
        });

        if (logAction) {
            await logAction(user.id, 'UPDATE_TASK', 'task', task.id, { title: task.title, projectId: task.projectId, assignee: task.assignee?.name, status: task.status, priority: task.priority, changes: Object.keys(updateData) });
        }

        let notificationResult = null;
        if (data.assigneeId && data.assigneeId !== oldTask.assigneeId?.toString() && triggerAutomation) {
            const project = task.projectId ? await prisma.project.findUnique({ where: { id: task.projectId }, select: { name: true } }) : null;
            const companyId = requestContext.getStore()?.companyId as string || (user as any).companyId;
            const triggerResult = await triggerAutomation({
                eventType: 'task_assigned',
                triggeredBy: user.id,
                targetUser: data.assigneeId,
                companyId: companyId,
                relatedItem: { itemId: task.id, itemModel: 'Task' },
                description: `You were reassigned to task: ${task.title}`,
                sendEmailNotification: data.sendEmailNotification !== false,
                metadata: {
                    taskName: task.title,
                    taskTitle: task.title,
                    projectName: project ? project.name : (task.projectId ? 'Loading...' : 'Personal'),
                    priority: task.priority || 'medium',
                    dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date',
                    description: task.description || 'No description provided.',
                    assignedBy: user.name || 'System'
                }
            });
            notificationResult = triggerResult?.notificationResult;
        }

        if (data.status === 'done' && oldTask.status !== 'done') {
            const now = new Date();
            const isOnTime = oldTask.dueDate ? now <= new Date(oldTask.dueDate) : true;
            
            await prisma.task.update({
                where: { id: taskId },
                data: {
                    completedAt: now,
                    updatedAt: now
                }
            });

            if (triggerAutomation) {
                const companyId = requestContext.getStore()?.companyId as string || (user as any).companyId;
                await triggerAutomation({
                    eventType: 'task_completed',
                    triggeredBy: user.id,
                    companyId: companyId,
                    relatedItem: { itemId: task.id, itemModel: 'Task' },
                    description: `Task "${task.title}" has been completed! +1 achievement point awarded.`,
                    metadata: { taskName: task.title, completedOnTime: isOnTime }
                });
            }

            if (oldTask.assigneeId && (oldTask.estimatedHours || 0) > 0) {
                const existingLog = await prisma.timeLog.findFirst({
                    where: {
                        userId: oldTask.assigneeId,
                        taskId: oldTask.id,
                        description: { contains: 'Auto-logged' }
                    }
                });

                if (!existingLog) {
                    const hours = oldTask.estimatedHours;
                    const end = new Date();
                    const start = new Date(end.getTime() - (hours * 3600000));
                    
                    await prisma.timeLog.create({
                        data: {
                            userId: oldTask.assigneeId,
                            projectId: oldTask.projectId,
                            taskId: oldTask.id,
                            description: `Auto-logged on task completion (Estimated: ${hours}h)`,
                            startTime: start,
                            endTime: end,
                            durationMinutes: Math.round(hours * 60),
                            date: start.toISOString().split('T')[0],
                            status: 'stopped',
                        }
                    });
                }
            }
        }

        if (task.projectId) {
            await this.updateProjectAndModuleProgress(task.projectId, task.moduleId);
            if (oldTask.moduleId && oldTask.moduleId.toString() !== task.moduleId?.toString()) {
                await this.updateProjectAndModuleProgress(null, oldTask.moduleId);
            }
        }

        const companyId = requestContext.getStore()?.companyId as string;
        if (companyId) {
            emitSocket(companyId, 'task:updated', { task });
        }

        return { task, notificationResult };
    }
    static async addAttachments(taskId: string, urls: string[], user: UserContext) {
        if (!urls || urls.length === 0) return { success: true };

        const task = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!task) throw new Error('Task not found');

        // Note: the schema defines attachments as String[] on Task,
        // although Document records are sometimes fetched instead.
        // We will append to the native attachments array.
        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: {
                attachments: {
                    push: urls
                }
            }
        });

        const companyId = requestContext.getStore()?.companyId as string;
        if (companyId) {
            emitSocket(companyId, 'task:updated', { task: updatedTask });
        }

        return { task: updatedTask };
    }

    static async deleteTask(taskId: string, user: UserContext) {
        const task = await prisma.task.update({
            where: { id: taskId },
            data: { deletedAt: new Date() }
        });
        if (task && task.projectId) {
            await this.updateProjectAndModuleProgress(task.projectId, task.moduleId);
        }
        if (logAction) {
            await logAction(user.id, 'DELETE_TASK', 'task', taskId, { title: task.title });
        }

        const companyId = requestContext.getStore()?.companyId as string;
        if (companyId) {
            emitSocket(companyId, 'task:deleted', { taskId });
        }

        return { message: 'Task deleted' };
    }

    static async bulkDeleteTasks(taskIds: string[], user: UserContext) {
        if (!Array.isArray(taskIds) || taskIds.length === 0) {
            return { count: 0, message: 'No task IDs provided' };
        }

        const tasksToUpdate = await prisma.task.findMany({
            where: { id: { in: taskIds } },
            select: { id: true, projectId: true, moduleId: true, title: true }
        });

        await prisma.task.updateMany({
            where: { id: { in: taskIds } },
            data: { deletedAt: new Date() }
        });

        // Recalculate progress for affected projects/modules
        const affectedProjectIds = Array.from(new Set(tasksToUpdate.map(t => t.projectId).filter(Boolean)));
        const affectedModuleIds = Array.from(new Set(tasksToUpdate.map(t => t.moduleId).filter(Boolean)));

        for (const projId of affectedProjectIds) {
            await this.updateProjectAndModuleProgress(projId as string, null);
        }
        for (const modId of affectedModuleIds) {
            await this.updateProjectAndModuleProgress(null, modId as string);
        }

        const companyId = requestContext.getStore()?.companyId as string;
        if (companyId) {
            emitSocket(companyId, 'tasks:bulk-deleted', { taskIds });
        }

        if (logAction) {
            await logAction(user.id, 'BULK_DELETE_TASKS', 'task', taskIds.join(','), { count: taskIds.length });
        }

        return { count: taskIds.length, message: `Successfully deleted ${taskIds.length} tasks` };
    }

    static async bulkUpdateStatus(taskIds: string[], status: string, user: UserContext) {
        if (!Array.isArray(taskIds) || taskIds.length === 0) {
            return { count: 0, message: 'No task IDs provided' };
        }

        const tasksToUpdate = await prisma.task.findMany({
            where: { id: { in: taskIds } },
            select: { id: true, projectId: true, moduleId: true, title: true, status: true }
        });

        await prisma.task.updateMany({
            where: { id: { in: taskIds } },
            data: { status }
        });

        // Recalculate progress for affected projects/modules
        const affectedProjectIds = Array.from(new Set(tasksToUpdate.map(t => t.projectId).filter(Boolean)));
        const affectedModuleIds = Array.from(new Set(tasksToUpdate.map(t => t.moduleId).filter(Boolean)));

        for (const projId of affectedProjectIds) {
            await this.updateProjectAndModuleProgress(projId as string, null);
        }
        for (const modId of affectedModuleIds) {
            await this.updateProjectAndModuleProgress(null, modId as string);
        }

        const companyId = requestContext.getStore()?.companyId as string;
        if (companyId) {
            emitSocket(companyId, 'tasks:bulk-status-updated', { taskIds, status });
        }

        return { count: taskIds.length, message: `Successfully updated ${taskIds.length} tasks to ${status}` };
    }

    static async updateProjectAndModuleProgress(projectId: string | null, moduleId: string | null) {
        try {
            if (projectId) {
                const tasks = await prisma.task.findMany({
                    where: { projectId, deletedAt: null }
                });
                const total = tasks.length;
                const completed = tasks.filter((t: any) => t.status === 'done').length;
                const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
                await prisma.project.update({
                    where: { id: projectId },
                    data: { progress }
                });
            }
            if (moduleId) {
                const tasks = await prisma.task.findMany({
                    where: { moduleId, deletedAt: null }
                });
                const total = tasks.length;
                const completed = tasks.filter((t: any) => t.status === 'done').length;
                const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
                // await prisma.module.update({
                //     where: { id: moduleId },
                //     data: { progress }
                // });
            }
        } catch (err: any) {
            console.error('Error updating progress:', err.message);
        }
    }
}


