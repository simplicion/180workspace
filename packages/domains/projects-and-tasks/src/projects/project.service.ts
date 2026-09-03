import { prisma } from '@workspace/db';
import { logAction, triggerAutomation } from '@workspace/backend-infra';

interface UserContext {
    id: string;
    role?: string;
    companyId?: string;
}

export class ProjectService {
    static async getProjects({ query, user }: { query?: any, user: UserContext }) {
        const isAdmin = ['admin', 'manager', 'BMSP_SUPER_ADMIN'].includes(user.role || '');
        
        const filter: any = {};
        if (!isAdmin) {
            filter.OR = [
                { ownerId: user.id },
                { memberIds: { has: user.id } },
                { clientIds: { has: user.id } }
            ];
        }

        if (query?.status) filter.status = query.status;

        const projects = await prisma.project.findMany({
            where: filter,
            orderBy: { createdAt: 'desc' }
        });

        // Manually fetch owners as ownerId doesn't have a Prisma relation
        const ownerIds = [...new Set(projects.map((p: any) => p.ownerId).filter(Boolean))];
        let ownerMap: Record<string, any> = {};
        
        if (ownerIds.length > 0) {
            const owners = await prisma.user.findMany({
                where: { id: { in: ownerIds as string[] } },
                select: { id: true, name: true, photoUrl: true }
            });
            ownerMap = owners.reduce((acc: any, owner: any) => {
                acc[owner.id] = owner;
                return acc;
            }, {});
        }

        const projectsWithOwners = projects.map((p: any) => ({
            ...p,
            owner: p.ownerId ? ownerMap[p.ownerId] : null
        }));

        // Fetch clients
        const allClientIds = [...new Set(projects.flatMap((p: any) => p.clientIds || []))];
        let clientMap: Record<string, any> = {};
        
        if (allClientIds.length > 0) {
            const clients = await prisma.client.findMany({
                where: { id: { in: allClientIds as string[] } },
                select: { id: true, name: true, email: true }
            });
            clientMap = clients.reduce((acc: any, client: any) => {
                acc[client.id] = client;
                return acc;
            }, {});
        }

        const projectsWithOwnersAndClients = projectsWithOwners.map((p: any) => ({
            ...p,
            clientIds: (p.clientIds || []).map((id: string) => clientMap[id] || { id, name: 'Unknown' })
        }));

        return { projects: projectsWithOwnersAndClients };
    }

    static async createProject({ data, user }: { data: any, user: UserContext }) {
        if (!data.name) throw new Error('Project name is required');
        const project = await prisma.project.create({
            data: {
                ...data,
                ownerId: user.id,
                status: data.status || 'planning'
            }
        });

        await logAction(user.id, 'CREATE_PROJECT', 'project', project.id, {});

        await triggerAutomation({
            eventType: 'project_created',
            triggeredBy: user.id,
            relatedItem: { itemId: project.id, itemModel: 'Project' },
            description: `New project created: ${project.name}`,
            metadata: { projectName: project.name }
        });
        
        return project;
    }

    static async getProjectById(projectId: string, { user }: { user: UserContext }) {
        const project = await prisma.project.findUnique({
            where: { id: projectId }
        });
        
        if (!project) throw new Error('Project not found');

        const allMemberIds = Array.from(new Set(project.memberIds || []));
        const allOwnerIds = project.ownerId ? [project.ownerId] : [];
        const userIdsToFetch = Array.from(new Set([...allMemberIds, ...allOwnerIds]));
        
        let usersMap: any = {};
        if (userIdsToFetch.length > 0) {
            const users = await prisma.user.findMany({
                where: { id: { in: userIdsToFetch as string[] } },
                select: { id: true, name: true, email: true, photoUrl: true, role: true, designation: true }
            });
            usersMap = users.reduce((acc: any, u: any) => { acc[u.id] = u; return acc; }, {});
        }
        
        const mappedProject: any = { ...project };
        mappedProject.members = (project.memberIds || []).map((id: string) => usersMap[id]).filter(Boolean);
        mappedProject.owner = usersMap[project.ownerId] || null;
        
        const allClientIds = Array.from(new Set(project.clientIds || []));
        let clientMap: any = {};
        if (allClientIds.length > 0) {
            const clients = await prisma.client.findMany({
                where: { id: { in: allClientIds as string[] } },
                select: { id: true, name: true, email: true, companyId: true, phone: true }
            });
            clientMap = clients.reduce((acc: any, c: any) => { acc[c.id] = c; return acc; }, {});
        }
        
        // Populate clientIds with actual objects for the frontend
        mappedProject.clientIds = (project.clientIds || []).map((id: string) => clientMap[id] || { id, name: 'Unknown' });
        mappedProject.client = null;

        const [tasks, moduleCount] = await Promise.all([
            prisma.task.findMany({
                where: { projectId: project.id, deletedAt: null },
                select: { status: true }
            }),
            prisma.module.count({ where: { projectId: project.id } })
        ]);

        const completedTasks = tasks.filter((t: any) => t.status === 'done').length;

        mappedProject.taskStats = {
            totalTasks: tasks.length,
            completedTasks: completedTasks
        };
        mappedProject.totalModules = moduleCount;

        return { project: mappedProject };
    }

    static async updateProject(projectId: string, data: any, { user }: { user: UserContext }) {
        const oldProject = await prisma.project.findUnique({ where: { id: projectId } });
        if (!oldProject) throw new Error('Project not found');

        const isAdmin = ['admin', 'manager', 'BMSP_SUPER_ADMIN'].includes(user.role || '');
        const isOwner = oldProject.ownerId === user.id;

        if (!isAdmin && !isOwner) {
            throw new Error('Access denied. Only the project owner or administrator can modify project details.');
        }

        const updateData = { ...data };
        if (updateData.startDate) updateData.startDate = new Date(updateData.startDate).toISOString();
        if (updateData.deadline) updateData.deadline = new Date(updateData.deadline).toISOString();
        if (updateData.memberIds && Array.isArray(updateData.memberIds)) {
            updateData.memberIds = updateData.memberIds.filter((id: any) => id !== null && id !== undefined && id !== '');
        }

        const project = await prisma.project.update({
            where: { id: projectId },
            data: updateData
        });

        if (data.status && data.status !== oldProject.status) {
            await triggerAutomation({
                eventType: 'project_status_changed',
                triggeredBy: user.id,
                relatedItem: { itemId: project.id, itemModel: 'Project' },
                description: `Project status changed to ${data.status}`,
                metadata: { projectName: project.name, newStatus: data.status }
            });
        }

        await logAction(user.id, 'UPDATE_PROJECT', 'project', project.id, {});
        
        return { project };
    }

    static async deleteProject(projectId: string, { user }: { user: UserContext }) {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new Error('Project not found');

        if (!['admin', 'manager', 'BMSP_SUPER_ADMIN'].includes(user.role || '') && project.ownerId !== user.id) {
            throw new Error('Access denied.');
        }

        await prisma.project.delete({ where: { id: projectId } });
        await prisma.task.updateMany({ where: { projectId }, data: { deletedAt: new Date() } });

        await logAction(user.id, 'DELETE_PROJECT', 'project', projectId, {});
        
        return { message: 'Project and associated tasks deleted' };
    }

    static async updateMembers(projectId: string, memberIds: string[], { user }: { user: UserContext }) {
        const oldProject = await prisma.project.findUnique({ where: { id: projectId } });
        if (!oldProject) throw new Error('Project not found');

        const project = await prisma.project.update({
            where: { id: projectId },
            data: { memberIds }
        });

        let members = [];
        if (project.memberIds && project.memberIds.length > 0) {
            members = await prisma.user.findMany({
                where: { id: { in: project.memberIds } },
                select: { id: true, name: true, email: true, photoUrl: true, role: true }
            });
        }
        const mappedProject: any = { ...project, members };

        const oldMemberIds = oldProject.memberIds || [];
        const newMemberIds = memberIds.filter(id => !oldMemberIds.includes(id));

        if (newMemberIds.length > 0) {
            for (const memberId of newMemberIds) {
                await triggerAutomation({
                    eventType: 'project_assigned',
                    triggeredBy: user.id,
                    targetUser: memberId,
                    relatedItem: { itemId: project.id, itemModel: 'Project' },
                    description: `You were added to project: ${project.name}`,
                    metadata: { projectName: project.name }
                });
            }
        }

        return { project: mappedProject };
    }

    static async updateClients(projectId: string, clientIds: string[]) {
        const project = await prisma.project.update({
            where: { id: projectId },
            data: { clientIds }
        });
        return { project };
    }

    static async getProjectTasks(projectId: string) {
        const tasks = await prisma.task.findMany({
            where: { projectId, deletedAt: null },
            include: { 
                assignee: { select: { id: true, name: true, email: true, photoUrl: true, role: true } },
                creator: { select: { id: true, name: true, email: true, photoUrl: true, role: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        return { tasks };
    }

    static async getProjectActivity(projectId: string) {
        const tasks = await prisma.task.findMany({
            where: { projectId, deletedAt: null },
            select: { id: true, title: true }
        });
        const modules = await prisma.module.findMany({
            where: { projectId },
            select: { id: true, title: true }
        });
        const taskIds = tasks.map((t: any) => t.id);
        const moduleIds = modules.map((m: any) => m.id);

        const taskMap: any = {};
        tasks.forEach((t: any) => { taskMap[t.id] = t.title; });
        const moduleMap: any = {};
        modules.forEach((m: any) => { moduleMap[m.id] = m.title; });

        const resourceFilters: any[] = [
            { resourceType: 'project', resourceId: projectId }
        ];
        if (taskIds.length > 0) resourceFilters.push({ resourceType: 'task', resourceId: { in: taskIds } });
        if (moduleIds.length > 0) resourceFilters.push({ resourceType: 'module', resourceId: { in: moduleIds } });

        const auditLogs = await prisma.auditLog.findMany({
            where: { OR: resourceFilters },
            include: { user: { select: { id: true, name: true, email: true, photoUrl: true } } },
            orderBy: { createdAt: 'desc' },
            take: 200
        });

        const timeLogs = await prisma.timeLog.findMany({
            where: { projectId },
            include: {
                user: { select: { id: true, name: true, email: true, photoUrl: true } },
                task: { select: { id: true, title: true } }
            },
            orderBy: { startTime: 'desc' }
        });

        const actionLabels: any = {
            'CREATE_PROJECT': 'Created project', 'UPDATE_PROJECT': 'Updated project', 'DELETE_PROJECT': 'Deleted project',
            'CREATE_TASK': 'Created task', 'UPDATE_TASK': 'Updated task', 'DELETE_TASK': 'Deleted task',
            'CREATE_MODULE': 'Created module', 'UPDATE_MODULE': 'Updated module', 'DELETE_MODULE': 'Deleted module',
            'CREATE_NOTE': 'Added note', 'UPDATE_NOTE': 'Updated note', 'DELETE_NOTE': 'Deleted note',
            'ASSIGN_TASK': 'Assigned task', 'SUBMIT_WORKLOG': 'Submitted work log', 'REVIEW_WORKLOG': 'Reviewed work log'
        };

        const activities = auditLogs.map((log: any) => {
            const details = typeof log.details === 'string' ? JSON.parse(log.details) : (log.details || {});
            let resourceName = details.title || details.name || '';
            
            if (!resourceName && log.resourceType === 'task') resourceName = taskMap[log.resourceId] || '';
            if (!resourceName && log.resourceType === 'module') resourceName = moduleMap[log.resourceId] || '';

            return {
                id: log.id, type: 'audit', action: log.action, actionLabel: actionLabels[log.action] || log.action,
                resourceType: log.resourceType, resourceId: log.resourceId, resourceName,
                user: log.user, details, timestamp: log.createdAt
            };
        });

        const timeActivities = timeLogs.map((tl: any) => ({
            id: tl.id, type: 'timelog', action: 'TIME_LOG', actionLabel: 'Logged time',
            resourceType: 'task', resourceId: tl.taskId, resourceName: tl.task?.title || '',
            user: tl.user, details: { description: tl.description, durationMinutes: tl.durationMinutes, hours: (tl.durationMinutes / 60).toFixed(1), startTime: tl.startTime, endTime: tl.endTime, status: tl.status },
            timestamp: tl.startTime
        }));

        const allActivities = [...activities, ...timeActivities]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const totalTimeLogged = timeLogs.reduce((acc: number, tl: any) => acc + (tl.durationMinutes || 0), 0);

        return {
            success: true,
            activities: allActivities,
            summary: {
                totalActivities: allActivities.length,
                totalTimeLoggedMinutes: totalTimeLogged,
                totalTimeLoggedHours: (totalTimeLogged / 60).toFixed(1)
            }
        };
    }

    static async getProjectNotes(projectId: string) {
        if (!prisma.note) return { notes: [] };
        const notes = await prisma.note.findMany({
            where: { relatedType: 'project', relatedId: projectId },
            include: { createdBy: { select: { id: true, name: true, email: true, photoUrl: true, role: true } } },
            orderBy: { createdAt: 'desc' }
        });
        return { notes };
    }

    static async createProjectNote(projectId: string, content: string, { user }: { user: UserContext }) {
        if (!prisma.note) throw new Error('Notes feature not supported in current DB version');
        const note = await prisma.note.create({
            data: { content, relatedType: 'project', relatedId: projectId, createdById: user.id },
            include: { createdBy: { select: { id: true, name: true, email: true, photoUrl: true, role: true } } }
        });
        
        await logAction(user.id, 'CREATE_NOTE', 'project', projectId, {});
        return { note };
    }

    static async updateProjectNote(projectId: string, noteId: string, content: string, { user }: { user: UserContext }) {
        if (!prisma.note) throw new Error('Notes feature not supported');
        const note = await prisma.note.findUnique({ where: { id: noteId } });
        if (!note) throw new Error('Note not found');

        if (note.createdById !== user.id && !['admin', 'manager', 'BMSP_SUPER_ADMIN'].includes(user.role || '')) {
            throw new Error('Not authorized to edit this note');
        }

        const updatedNote = await prisma.note.update({
            where: { id: noteId },
            data: { content },
            include: { createdBy: { select: { id: true, name: true, email: true, photoUrl: true, role: true } } }
        });

        await logAction(user.id, 'UPDATE_NOTE', 'project', projectId, {});
        return { note: updatedNote };
    }

    static async deleteProjectNote(projectId: string, noteId: string, { user }: { user: UserContext }) {
        if (!prisma.note) throw new Error('Notes feature not supported');
        const note = await prisma.note.findUnique({ where: { id: noteId } });
        if (!note) throw new Error('Note not found');

        if (note.createdById !== user.id && !['admin', 'manager', 'BMSP_SUPER_ADMIN'].includes(user.role || '')) {
            throw new Error('Not authorized to delete this note');
        }

        await prisma.note.delete({ where: { id: noteId } });
        await logAction(user.id, 'DELETE_NOTE', 'project', projectId, {});
        return { message: 'Note deleted successfully' };
    }
}


