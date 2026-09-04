import { prisma, requestContext } from '@workspace/db';

const MONTHLY_LIMIT = 9;

export class SupportService {
    static async getMonthlyCount(companyIdOverride?: string) {
        const companyId = companyIdOverride || (requestContext.getStore()?.companyId as string);
        if (!companyId) return 0;
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

    static async createTicket(user: any, data: any) {
        const companyId = requestContext.getStore()?.companyId as string || user?.companyId || 'SYSTEM_PLATFORM';
        const count = await this.getMonthlyCount(companyId);
        if (count >= MONTHLY_LIMIT) {
            throw new Error(`Monthly support ticket limit reached (${MONTHLY_LIMIT}/month). Please wait until next month.`);
        }
        
        const config = await prisma.companyConfig.findFirst({ where: { companyId } }).catch(() => null);
        const resolvedCompanyName = (config as any)?.companyName || user?.companyName || user?.name || '180workspace Tenant';
        const initialMessage = {
            senderName: user?.name || 'User',
            senderRole: user?.role || 'user',
            senderId: user?.id || 'unknown',
            userEmail: user?.email || '',
            companyId,
            companyName: resolvedCompanyName,
            text: data.description || data.message || '',
            attachments: Array.isArray(data.attachments) ? data.attachments : [],
            metadata: data.metadata || null,
            createdAt: new Date().toISOString()
        };
        
        const ticket = await prisma.supportTicket.create({
            data: {
                companyId,
                companyName: resolvedCompanyName,
                userId: user?.id || 'unknown',
                userName: user?.name || 'User',
                userEmail: user?.email || '',
                subject: data.subject,
                message: data.description || data.message || '',
                category: data.category || 'technical',
                priority: data.priority || 'medium',
                messages: [initialMessage]
            }
        });

        return {
            ticket,
            remaining: Math.max(0, MONTHLY_LIMIT - (count + 1)),
            used: count + 1,
            limit: MONTHLY_LIMIT,
        };
    }

    static async createQuickReport(user: any, data: any) {
        const companyId = requestContext.getStore()?.companyId as string || user.companyId || 'SYSTEM_PLATFORM';
        const config = await prisma.companyConfig.findFirst({ where: { companyId } }).catch(() => null);
        const resolvedCompanyName = (config as any)?.companyName || user.companyName || '180workspace Tenant';
        
        const category = data.category || 'bug_report';
        const subject = data.subject || `[Issue Report] ${category.replace(/_/g, ' ').toUpperCase()} on ${data.routeUrl || '/'}`;
        const description = data.description || data.message || 'No description provided';
        const nowIso = new Date().toISOString();
        
        const initialMessage = {
            senderName: user.name,
            senderRole: user.role || 'user',
            senderId: user.id,
            userEmail: user.email,
            companyId,
            companyName: resolvedCompanyName,
            text: description,
            source: 'quick_support',
            routeUrl: data.routeUrl || data.url || '/',
            ip: data.ip || '127.0.0.1',
            timeZone: data.timeZone || data.metadata?.timeZone || 'UTC',
            location: data.location || data.metadata?.location || 'Client Session',
            timestamp: nowIso,
            metadata: {
                userAgent: data.metadata?.userAgent || data.userAgent || 'Unknown',
                screenResolution: data.metadata?.screenResolution || data.screenResolution || 'N/A',
                viewportSize: data.metadata?.viewportSize || data.viewportSize || 'N/A',
                timeZone: data.metadata?.timeZone || data.timeZone || 'UTC',
                language: data.metadata?.language || data.language || 'en-US',
                timestamp: nowIso,
                ip: data.ip || '127.0.0.1'
            },
            attachments: Array.isArray(data.attachments) ? data.attachments : [],
            createdAt: nowIso
        };

        const ticket = await prisma.supportTicket.create({
            data: {
                companyId,
                companyName: resolvedCompanyName,
                userId: user.id,
                userName: user.name,
                userEmail: user.email,
                subject,
                message: description,
                category: 'quick_support',
                priority: data.priority || 'high',
                messages: [initialMessage]
            }
        });

        return {
            success: true,
            ticketId: ticket.id,
            ticket,
            message: 'Support incident report submitted successfully. Our engineering team is investigating.'
        };
    }

    static async listOwnTickets(query: any = {}, fallbackCompanyId?: string) {
        const companyId = (requestContext.getStore()?.companyId as string) || fallbackCompanyId;
        const limit = Math.min(Number(query?.limit) || 50, 100);
        const whereClause: any = {};
        if (companyId) {
            whereClause.companyId = companyId;
        }
        if (query?.status) {
            whereClause.status = query.status;
        }
        if (query?.category) {
            whereClause.category = query.category;
        }

        const tickets = await prisma.supportTicket.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: limit
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
        const newMessage = {
            senderName: user?.name || 'Customer',
            senderRole: user?.role || 'user',
            senderId: user?.id || 'unknown',
            text: text.trim(),
            createdAt: new Date().toISOString()
        };
        
        return await prisma.supportTicket.update({
            where: { id: ticketId },
            data: {
                messages: [...currentMessages, newMessage],
                status: 'in_progress'
            }
        });
    }

    static async editTicket(ticketId: string, data: any) {
        const companyId = requestContext.getStore()?.companyId as string;
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

    static async deleteTicket(ticketId: string) {
        const companyId = requestContext.getStore()?.companyId as string;
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
        const { page = 1, limit = 30, status, category, priority, search } = query;
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const where: any = {};

        if (status && status !== 'all') {
            where.status = status;
        }

        if (category && category !== 'all') {
            where.category = category;
        }

        if (priority && priority !== 'all') {
            where.priority = priority;
        }

        if (search && typeof search === 'string' && search.trim()) {
            const term = search.trim();
            where.OR = [
                { subject: { contains: term, mode: 'insensitive' } },
                { message: { contains: term, mode: 'insensitive' } },
                { userName: { contains: term, mode: 'insensitive' } },
                { userEmail: { contains: term, mode: 'insensitive' } },
                { companyName: { contains: term, mode: 'insensitive' } },
            ];
        }

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
        if (!ticketId || !status) throw new Error('Ticket ID and status are required');

        const existing = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
        if (!existing) throw new Error('Ticket not found');

        return await prisma.supportTicket.update({
            where: { id: ticketId },
            data: { status },
        });
    }
}
