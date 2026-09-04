import { Request, Response, NextFunction } from 'express';
const { SupportService } = require('@workspace/settings'); // External domain

export const list = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await SupportService.superadminListTickets(req.query);
        res.json(result);
    } catch (err: any) {
  next(err);
}
};

export const getOne = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ticket = await SupportService.getTicket(req.params.id);
        res.json({ ticket });
    } catch (err: any) {
  next(err);
}
};

export const reply = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ticket = await SupportService.superadminReply(req.params.id, req.body.text, (req as any).superAdmin);
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
            console.warn('[Socket] Could not emit superadmin reply:', sockErr);
        }
        res.json({ success: true, ticket });
    } catch (err: any) {
        next(err);
    }
};

export const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ticket = await SupportService.superadminUpdateStatus(req.params.id, req.body.status);
        try {
            const { getIo } = require('../../../../system-configs/sockets');
            const io = getIo();
            if (io) {
                io.to(`ticket:${req.params.id}`).emit('ticket:message', {
                    ticketId: req.params.id,
                    ticket,
                    status: ticket.status
                });
            }
        } catch (sockErr) {
            console.warn('[Socket] Could not emit status update:', sockErr);
        }
        res.json({ success: true, ticket });
    } catch (err: any) {
        next(err);
    }
};
