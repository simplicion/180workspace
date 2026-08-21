import { prisma } from '@workspace/db';
import { logAction, triggerAutomation, emitSocket } from '@workspace/backend-infra';

export interface UserContext {
    id: string;
    role?: string;
    roles?: string[];
    companyId?: string;
    name?: string;
}

export class TaskService {
    static async getTasks(
        { projectId, assigneeId, moduleId, status, page = 1, limit = 100 }: any,
        user: UserContext
    ) {
        const query: any = { deletedAt: null };
        if (projectId) query.projectId = projectId;
        if (assigneeId) query.assigneeId = assigneeId;
        if (moduleId) query.moduleId = moduleId;
        if (status) query.status = status;

        const userRoles = user.roles || [user.role || 'employee'];
        const isAdminOrCeo = userRoles.includes('admin') || userRoles.includes('ceo');

        if (!isAdminOrCeo) {
            query.assigneeId = user.id;
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [tasks, total] = await Promise.all([
            prisma.task.findMany({
                where: query,
                include: {
                    assignee: { select: { id: true, name: true, email: true, photoUrl: true } },
                    project: { select: { id: true, name: true, status: true } }
                },
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

        if (body.dueDate && !body.estimatedHours) {
            const now = new Date();
            const due = new Date(body.dueDate);
            const diffMs = due.getTime() - now.getTime();
            body.estimatedHours = diffMs > 0 ? Math.round(diffMs / (1000 * 60 * 60)) : 0;
        }

        const allowedFields = ['title', 'description', 'status', 'priority', 'dueDate', 'estimatedHours', 'projectId', 'moduleId', 'assigneeId', 'creatorId', 'voiceMessageUrl', 'attachments'];
        const cleanData: any = {};
        allowedFields.forEach(f => {
            if (body[f] !== undefined) {
                if (f === 'dueDate') {
                    cleanData[f] = new Date(body[f]);
                } else if (f === 'estimatedHours') {
                    cleanData[f] = parseInt(body[f], 10) || 0;
                } else {
                    cleanData[f] = body[f];
                }
            }
        });

        const task = await prisma.task.create({
            data: cleanData,
            include: {
                assignee: { select: { id: true, name: true, email: true, photoUrl: true } },
                project: { select: { id: true, name: true, status: true, description: true, progress: true } }
            }
        });

        if (logAction) {
            await logAction(user.id, 'CREATE_TASK', 'task', task.id, { title: task.title, projectId: task.projectId, assignee: task.assignee?.name, status: task.status, priority: task.priority });
        }

        let notificationResult = null;
        if (task.assigneeId && triggerAutomation) {
            const project = task.projectId ? await prisma.project.findUnique({ where: { id: task.projectId }, select: { name: true } }) : null;
            const triggerResult = await triggerAutomation({
                eventType: 'task_assigned',
                triggeredBy: user.id,
                targetUser: task.assigneeId,
                relatedItem: { itemId: task.id, itemModel: 'Task' },
                description: `You were assigned to task: ${task.title}`,
                sendEmailNotification: data.sendEmailNotification !== false,
                metadata: {
                    taskName: task.title,
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

        if (user.companyId) {
            emitSocket(user.companyId, 'task:created', { task });
        }

        return { task, notificationResult };
    }

    static async getTaskById(taskId: string) {
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
                assignee: { select: { id: true, name: true, email: true, photoUrl: true } },
                creator: { select: { id: true, name: true, email: true, photoUrl: true } },
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
            assignee: task.assignee ? { id: task.assignee.id, name: task.assignee.name, photoUrl: task.assignee.photoUrl } : null,
        };

        const attachments = await prisma.document.findMany({
            where: { relatedId: task.id, relatedModel: 'Task' }
        });
        mappedTask.attachments = attachments || [];

        return { task: mappedTask };
    }

    static async updateTask(taskId: string, data: any, user: UserContext) {
        const oldTask = await prisma.task.findUnique({ where: { id: taskId } });
        if (!oldTask) throw new Error('Task not found');

        const isAdmin = ['admin', 'manager'].includes(user.role || '');
        const isCreator = false; // oldTask.createdBy not in schema
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

        if (data.status && data.status !== oldTask.status && oldTask.status === 'in_review') {
            throw new Error('Cannot change status of a task that is currently in review. It must be approved or rejected via work logs.');
        }

        const updateData: any = {};
        const allowedFields = ['title', 'description', 'status', 'priority', 'dueDate', 'estimatedHours', 'projectId', 'moduleId', 'assigneeId', 'voiceMessageUrl', 'attachments'];
        allowedFields.forEach(f => {
            if (data[f] !== undefined) {
                if (f === 'dueDate') {
                    updateData[f] = new Date(data[f]);
                } else if (f === 'estimatedHours') {
                    updateData[f] = parseInt(data[f], 10) || 0;
                } else {
                    updateData[f] = data[f];
                }
            }
        });

        const task = await prisma.task.update({
            where: { id: taskId },
            data: updateData,
            include: {
                assignee: { select: { id: true, name: true, email: true, photoUrl: true } },
                project: { select: { id: true, name: true, status: true, description: true, progress: true } }
            }
        });

        if (logAction) {
            await logAction(user.id, 'UPDATE_TASK', 'task', task.id, { title: task.title, projectId: task.projectId, assignee: task.assignee?.name, status: task.status, priority: task.priority, changes: Object.keys(updateData) });
        }

        let notificationResult = null;
        if (data.assigneeId && data.assigneeId !== oldTask.assigneeId?.toString() && triggerAutomation) {
            const project = task.projectId ? await prisma.project.findUnique({ where: { id: task.projectId }, select: { name: true } }) : null;
            const triggerResult = await triggerAutomation({
                eventType: 'task_assigned',
                triggeredBy: user.id,
                targetUser: data.assigneeId,
                relatedItem: { itemId: task.id, itemModel: 'Task' },
                description: `You were reassigned to task: ${task.title}`,
                sendEmailNotification: data.sendEmailNotification !== false,
                metadata: {
                    taskName: task.title,
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
                    completedOnTime: isOnTime
                }
            });

            if (triggerAutomation) {
                await triggerAutomation({
                    eventType: 'task_completed',
                    triggeredBy: user.id,
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

        if (user.companyId) {
            emitSocket(user.companyId, 'task:updated', { task });
        }

        return { task, notificationResult };
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

        if (user.companyId) {
            emitSocket(user.companyId, 'task:deleted', { taskId });
        }

        return { message: 'Task deleted' };
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


