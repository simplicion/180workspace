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
        res.json({ ticket });
    } catch (err: any) {
  next(err);
}
};

export const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ticket = await SupportService.superadminUpdateStatus(req.params.id, req.body.status);
        res.json({ ticket });
    } catch (err: any) {
  next(err);
}
};
