'use strict';


const { logAction } = require('../../../system-configs/middleware/audit/audit.js');
const { triggerN8nWebhook } = require('../../../platform-core/platform-integrations/webhooks/webhook.routes');
const AutomationService = require('../../../platform-core/platform-communications/services/automation.service');

exports.getProjects = async (req, res, next) => {
    try {
        const Project = req.prisma.project;
        const { search, status, page = 1, limit = 50 } = req.query;
        const query = { deletedAt: null };

        if (req.user.companyId) {
            query.companyId = req.user.companyId;
        }

        if (status) query.status = status;
        if (search) query.name = { contains: search, mode: 'insensitive' };

        const userRoles = req.user.roles || [req.user.role || 'employee'];
        const isAdminOrCeo = userRoles.includes('admin') || userRoles.includes('ceo') || userRoles.includes('BMSP_SUPER_ADMIN') || userRoles.includes('BMSP_ADMIN');

        if (!isAdminOrCeo) {
            query.OR = [
                { ownerId: req.user.id },
                { memberIds: { has: req.user.id } },
                { tasks: { some: { assigneeId: req.user.id } } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [projects, total] = await Promise.all([
            Project.findMany({
                where: query,
                orderBy: { updatedAt: 'desc' },
                skip: skip,
                take: Number(limit)
            }),
            Project.count({ where: query }),
        ]);

        // Mongoose used to populate memberIds directly. Since it's a String array in Prisma, we need to fetch them manually.
        const allMemberIds = [...new Set(projects.flatMap(p => p.memberIds || []))];
        const allOwnerIds = [...new Set(projects.map(p => p.ownerId).filter(Boolean))];
        const userIdsToFetch = [...new Set([...allMemberIds, ...allOwnerIds])];
        let usersMap = {};
        if (userIdsToFetch.length > 0) {
            const users = await req.prisma.user.findMany({
                where: { id: { in: userIdsToFetch } },
                select: { id: true, name: true, email: true, photoUrl: true, role: true }
            });
            usersMap = users.reduce((acc, u) => { acc[u.id] = u; return acc; }, {});
        }

        const projectIds = projects.map(p => p.id);
        
        const [taskStatsByProject, allModules] = await Promise.all([
            req.prisma.task.groupBy({
                by: ['projectId', 'status'],
                where: { projectId: { in: projectIds }, deletedAt: null },
                _count: { _all: true }
            }),
            req.prisma.module.groupBy({
                by: ['projectId'],
                where: { projectId: { in: projectIds } },
                _count: { _all: true }
            })
        ]);
        
        // Aggregate task stats from the groupBy results
        const taskMap = {};
        taskStatsByProject.forEach(row => {
            if (!taskMap[row.projectId]) taskMap[row.projectId] = { _id: row.projectId, totalTasks: 0, completedTasks: 0 };
            taskMap[row.projectId].totalTasks += row._count._all;
            if (row.status === 'done') taskMap[row.projectId].completedTasks += row._count._all;
        });
        const moduleStatsMap = allModules.reduce((acc, stat) => {
            acc[stat.projectId] = stat._count._all;
            return acc;
        }, {});

        const projectsWithStats = projects.map(p => ({
            ...p,
            _id: p.id,
            owner: usersMap[p.ownerId] || null,
            client: null,
            members: (p.memberIds || []).map(id => usersMap[id]).filter(Boolean),
            taskStats: taskMap[p.id] || { totalTasks: 0, completedTasks: 0 },
            totalModules: moduleStatsMap[p.id] || 0
        }));

        res.json({ projects: projectsWithStats, total, page: Number(page) });
    } catch (err) { next(err); }
};

exports.createProject = async (req, res, next) => {
    try {
        const Project = req.prisma.project;
        
        const {
            name, description, status, priority,
            deadline, startDate, tags, memberIds, ownerId, clientIds,
            budget, projectType, billingType, visibility
        } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Project name is required' });
        }

        const data = {
            name,
            description,
            status,
            priority,
            startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
            deadline: deadline ? new Date(deadline).toISOString() : null,
            budget: budget ? parseFloat(budget) : 0,
            projectType: projectType || 'internal',
            billingType: billingType || 'non_billable',
            visibility: visibility || 'public',
            tags: Array.isArray(tags) ? tags : [],
            memberIds: Array.isArray(memberIds) ? memberIds.filter(id => id !== null && id !== undefined && id !== '') : [],
            clientIds: Array.isArray(clientIds) ? clientIds : [],
            ownerId: ownerId || req.user.id,
            companyId: req.user.companyId
        };

        const project = await Project.create({ data });
        project._id = project.id;
        
        await logAction(req.user.id, 'CREATE_PROJECT', 'project', project.id, { name: project.name }, req);

        if (project.memberIds && project.memberIds.length > 0) {
            for (const memberId of project.memberIds) {
                await AutomationService.trigger({
                    eventType: 'project_assigned',
                    triggeredBy: req.user.id,
                    targetUser: memberId,
                    relatedItem: { itemId: project.id, itemModel: 'Project' },
                    description: `You were assigned to the project: ${project.name}`,
                    metadata: { projectName: project.name }
                }, req.prisma);
            }
        }

        if (project.priority === 'Critical') {
            await triggerN8nWebhook('critical-project', {
                projectId: project.id,
                name: project.name,
                ownerId: project.ownerId
            });
        }

        res.status(201).json({ project });
    } catch (err) { next(err); }
};

exports.getProjectById = async (req, res, next) => {
    try {
        const Project = req.prisma.project;
        const project = await Project.findUnique({
            where: { id: req.params.id }
        });
        
        if (!project) return res.status(404).json({ error: 'Project not found' });
        project._id = project.id;

        // Manual populate members
        let members = [];
        let owner = null;

        const allMemberIds = [...new Set(project.memberIds || [])];
        const allOwnerIds = project.ownerId ? [project.ownerId] : [];
        const userIdsToFetch = [...new Set([...allMemberIds, ...allOwnerIds])];
        
        let usersMap = {};
        if (userIdsToFetch.length > 0) {
            const users = await req.prisma.user.findMany({
                where: { id: { in: userIdsToFetch } },
                select: { id: true, name: true, email: true, photoUrl: true, role: true, designation: true }
            });
            usersMap = users.reduce((acc, u) => { acc[u.id] = u; return acc; }, {});
        }
        
        project.members = (project.memberIds || []).map(id => usersMap[id]).filter(Boolean);
        project.owner = usersMap[project.ownerId] || null;
        project.client = null;

        const Task = req.prisma.task;
        const Module = req.prisma.module;
        
        const [tasks, moduleCount] = await Promise.all([
            Task.findMany({
                where: { projectId: project.id, deletedAt: null },
                select: { status: true }
            }),
            Module.count({ where: { projectId: project.id } })
        ]);

        const completedTasks = tasks.filter(t => t.status === 'done').length;

        project.taskStats = {
            totalTasks: tasks.length,
            completedTasks: completedTasks
        };
        project.totalModules = moduleCount;

        res.json({ project });
    } catch (err) { next(err); }
};

exports.updateProject = async (req, res, next) => {
    try {
        const Project = req.prisma.project;
        const oldProject = await Project.findUnique({ where: { id: req.params.id } });
        if (!oldProject) return res.status(404).json({ error: 'Project not found' });

        const isAdmin = ['admin', 'manager', 'BMSP_SUPER_ADMIN'].includes(req.user.role);
        const isOwner = oldProject.ownerId === req.user.id;

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ error: 'Access denied. Only the project owner or administrator can modify project details.' });
        }

        const data = { ...req.body };
        if (data.startDate) data.startDate = new Date(data.startDate).toISOString();
        if (data.deadline) data.deadline = new Date(data.deadline).toISOString();
        if (data.memberIds && Array.isArray(data.memberIds)) {
            data.memberIds = data.memberIds.filter(id => id !== null && id !== undefined && id !== '');
        }
        if (data.customTaskStatusName !== undefined) {
            data.customTaskStatusName = data.customTaskStatusName;
        }

        const project = await Project.update({
            where: { id: req.params.id },
            data
        });
        project._id = project.id;

        if (req.body.status && req.body.status !== oldProject.status) {
            await AutomationService.trigger({
                eventType: 'project_status_changed',
                triggeredBy: req.user.id,
                relatedItem: { itemId: project.id, itemModel: 'Project' },
                description: `Project status changed to ${req.body.status}`,
                metadata: { projectName: project.name, newStatus: req.body.status }
            }, req.prisma);
        }

        await logAction(req.user.id, 'UPDATE_PROJECT', 'project', project.id, {}, req);
        res.json({ project });
    } catch (err) { next(err); }
};

exports.deleteProject = async (req, res, next) => {
    try {
        const Project = req.prisma.project;
        const Task = req.prisma.task;
        const project = await Project.findUnique({ where: { id: req.params.id } });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        if (!['admin', 'manager', 'BMSP_SUPER_ADMIN'].includes(req.user.role) && project.ownerId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied.' });
        }

        await Project.delete({ where: { id: req.params.id } });
        await Task.updateMany({ where: { projectId: req.params.id }, data: { deletedAt: new Date() } });

        await logAction(req.user.id, 'DELETE_PROJECT', 'project', req.params.id, {}, req);
        res.json({ message: 'Project and associated tasks deleted' });
    } catch (err) { next(err); }
};

exports.updateMembers = async (req, res, next) => {
    try {
        const Project = req.prisma.project;
        const { memberIds } = req.body;
        const oldProject = await Project.findUnique({ where: { id: req.params.id } });
        if (!oldProject) return res.status(404).json({ error: 'Project not found' });

        const project = await Project.update({
            where: { id: req.params.id },
            data: { memberIds }
        });

        let members = [];
        if (project.memberIds && project.memberIds.length > 0) {
            members = await req.prisma.user.findMany({
                where: { id: { in: project.memberIds } },
                select: { id: true, name: true, email: true, photoUrl: true, role: true }
            });
        }
        project.members = members;
        project._id = project.id;

        const oldMemberIds = oldProject.memberIds || [];
        const newMemberIds = memberIds.filter(id => !oldMemberIds.includes(id));

        if (newMemberIds.length > 0) {
            for (const memberId of newMemberIds) {
                await AutomationService.trigger({
                    eventType: 'project_assigned',
                    triggeredBy: req.user.id,
                    targetUser: memberId,
                    relatedItem: { itemId: project.id, itemModel: 'Project' },
                    description: `You were added to project: ${project.name}`,
                    metadata: { projectName: project.name }
                }, req.prisma);
            }
        }

        res.json({ project });
    } catch (err) { next(err); }
};

exports.updateClients = async (req, res, next) => {
    try {
        const Project = req.prisma.project;
        const { clientIds } = req.body;
        const project = await Project.update({
            where: { id: req.params.id },
            data: { clientIds }
        });
        project._id = project.id;

        res.json({ project });
    } catch (err) { next(err); }
};

exports.getProjectTasks = async (req, res, next) => {
    try {
        const Task = req.prisma.task;
        const tasks = await Task.findMany({
            where: { projectId: req.params.id, deletedAt: null },
            include: { assignee: { select: { id: true, name: true, email: true, photoUrl: true } } },
            orderBy: { createdAt: 'desc' }
        });
        tasks.forEach(t => t._id = t.id);
        res.json({ tasks });
    } catch (err) { next(err); }
};

exports.getProjectActivity = async (req, res, next) => {
    try {
        const projectId = req.params.id;

        // Get all task IDs and module IDs for this project
        const tasks = await req.prisma.task.findMany({
            where: { projectId, deletedAt: null },
            select: { id: true, title: true }
        });
        const modules = await req.prisma.module.findMany({
            where: { projectId },
            select: { id: true, title: true }
        });
        const taskIds = tasks.map(t => t.id);
        const moduleIds = modules.map(m => m.id);

        // Build lookup maps for resource names
        const taskMap = {};
        tasks.forEach(t => { taskMap[t.id] = t.title; });
        const moduleMap = {};
        modules.forEach(m => { moduleMap[m.id] = m.title; });

        // Fetch audit logs for this project + its tasks + its modules
        const resourceFilters = [
            { resourceType: 'project', resourceId: projectId }
        ];
        if (taskIds.length > 0) {
            resourceFilters.push({ resourceType: 'task', resourceId: { in: taskIds } });
        }
        if (moduleIds.length > 0) {
            resourceFilters.push({ resourceType: 'module', resourceId: { in: moduleIds } });
        }

        const auditLogs = await req.prisma.auditLog.findMany({
            where: { OR: resourceFilters },
            include: {
                user: { select: { id: true, name: true, email: true, photoUrl: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 200
        });

        // Fetch time logs for this project
        const timeLogs = await req.prisma.timeLog.findMany({
            where: { projectId },
            include: {
                user: { select: { id: true, name: true, email: true, photoUrl: true } },
                task: { select: { id: true, title: true } }
            },
            orderBy: { startTime: 'desc' }
        });

        // Format audit logs into activity items
        const actionLabels = {
            'CREATE_PROJECT': 'Created project',
            'UPDATE_PROJECT': 'Updated project',
            'DELETE_PROJECT': 'Deleted project',
            'CREATE_TASK': 'Created task',
            'UPDATE_TASK': 'Updated task',
            'DELETE_TASK': 'Deleted task',
            'CREATE_MODULE': 'Created module',
            'UPDATE_MODULE': 'Updated module',
            'DELETE_MODULE': 'Deleted module',
            'CREATE_NOTE': 'Added note',
            'UPDATE_NOTE': 'Updated note',
            'DELETE_NOTE': 'Deleted note',
            'ASSIGN_TASK': 'Assigned task',
            'SUBMIT_WORKLOG': 'Submitted work log',
            'REVIEW_WORKLOG': 'Reviewed work log'
        };

        const activities = auditLogs.map(log => {
            const details = typeof log.details === 'string' ? JSON.parse(log.details) : (log.details || {});
            let resourceName = details.title || details.name || '';
            
            // If no name in details, try lookup maps
            if (!resourceName && log.resourceType === 'task') {
                resourceName = taskMap[log.resourceId] || '';
            }
            if (!resourceName && log.resourceType === 'module') {
                resourceName = moduleMap[log.resourceId] || '';
            }

            return {
                id: log.id,
                type: 'audit',
                action: log.action,
                actionLabel: actionLabels[log.action] || log.action,
                resourceType: log.resourceType,
                resourceId: log.resourceId,
                resourceName,
                user: log.user,
                details,
                timestamp: log.createdAt
            };
        });

        // Format time logs into activity items
        const timeActivities = timeLogs.map(tl => ({
            id: tl.id,
            type: 'timelog',
            action: 'TIME_LOG',
            actionLabel: 'Logged time',
            resourceType: 'task',
            resourceId: tl.taskId,
            resourceName: tl.task?.title || '',
            user: tl.user,
            details: {
                description: tl.description,
                durationMinutes: tl.durationMinutes,
                hours: (tl.durationMinutes / 60).toFixed(1),
                startTime: tl.startTime,
                endTime: tl.endTime,
                status: tl.status
            },
            timestamp: tl.startTime
        }));

        // Merge and sort by timestamp descending
        const allActivities = [...activities, ...timeActivities]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Summary stats
        const totalTimeLogged = timeLogs.reduce((acc, tl) => acc + (tl.durationMinutes || 0), 0);

        res.json({
            success: true,
            activities: allActivities,
            summary: {
                totalActivities: allActivities.length,
                totalTimeLoggedMinutes: totalTimeLogged,
                totalTimeLoggedHours: (totalTimeLogged / 60).toFixed(1)
            }
        });
    } catch (err) { next(err); }
};

exports.getProjectNotes = async (req, res, next) => {
    try {
        const Note = req.prisma.note;
        if (!Note) return res.json({ notes: [] });

        const notes = await Note.findMany({
            where: { relatedType: 'project', relatedId: req.params.id },
            include: { createdBy: { select: { id: true, name: true, email: true, photoUrl: true, role: true } } },
            orderBy: { createdAt: 'desc' }
        });
        notes.forEach(n => { n._id = n.id; });
        res.json({ notes });
    } catch (err) { next(err); }
};

exports.createProjectNote = async (req, res, next) => {
    try {
        const Note = req.prisma.note;
        if (!Note) return res.status(400).json({ error: 'Notes feature not supported in current DB version' });

        const note = await Note.create({
            data: {
                content: req.body.content,
                relatedType: 'project',
                relatedId: req.params.id,
                createdById: req.user.id,
            },
            include: { createdBy: { select: { id: true, name: true, email: true, photoUrl: true, role: true } } }
        });
        
        note._id = note.id;

        await logAction(req.user.id, 'CREATE_NOTE', 'project', req.params.id, {}, req);
        res.status(201).json({ note });
    } catch (err) { next(err); }
};

exports.updateProjectNote = async (req, res, next) => {
    try {
        const Note = req.prisma.note;
        if (!Note) return res.status(400).json({ error: 'Notes feature not supported' });

        const note = await Note.findUnique({ where: { id: req.params.noteId } });
        if (!note) return res.status(404).json({ error: 'Note not found' });

        if (note.createdById !== req.user.id && !['admin', 'manager', 'BMSP_SUPER_ADMIN'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Not authorized to edit this note' });
        }

        const updatedNote = await Note.update({
            where: { id: req.params.noteId },
            data: { content: req.body.content },
            include: { createdBy: { select: { id: true, name: true, email: true, photoUrl: true, role: true } } }
        });

        updatedNote._id = updatedNote.id;

        await logAction(req.user.id, 'UPDATE_NOTE', 'project', req.params.id, {}, req);
        res.json({ note: updatedNote });
    } catch (err) { next(err); }
};

exports.deleteProjectNote = async (req, res, next) => {
    try {
        const Note = req.prisma.note;
        if (!Note) return res.status(400).json({ error: 'Notes feature not supported' });

        const note = await Note.findUnique({ where: { id: req.params.noteId } });
        if (!note) return res.status(404).json({ error: 'Note not found' });

        if (note.createdById !== req.user.id && !['admin', 'manager', 'BMSP_SUPER_ADMIN'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Not authorized to delete this note' });
        }

        await Note.delete({ where: { id: req.params.noteId } });

        await logAction(req.user.id, 'DELETE_NOTE', 'project', req.params.id, {}, req);
        res.json({ message: 'Note deleted successfully' });
    } catch (err) { next(err); }
};
