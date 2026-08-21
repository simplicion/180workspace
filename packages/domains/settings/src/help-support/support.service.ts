import { prisma } from '@workspace/db';

const MONTHLY_LIMIT = 9;

export class SupportService {
    static async getMonthlyCount(companyId: string) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        return await prisma.supportTicket.count({
            where: {
                companyId,
                createdAt: { gte: startOfMonth },
            },
        });
    }

    static async createTicket(companyId: string, user: any, data: any) {
        const count = await this.getMonthlyCount(companyId);
        if (count >= MONTHLY_LIMIT) {
            throw new Error(`Monthly support ticket limit reached (${MONTHLY_LIMIT}/month). Please wait until next month.`);
        }
        
        const config = await prisma.companyConfig.findFirst();
        
        const ticket = await prisma.supportTicket.create({
            data: {
                companyId,
                companyName: (config as any)?.companyName || user.name,
                userId: user.id,
                userName: user.name,
                userEmail: user.email,
                subject: data.subject,
                message: data.description || data.message || '',
                category: data.category || 'other',
                priority: data.priority || 'medium',
                messages: []
            }
        });

        return {
            ticket,
            remaining: MONTHLY_LIMIT - (count + 1),
            used: count + 1,
            limit: MONTHLY_LIMIT,
        };
    }

    static async listOwnTickets(companyId: string) {
        const tickets = await prisma.supportTicket.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' }
        });
        
        const monthCount = await this.getMonthlyCount(companyId);
        return { tickets, monthlyUsed: monthCount, monthlyLimit: MONTHLY_LIMIT };
    }

    static async getTicket(ticketId: string) {
        const ticket = await prisma.supportTicket.findUnique({
            where: { id: ticketId }
        });
        if (!ticket) throw new Error('Ticket not found');
        return ticket;
    }

    static async addReplyFromCompany(ticketId: string, text: string, user: any) {
        if (!text?.trim()) throw new Error('Message text required');
        
        const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
        if (!ticket) throw new Error('Ticket not found');

        const currentMessages = Array.isArray(ticket.messages) ? ticket.messages : [];
        const newMessage = { senderName: user.name, senderRole: 'admin', senderId: user.id, text, createdAt: new Date().toISOString() };
        
        return await prisma.supportTicket.update({
            where: { id: ticketId },
            data: {
                messages: [...currentMessages, newMessage],
                status: 'waiting_on_customer'
            }
        });
    }

    static async editTicket(ticketId: string, companyId: string, data: any) {
        const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
        if (!ticket) throw new Error('Ticket not found');
        
        if (ticket.companyId !== companyId) {
            throw new Error('Not authorized to edit this ticket');
        }

        const updateData: any = {};
        if (data.subject) updateData.subject = data.subject;
        if (data.description) updateData.message = data.description;
        if (data.category) updateData.category = data.category;
        if (data.priority) updateData.priority = data.priority;

        return await prisma.supportTicket.update({
            where: { id: ticketId },
            data: updateData
        });
    }

    static async deleteTicket(ticketId: string, companyId: string) {
        const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
        if (!ticket) throw new Error('Ticket not found');
        
        if (ticket.companyId !== companyId) {
            throw new Error('Not authorized to delete this ticket');
        }

        await prisma.supportTicket.delete({ where: { id: ticketId } });
        return { message: 'Ticket deleted successfully' };
    }

    // Superadmin methods
    static async superadminListTickets(query: any) {
        const { page = 1, limit = 20, status } = query;
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const where: any = {};
        if (status) where.status = status;

        const [tickets, total] = await Promise.all([
            prisma.supportTicket.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
            }),
            prisma.supportTicket.count({ where }),
        ]);
        return { tickets, total };
    }

    static async superadminReply(ticketId: string, text: string, superAdmin: any) {
        if (!text?.trim()) throw new Error('Message text is required');

        const existing = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
        if (!existing) throw new Error('Ticket not found');

        const currentMessages = Array.isArray(existing.messages) ? existing.messages : [];
        const newMessage = {
            senderName: superAdmin.name,
            senderRole: 'superadmin',
            senderId: superAdmin.id,
            text,
            timestamp: new Date().toISOString(),
        };

        return await prisma.supportTicket.update({
            where: { id: ticketId },
            data: {
                messages: [...currentMessages, newMessage],
                status: 'in_progress',
            },
        });
    }

    static async superadminUpdateStatus(ticketId: string, status: string) {
        const data: any = { status };
        if (status === 'resolved') data.resolvedAt = new Date();
        if (status === 'closed') data.closedAt = new Date();

        try {
            return await prisma.supportTicket.update({
                where: { id: ticketId },
                data,
            });
        } catch (err: any) {
            if (err.message === 'Ticket not found') throw err;
            throw err;
        }
    }
}
