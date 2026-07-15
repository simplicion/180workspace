'use strict';

const { logAction } = require('../../../system-configs/middleware/audit/audit.js');
const AutomationService = require('../../../platform-core/platform-communications/services/automation.service');

exports.getModulesByProject = async (req, res, next) => {
    try {
        const Module = req.prisma.module;
        const Task = req.prisma.task;
        const projectId = req.params.projectId;

        const modules = await Module.findMany({
            where: { projectId },
            include: { tasks: { where: { deletedAt: null } } },
            orderBy: { createdAt: 'asc' }
        });

        // Attach stats to each module
        const modulesWithStats = modules.map((mod) => {
            const tasks = mod.tasks || [];
            const total = tasks.length;
            const completed = tasks.filter(t => t.status === 'done').length;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
            
            // Remove tasks from the payload if it wasn't requested, or keep it depending on requirements
            const { tasks: _tasks, ...moduleData } = mod;

            // Map keys to match expected response (ownerId -> owner, etc.)
            return {
                ...moduleData,
                ownerId: moduleData.owner,
                taskStats: { total, completed },
                calculatedProgress: progress
            };
        });

        res.json({ modules: modulesWithStats });
    } catch (err) { next(err); }
};

exports.createModule = async (req, res, next) => {
    try {
        const Module = req.prisma.module;
        const Project = req.prisma.project;
        
        const project = await Project.findUnique({ where: { id: req.body.projectId } });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        // Permission: Admin, Manager, or Project Owner
        if (req.user.role !== 'admin' && req.user.role !== 'manager' && project.ownerId?.toString() !== req.user.id.toString()) {
            return res.status(403).json({ error: 'Only project owners, managers, or admins can create modules' });
        }

        const newModule = await Module.create({
            data: {
                name: req.body.name,
                description: req.body.description,
                status: req.body.status || 'not_started',
                projectId: req.body.projectId,
                ownerId: req.body.ownerId || null,
                createdById: req.user.id,
                companyId: req.user.companyId
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

        await logAction(req.user.id, 'CREATE_MODULE', 'module', newModule.id, { name: newModule.name }, req);

        if (newModule.ownerId) {
            AutomationService.trigger({
                eventType: 'module_assigned',
                triggeredBy: req.user.id,
                targetUser: newModule.ownerId,
                targetClient: req.user.companyId,
                relatedItem: { itemType: 'module', itemId: newModule.id, projectId: newModule.projectId },
                description: `You have been assigned as the owner of the module: ${newModule.name}`,
                metadata: {
                    moduleName: newModule.name,
                    projectName: project.name
                }
            }, req.prisma);
        }

        res.status(201).json({ module: { ...newModule, ownerId: newModule.owner } });
    } catch (err) { next(err); }
};

exports.updateModule = async (req, res, next) => {
    try {
        const Module = req.prisma.module;
        const Project = req.prisma.project;

        const mod = await Module.findUnique({ where: { id: req.params.id } });
        if (!mod) return res.status(404).json({ error: 'Module not found' });

        const project = await Project.findUnique({ where: { id: mod.projectId } });
        
        const isOwner = mod.ownerId?.toString() === req.user.id.toString();
        const isProjectOwner = project?.ownerId?.toString() === req.user.id.toString();
        const isAdminOrManager = req.user.role === 'admin' || req.user.role === 'ceo' || (req.user.permissions && req.user.permissions.includes('can_manage_team'));

        if (!isAdminOrManager && !isOwner && !isProjectOwner) {
            return res.status(403).json({ error: 'Not authorized to update this module' });
        }

        const oldOwnerId = mod.ownerId?.toString();

        const updatedModule = await Module.update({
            where: { id: req.params.id },
            data: req.body,
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

        await logAction(req.user.id, 'UPDATE_MODULE', 'module', mod.id, {}, req);

        if (updatedModule.ownerId && updatedModule.ownerId.toString() !== oldOwnerId) {
            AutomationService.trigger({
                eventType: 'module_assigned',
                triggeredBy: req.user.id,
                targetUser: updatedModule.ownerId,
                targetClient: req.user.companyId,
                relatedItem: { itemType: 'module', itemId: updatedModule.id, projectId: updatedModule.projectId },
                description: `You have been assigned as the owner of the module: ${updatedModule.name}`,
                metadata: {
                    moduleName: updatedModule.name,
                    projectName: project.name
                }
            }, req.prisma);
        }

        res.json({ module: { ...updatedModule, ownerId: updatedModule.owner } });
    } catch (err) { next(err); }
};

exports.deleteModule = async (req, res, next) => {
    try {
        const Module = req.prisma.module;
        const Task = req.prisma.task;
        const Project = req.prisma.project;
        
        const mod = await Module.findUnique({ where: { id: req.params.id } });
        if (!mod) return res.status(404).json({ error: 'Module not found' });

        const project = await Project.findUnique({ where: { id: mod.projectId } });
        if (req.user.role !== 'admin' && req.user.role !== 'manager' && project?.ownerId?.toString() !== req.user.id.toString()) {
            return res.status(403).json({ error: 'Only project owners, managers, or admins can delete modules' });
        }

        const { mode } = req.query;

        if (mode === 'wipe') {
            await Task.updateMany({
                where: { moduleId: mod.id },
                data: { deletedAt: new Date() }
            });
        } else {
            await Task.updateMany({
                where: { moduleId: mod.id },
                data: { moduleId: null }
            });
        }

        await Module.delete({
            where: { id: req.params.id }
        });
        
        await updateProjectProgress(mod.projectId, req.prisma);

        await logAction(req.user.id, 'DELETE_MODULE', 'module', req.params.id, { mode }, req);
        res.json({ message: 'Module deleted successfully' });
    } catch (err) { next(err); }
};

const updateProjectProgress = async (projectId, prismaClient) => {
    if (!projectId || !prismaClient) return;
    try {
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
    } catch (err) {
        console.error('Error updating project progress:', err.message);
    }
};

module.exports = exports;
