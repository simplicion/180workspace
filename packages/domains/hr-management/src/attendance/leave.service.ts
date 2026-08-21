import { prisma } from '@workspace/db';

export class LeaveService {
    static async applyForLeave(employeeId: string, data: { startDate: string; endDate: string; type?: string; reason?: string }) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        
        return await prisma.leave.create({
            data: {
                employeeId,
                type: data.type || 'casual',
                startDate: data.startDate,
                endDate: data.endDate,
                reason: data.reason,
                days,
            }
        });
    }

    static async getLeaves(employeeId?: string, status?: string, month?: string, userRole?: string, requestingUserId?: string) {
        const filter: any = {};
        
        if (userRole === 'employee') {
            filter.employeeId = requestingUserId;
        } else if (employeeId) {
            filter.employeeId = employeeId;
        }
        
        if (status) filter.status = status;
        if (month) {
            filter.startDate = { startsWith: month };
        }
        
        return await prisma.leave.findMany({
            where: filter,
            include: {
                employee: { select: { id: true, name: true, email: true, department: true } },
                reviewedBy: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    static async reviewLeave(id: string, reviewerId: string, status: string, reviewNote?: string) {
        if (!['approved', 'rejected'].includes(status)) {
            throw new Error('Invalid status');
        }
        
        return await prisma.leave.update({
            where: { id },
            data: { 
                status, 
                reviewedById: reviewerId, 
                reviewedAt: new Date(), 
                reviewNote 
            },
            include: {
                employee: { select: { id: true, name: true, email: true, department: true } },
                reviewedBy: { select: { id: true, name: true } }
            }
        });
    }

    static async deletePendingLeave(id: string, userId: string, userRole: string) {
        const leave = await prisma.leave.findUnique({ where: { id } });
        if (!leave) throw new Error('Not found');
        if (leave.status !== 'pending') throw new Error('Can only delete pending requests');
        
        if (leave.employeeId !== userId && !['admin', 'manager'].includes(userRole)) {
            throw new Error('Not authorized');
        }
        
        await prisma.leave.delete({ where: { id } });
        return { message: 'Leave request deleted' };
    }
}
