import { Request, Response, NextFunction } from 'express';
import { SupportService } from '@workspace/settings';

export class SupportController {
    static async createTicket(req: Request, res: Response, next: NextFunction) {
        try {
            const reqUser = (req as any).user;
            const result = await SupportService.createTicket(reqUser.companyId, reqUser, req.body);
            res.status(201).json(result);
        } catch (err: any) {
            if (err.message.includes('Monthly support ticket limit reached')) {
                const matches = err.message.match(/\((\d+)\/month\)/);
                const limit = matches ? parseInt(matches[1], 10) : 9;
                return res.status(429).json({
                    error: err.message,
                    used: limit,
                    limit: limit,
                });
            }
            console.error('Create ticket error:', err);
            res.status(500).json({ error: 'Failed to create support ticket' });
        }
    }

    static async listTickets(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await SupportService.listOwnTickets((req as any).user.companyId);
            res.json(result);
        } catch {
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
            res.json({ ticket });
        } catch (err: any) {
            if (err.message === 'Message text required') return res.status(400).json({ error: err.message });
            if (err.message === 'Ticket not found') return res.status(404).json({ error: err.message });
            res.status(500).json({ error: 'Failed to add reply' });
        }
    }

    static async editTicket(req: Request, res: Response, next: NextFunction) {
        try {
            const ticket = await SupportService.editTicket(req.params.id, (req as any).user.companyId, req.body);
            res.json({ ticket });
        } catch (err: any) {
            if (err.message === 'Ticket not found') return res.status(404).json({ error: err.message });
            if (err.message === 'Not authorized to edit this ticket') return res.status(403).json({ error: err.message });
            res.status(500).json({ error: 'Failed to update ticket' });
        }
    }

    static async deleteTicket(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await SupportService.deleteTicket(req.params.id, (req as any).user.companyId);
            res.json(result);
        } catch (err: any) {
            if (err.message === 'Ticket not found') return res.status(404).json({ error: err.message });
            if (err.message === 'Not authorized to delete this ticket') return res.status(403).json({ error: err.message });
            res.status(500).json({ error: 'Failed to delete ticket' });
        }
    }
}
