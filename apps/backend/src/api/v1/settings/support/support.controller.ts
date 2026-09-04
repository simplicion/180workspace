import { Request, Response, NextFunction } from 'express';
import { SupportService } from '@workspace/settings';

export class SupportController {
    static async createTicket(req: Request, res: Response, next: NextFunction) {
        try {
            const reqUser = (req as any).user;
            const result = await SupportService.createTicket(reqUser, req.body);
            res.status(201).json({ success: true, data: result, ...result });
        } catch (err: any) {
            if (err.message && err.message.includes('Monthly support ticket limit reached')) {
                const matches = err.message.match(/\((\d+)\/month\)/);
                const limit = matches ? parseInt(matches[1], 10) : 9;
                return res.status(429).json({
                    error: err.message,
                    used: limit,
                    limit: limit,
                });
            }
            console.error('Create ticket error:', err);
            res.status(500).json({ error: err.message || 'Failed to create support ticket' });
        }
    }

    static async createQuickReport(req: Request, res: Response, next: NextFunction) {
        try {
            const reqUser = (req as any).user;
            const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '';
            const clientIp = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : Array.isArray(rawIp) ? rawIp[0] : '127.0.0.1';
            
            const result = await SupportService.createQuickReport(reqUser, {
                ...req.body,
                ip: clientIp
            });
            return res.status(201).json({ success: true, data: result, ...result });
        } catch (err: any) {
            console.error('Create quick report error:', err);
            return res.status(500).json({ error: err.message || 'Failed to submit quick report' });
        }
    }

    static async listTickets(req: Request, res: Response, next: NextFunction) {
        try {
            const reqUser = (req as any).user;
            const companyId = (req as any).companyId || reqUser?.companyId;
            const result = await SupportService.listOwnTickets(req.query, companyId);
            res.json({ success: true, data: result, ...result });
        } catch (err: any) {
            console.error('List tickets error:', err);
            res.status(500).json({ error: 'Failed to fetch tickets' });
        }
    }

    static async getTicket(req: Request, res: Response, next: NextFunction) {
        try {
            const ticket = await SupportService.getTicket(req.params.id);
            res.json({ ticket });
        } catch (err: any) {
            if (err.message === 'Ticket not found') return res.status(404).json({ error: 'Ticket not found' });
            res.status(500).json({ error: 'Failed to fetch ticket' });
        }
    }

    static async addReply(req: Request, res: Response, next: NextFunction) {
        try {
            const ticket = await SupportService.addReplyFromCompany(req.params.id, req.body.text, (req as any).user);
            try {
                const { getIo } = require('../../../../system-configs/sockets');
                const io = getIo();
                if (io) {
                    const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
                    const lastMsg = messages[messages.length - 1];
                    io.to(`ticket:${req.params.id}`).emit('ticket:message', {
                        ticketId: req.params.id,
                        ticket,
                        message: lastMsg,
                        status: ticket.status
                    });
                }
            } catch (sockErr) {
                console.warn('[Socket] Could not emit ticket reply:', sockErr);
            }
            res.json({ success: true, ticket });
        } catch (err: any) {
            if (err.message === 'Message text required') return res.status(400).json({ error: err.message });
            if (err.message === 'Ticket not found') return res.status(404).json({ error: err.message });
            res.status(500).json({ error: 'Failed to add reply' });
        }
    }

    static async editTicket(req: Request, res: Response, next: NextFunction) {
        try {
            const ticket = await SupportService.editTicket(req.params.id, req.body);
            res.json({ ticket });
        } catch (err: any) {
            if (err.message === 'Ticket not found') return res.status(404).json({ error: err.message });
            if (err.message === 'Not authorized to edit this ticket') return res.status(403).json({ error: err.message });
            res.status(500).json({ error: 'Failed to update ticket' });
        }
    }

    static async deleteTicket(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await SupportService.deleteTicket(req.params.id);
            res.json(result);
        } catch (err: any) {
            if (err.message === 'Ticket not found') return res.status(404).json({ error: err.message });
            if (err.message === 'Not authorized to delete this ticket') return res.status(403).json({ error: err.message });
            res.status(500).json({ error: 'Failed to delete ticket' });
        }
    }
}
