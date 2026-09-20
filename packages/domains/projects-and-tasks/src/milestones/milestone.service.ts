import type { UserContext } from '../tasks/task.service.js';

import { prisma } from '@workspace/db';

export class MilestoneService {
    static async getMilestones(projectId: string, user: UserContext) {
        const p = await prisma.project.findUnique({ where: { id: projectId } });
        if (!p || p.projectType === 'social_media') throw new Error('Project not found');

        const isMember = p.memberIds?.some((m: any) => m.toString() === user.id?.toString());
        const isClient = p.clientIds?.some((m: any) => m.toString() === user.id?.toString());
        const isAdmin = ['admin', 'manager', 'hr'].includes(user.role || '');

        if (!isAdmin && !isMember && !isClient) {
            throw new Error('Not authorized for this project');
        }

        const milestones = await prisma.milestone.findMany({ 
            where: { projectId },
            orderBy: [{ order: 'asc' }, { dueDate: 'asc' }]
        });
        
        return { milestones };
    }

    static async createMilestone(projectId: string, data: any, user: UserContext) {
        const p = await prisma.project.findUnique({ where: { id: projectId } });
        if (!p || p.projectType === 'social_media') throw new Error('Project not found');

        if (!['admin', 'manager'].includes(user.role || '')) {
            throw new Error('Not authorized');
        }

        const milestone = await prisma.milestone.create({ 
            data: {
                ...data,
                projectId: p.id,
                createdById: user.id
            } 
        });

        return { milestone };
    }

    static async toggleMilestone(milestoneId: string, user: UserContext, generateInvoice?: (milestone: any, project: any) => Promise<any>) {
        const milestone = await prisma.milestone.findUnique({ where: { id: milestoneId } });
        if (!milestone) throw new Error('Milestone not found');

        const p = await prisma.project.findUnique({ where: { id: milestone.projectId } });
        if (!['admin', 'manager'].includes(user.role || '')) {
            throw new Error('Not authorized');
        }

        const completed = !milestone.completed;
        const completedAt = completed ? new Date() : null;
        const completedById = completed ? user.id : null;

        const updateData: any = { completed, completedAt, completedById };

        let invoice = null;
        if (completed && milestone.autoInvoice && !milestone.invoiceId && generateInvoice) {
            const m = { ...milestone, ...updateData };
            invoice = await generateInvoice(m, p);
            if (invoice) {
                updateData.invoiceId = invoice.id;
            }
        }

        const updatedMilestone = await prisma.milestone.update({
            where: { id: milestone.id },
            data: updateData
        });

        return { milestone: updatedMilestone, invoice };
    }

    static async deleteMilestone(milestoneId: string, user: UserContext) {
        const milestone = await prisma.milestone.findUnique({ where: { id: milestoneId } });
        if (!milestone) throw new Error('Milestone not found');

        if (!['admin', 'manager'].includes(user.role || '')) {
            throw new Error('Only managers or admins can delete milestones');
        }

        await prisma.milestone.delete({ where: { id: milestoneId } });
        return { success: true };
    }

    static async updateMilestone(milestoneId: string, data: any, user: UserContext) {
        const milestone = await prisma.milestone.findUnique({ where: { id: milestoneId } });
        if (!milestone) throw new Error('Milestone not found');

        if (!['admin', 'manager'].includes(user.role || '')) {
            throw new Error('Not authorized');
        }

        const updatedMilestone = await prisma.milestone.update({ 
            where: { id: milestoneId }, 
            data: data 
        });

        return { milestone: updatedMilestone };
    }
}

