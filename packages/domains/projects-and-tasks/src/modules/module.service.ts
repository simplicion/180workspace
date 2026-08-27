import type { UserContext } from '../tasks/task.service.js';

import { prisma, requestContext } from '@workspace/db';
import { logAction, triggerAutomation } from '@workspace/backend-infra';

export class ModuleService {
    static async getModulesByProject(projectId: string) {
        const modules = await prisma.module.findMany({
            where: { projectId },
            include: {
                tasks: { where: { deletedAt: null }, select: { id: true, status: true, title: true } },
                owner: { select: { id: true, name: true, email: true, photoUrl: true, role: true } }
            },
            orderBy: { createdAt: 'asc' }
        });

        const modulesWithStats = modules.map((mod: any) => {
            const tasks = mod.tasks || [];
            const total = tasks.length;
            const completed = tasks.filter((t: any) => t.status === 'done').length;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
            
            const { tasks: _tasks, ...moduleData } = mod;

            return {
                ...moduleData,
                name: moduleData.title,
                ownerId: moduleData.owner,
                taskStats: { total, completed },
                calculatedProgress: progress
            };
        });

        return { modules: modulesWithStats };
    }

    static async createModule(data: any, user: UserContext) {
        const project = await prisma.project.findUnique({ where: { id: data.projectId } });
        if (!project) throw new Error('Project not found');

        const userRoles = user.roles || [user.role || 'employee'];
        const isAdminOrManager = userRoles.includes('admin') || (data.permissions && data.permissions.includes('can_manage_team'));

        if (!isAdminOrManager && project.ownerId?.toString() !== user.id.toString()) {
            throw new Error('Only project owners, managers, or admins can create modules');
        }

        const newModule = await prisma.module.create({
            data: {
                title: data.name,
                description: data.description,
                status: data.status || 'not_started',
                projectId: data.projectId,
                ownerId: data.ownerId || null,
                createdById: user.id
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        photoUrl: true,
                        role: true
                    }
                }
            }
        });

        if (logAction) {
            await logAction(user.id, 'CREATE_MODULE', 'module', newModule.id, { name: newModule.title });
        }

        if (newModule.ownerId && triggerAutomation) {
            await triggerAutomation({
                eventType: 'module_assigned',
                triggeredBy: user.id,
                targetUser: newModule.ownerId,
                targetClient: requestContext.getStore()?.companyId as string,
                relatedItem: { itemModel: 'module', itemId: newModule.id },
                description: `You have been assigned as the owner of the module: ${newModule.title}`,
                metadata: {
                    moduleName: newModule.title,
                    projectName: project.name
                }
            });
        }

        return { module: { ...newModule, name: newModule.title, ownerId: newModule.owner } };
    }

    static async updateModule(moduleId: string, data: any, user: UserContext) {
        const mod = await prisma.module.findUnique({ where: { id: moduleId } });
        if (!mod) throw new Error('Module not found');

        const project = await prisma.project.findUnique({ where: { id: mod.projectId } });
        
        const isOwner = mod.ownerId?.toString() === user.id.toString();
        const isProjectOwner = project?.ownerId?.toString() === user.id.toString();
        const userRoles = user.roles || [user.role || 'employee'];
        const isAdminOrManager = userRoles.includes('admin') || (data.permissions && data.permissions.includes('can_manage_team'));

        if (!isAdminOrManager && !isOwner && !isProjectOwner) {
            throw new Error('Not authorized to update this module');
        }

        const oldOwnerId = mod.ownerId?.toString();

        const updateData = { ...data };
        if (updateData.name) {
            updateData.title = updateData.name;
            delete updateData.name;
        }

        const updatedModule = await prisma.module.update({
            where: { id: moduleId },
            data: updateData,
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        photoUrl: true,
                        role: true
                    }
                }
            }
        });

        if (logAction) {
            await logAction(user.id, 'UPDATE_MODULE', 'module', mod.id, { title: updatedModule.title });
        }

        if (updatedModule.ownerId && updatedModule.ownerId.toString() !== oldOwnerId && triggerAutomation) {
            await triggerAutomation({
                eventType: 'module_assigned',
                triggeredBy: user.id,
                targetUser: updatedModule.ownerId,
                targetClient: requestContext.getStore()?.companyId as string,
                relatedItem: { itemModel: 'module', itemId: updatedModule.id },
                description: `You have been assigned as the owner of the module: ${updatedModule.title}`,
                metadata: {
                    moduleName: updatedModule.title,
                    projectName: project?.name
                }
            });
        }

        return { module: { ...updatedModule, name: updatedModule.title, ownerId: updatedModule.owner } };
    }

    static async deleteModule(moduleId: string, queryMode: string | undefined, user: UserContext) {
        const mod = await prisma.module.findUnique({ where: { id: moduleId } });
        if (!mod) throw new Error('Module not found');

        const project = await prisma.project.findUnique({ where: { id: mod.projectId } });
        const userRoles = user.roles || [user.role || 'employee'];
        const isAdminOrManager = userRoles.includes('admin') || (user as any).permissions?.includes('can_manage_team');

        if (!isAdminOrManager && project?.ownerId?.toString() !== user.id.toString()) {
            throw new Error('Only project owners, managers, or admins can delete modules');
        }

        if (queryMode === 'wipe') {
            await prisma.task.updateMany({
                where: { moduleId: mod.id },
                data: { deletedAt: new Date() }
            });
        } else {
            await prisma.task.updateMany({
                where: { moduleId: mod.id },
                data: { moduleId: null }
            });
        }

        await prisma.module.delete({
            where: { id: moduleId }
        });
        
        await this.updateProjectProgress(mod.projectId);

        if (logAction) {
            await logAction(user.id, 'DELETE_MODULE', 'module', moduleId, { title: mod.title, mode: queryMode });
        }

        return { message: 'Module deleted successfully' };
    }

    static async updateProjectProgress(projectId: string) {
        if (!projectId) return;
        try {
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
        } catch (err: any) {
            console.error('Error updating project progress:', err.message);
        }
    }
}


