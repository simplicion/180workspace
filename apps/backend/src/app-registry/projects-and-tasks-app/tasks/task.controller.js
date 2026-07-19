'use strict';

const EmailService = require('../../productivity-tools-app/emails/email.service');
const { logAction } = require('../../../system-configs/middleware/audit/audit.js');
const AutomationService = require('../../../platform-core/platform-communications/services/automation.service');
const { getIo } = require('../../../system-configs/sockets');

exports.getTasks = async (req, res, next) => {
    try {
        const Task = req.prisma.task;
        const { projectId, assigneeId, moduleId, status, page = 1, limit = 100 } = req.query;
        
        const query = { deletedAt: null };
        if (projectId) query.projectId = projectId;
        if (assigneeId) query.assigneeId = assigneeId;
        if (moduleId) query.moduleId = moduleId;
        if (status) query.status = status;
        const userRoles = req.user.roles || [req.user.role || 'employee'];
        const isAdminOrCeo = userRoles.includes('admin') || userRoles.includes('ceo');

        if (!isAdminOrCeo) {
            query.assigneeId = req.user.id;
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [tasks, total] = await Promise.all([
            Task.findMany({
                where: query,
                include: {
                    assignee: {
                        select: { id: true, name: true, email: true, photoUrl: true }
                    },
                    project: {
                        select: { id: true, name: true, status: true }
                    }
                },
                orderBy: [
                    { dueDate: 'asc' },
                    { createdAt: 'desc' }
                ],
                skip,
                take: Number(limit)
            }),
            Task.count({ where: query })
        ]);
        const mappedTasks = tasks.map(t => ({
            ...t,
            projectId: t.project ? { id: t.projectId, name: t.project.name, status: t.project.status } : t.projectId,
            project: undefined
        }));

        res.json({ tasks: mappedTasks, total });
    } catch (err) { next(err); }
};

exports.createTask = async (req, res, next) => {
    try {
        const Task = req.prisma.task;
        const Project = req.prisma.project;

        const body = { ...req.body, creatorId: req.user.id };

        // Auto-calculate estimatedHours from now â†’ dueDate if dueDate provided
        if (body.dueDate && !body.estimatedHours) {
            const now = new Date();
            const due = new Date(body.dueDate);
            const diffMs = due.getTime() - now.getTime();
            body.estimatedHours = diffMs > 0 ? Math.round(diffMs / (1000 * 60 * 60)) : 0;
        }

        // Clean extra properties not in DB schema
        const allowedFields = ['title', 'description', 'status', 'priority', 'dueDate', 'estimatedHours', 'projectId', 'moduleId', 'assigneeId', 'creatorId', 'voiceMessageUrl', 'attachments'];
        const data = {};
        allowedFields.forEach(f => {
            if (body[f] !== undefined) {
                if (f === 'dueDate') {
                    data[f] = new Date(body[f]);
                } else if (f === 'estimatedHours') {
                    data[f] = parseInt(body[f], 10) || 0;
                } else {
                    data[f] = body[f];
                }
            }
        });

        const task = await Task.create({
            data,
            include: {
                assignee: { select: { id: true, name: true, email: true, photoUrl: true } },
                project: { select: { id: true, name: true, status: true, description: true, progress: true } }
            }
        });

        await logAction(req.user.id, 'CREATE_TASK', 'task', task.id, { title: task.title, projectId: task.projectId, assignee: task.assignee?.name, status: task.status, priority: task.priority }, req);

        let notificationResult = null;
        if (task.assigneeId && task.assigneeId.toString() !== req.user.id.toString()) {
            const project = task.projectId ? await Project.findUnique({ where: { id: task.projectId }, select: { name: true } }) : null;
            const triggerResult = await AutomationService.trigger({
                eventType: 'task_assigned',
                triggeredBy: req.user.id,
                targetUser: task.assigneeId,
                relatedItem: { itemId: task.id, itemModel: 'Task' },
                description: `You were assigned to task: ${task.title}`,
                sendEmailNotification: req.body.sendEmailNotification !== false,
                metadata: { 
                    taskName: task.title, 
                    projectName: project ? project.name : 'Personal',
                    priority: task.priority || 'medium',
                    dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date',
                    description: task.description || 'No description provided.',
                    assignedBy: req.user.name || 'System'
                }
            }, req.prisma);
            notificationResult = triggerResult?.notificationResult;
        }

        if (task.projectId) {
            await updateProjectAndModuleProgress(task.projectId, task.moduleId, req.prisma);
        }

        const io = getIo();
        if (io) {
            io.to(`company:${req.user.companyId}`).emit('task:created', { task });
        }

        res.status(201).json({ 
            success: true, 
            task,
            notificationResult 
        });
    } catch (err) { next(err); }
};

exports.getTaskById = async (req, res, next) => {
    try {
        const Task = req.prisma.task;
        const Document = req.prisma.document;
        
        const task = await Task.findUnique({
            where: { id: req.params.id },
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
            
        if (!task) return res.status(404).json({ error: 'Task not found' });
        
        const mappedTask = {
            ...task,
            project: task.project ? { id: task.project.id, name: task.project.name, status: task.project.status, description: task.project.description, progress: task.project.progress } : null,
            module: task.module ? { id: task.module.id, name: task.module.title } : null,
            assignee: task.assignee ? { id: task.assignee.id, name: task.assignee.name, photoUrl: task.assignee.photoUrl } : null,
        };

        const attachments = await Document.findMany({
            where: { relatedId: task.id, relatedModel: 'Task' }
        });
        mappedTask.attachments = attachments || [];
        
        res.json({ task: mappedTask });
    } catch (err) { next(err); }
};

exports.updateTask = async (req, res, next) => {
    try {
        const Task = req.prisma.task;
        const Project = req.prisma.project;
        const oldTask = await Task.findUnique({ where: { id: req.params.id } });
        if (!oldTask) return res.status(404).json({ error: 'Task not found' });

        // IDOR Check
        const isAdmin = ['admin', 'manager'].includes(req.user.role);
        const isCreator = oldTask.createdBy?.toString() === req.user.id.toString();
        const isAssignee = oldTask.assigneeId?.toString() === req.user.id.toString();
        
        let isModuleOwner = false;
        if (oldTask.moduleId) {
            const Module = req.prisma.module;
            const mod = await Module.findUnique({ where: { id: oldTask.moduleId } });
            if (mod && mod.ownerId?.toString() === req.user.id.toString()) {
                isModuleOwner = true;
            }
        }

        if (!isAdmin && !isCreator && !isAssignee && !isModuleOwner) {
            return res.status(403).json({ error: 'Access denied. You do not have permission to edit this task.' });
        }

        const updateData = {};
        const allowedFields = ['title', 'description', 'status', 'priority', 'dueDate', 'estimatedHours', 'projectId', 'moduleId', 'assigneeId', 'voiceMessageUrl', 'attachments'];
        allowedFields.forEach(f => {
            if (req.body[f] !== undefined) {
                if (f === 'dueDate') {
                    updateData[f] = new Date(req.body[f]);
                } else if (f === 'estimatedHours') {
                    updateData[f] = parseInt(req.body[f], 10) || 0;
                } else {
                    updateData[f] = req.body[f];
                }
            }
        });

        const task = await Task.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                assignee: { select: { id: true, name: true, email: true, photoUrl: true } },
                project: { select: { id: true, name: true, status: true, description: true, progress: true } }
            }
        });

        await logAction(req.user.id, 'UPDATE_TASK', 'task', task.id, { title: task.title, projectId: task.projectId, assignee: task.assignee?.name, status: task.status, priority: task.priority, changes: Object.keys(updateData) }, req);

        // Trigger reassignment automation
        let notificationResult = null;
        if (req.body.assigneeId && req.body.assigneeId !== oldTask.assigneeId?.toString()) {
            const project = task.projectId ? await Project.findUnique({ where: { id: task.projectId }, select: { name: true } }) : null;
            const triggerResult = await AutomationService.trigger({
                eventType: 'task_assigned',
                triggeredBy: req.user.id,
                targetUser: req.body.assigneeId,
                relatedItem: { itemId: task.id, itemModel: 'Task' },
                description: `You were reassigned to task: ${task.title}`,
                sendEmailNotification: req.body.sendEmailNotification !== false, 
                metadata: { 
                    taskName: task.title, 
                    projectName: project ? project.name : (task.projectId ? 'Loading...' : 'Personal'),
                    priority: task.priority || 'medium',
                    dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date',
                    description: task.description || 'No description provided.',
                    assignedBy: req.user.name || 'System'
                }
            }, req.prisma);
            notificationResult = triggerResult?.notificationResult;
        }

        // Award point on task completion
        if (req.body.status === 'done' && oldTask.status !== 'done') {
            const now = new Date();
            const isOnTime = oldTask.dueDate ? now <= new Date(oldTask.dueDate) : true;
            
            await Task.update({
                where: { id: req.params.id },
                data: {
                    completedOnTime: isOnTime,
                    completedAt: now,
                }
            });

            if (!oldTask.pointAwarded && oldTask.assigneeId) {
                const User = req.prisma.user;
                const assignee = await User.findUnique({ where: { id: oldTask.assigneeId } });
                if (assignee) {
                    const newScore = Math.min((assignee.performanceScore || 100) + 1, 500);
                    await User.update({ where: { id: oldTask.assigneeId }, data: { performanceScore: newScore } });
                    await Task.update({ where: { id: req.params.id }, data: { pointAwarded: true } });
                }
            }

            await AutomationService.trigger({
                eventType: 'task_completed',
                triggeredBy: req.user.id,
                relatedItem: { itemId: task.id, itemModel: 'Task' },
                description: `Task "${task.title}" has been completed! +1 achievement point awarded.`,
                metadata: { taskName: task.title, completedOnTime: isOnTime }
            }, req.prisma);

            // Auto-Log Time on Completion
            if (oldTask.assigneeId && (oldTask.estimatedHours || 0) > 0) {
                const TimeLog = req.prisma.timeLog;
                const existingLog = await TimeLog.findFirst({
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
                    
                    await TimeLog.create({
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
            await updateProjectAndModuleProgress(task.projectId, task.moduleId, req.prisma);
            if (oldTask.moduleId && oldTask.moduleId.toString() !== task.moduleId?.toString()) {
                await updateProjectAndModuleProgress(null, oldTask.moduleId, req.prisma);
            }
        }

        const io = getIo();
        if (io) {
            io.to(`company:${req.user.companyId}`).emit('task:updated', { task });
        }

        res.json({ 
            success: true, 
            task,
            notificationResult
        });
    } catch (err) { next(err); }
};

exports.deleteTask = async (req, res, next) => {
    try {
        const Task = req.prisma.task;
        const task = await Task.update({
            where: { id: req.params.id },
            data: { deletedAt: new Date() }
        });
        if (task && task.projectId) {
            await updateProjectAndModuleProgress(task.projectId, task.moduleId, req.prisma);
        }
        await logAction(req.user.id, 'DELETE_TASK', 'task', req.params.id, { title: task.title }, req);

        const io = getIo();
        if (io) {
            io.to(`company:${req.user.companyId}`).emit('task:deleted', { taskId: req.params.id });
        }

        res.json({ message: 'Task deleted' });
    } catch (err) { next(err); }
};

const updateProjectAndModuleProgress = async (projectId, moduleId, prismaClient) => {
    if (!prismaClient) return;
    try {
        if (projectId) {
            const tasks = await prismaClient.task.findMany({
                where: { projectId, deletedAt: null }
            });
            const total = tasks.length;
            const completed = tasks.filter(t => t.status === 'done').length;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
            await prismaClient.project.update({
                where: { id: projectId },
                data: { progress }
            });
        }
        if (moduleId) {
            const tasks = await prismaClient.task.findMany({
                where: { moduleId, deletedAt: null }
            });
            const total = tasks.length;
            const completed = tasks.filter(t => t.status === 'done').length;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
            await prismaClient.module.update({
                where: { id: moduleId },
                data: { progress }
            });
        }
    } catch (err) {
        console.error('Error updating progress:', err.message);
    }
};

module.exports = exports;
