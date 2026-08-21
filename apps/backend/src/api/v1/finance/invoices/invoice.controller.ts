import { Request, Response, NextFunction } from 'express';
import { InvoiceService } from '@workspace/finance';

export const getInvoices = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { status, clientId, projectId } = req.query;
        const filter: any = { companyId: (req as any).user.companyId };

        if ((req as any).user.role === 'client') {
            filter.clientId = (req as any).user.id;
        } else if (clientId) {
            filter.clientId = clientId as string;
        }

        if (projectId) filter.projectId = projectId as string;
        if (status) filter.status = status as string;

        const { invoices, totalRevenue } = await InvoiceService.getInvoices(filter);
        res.json({ invoices, totalRevenue });
    } catch (err) { next(err); }
};

export const getInvoiceById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const invoice = await InvoiceService.getInvoiceById((req as any).user.companyId, req.params.id);

        if ((req as any).user.role === 'client' && invoice.clientId !== (req as any).user.id) {
            return res.status(403).json({ error: 'Permission denied' });
        }

        res.json({ invoice });
    } catch (err) { next(err); }
};

export const createInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const invoice = await InvoiceService.createInvoice((req as any).user.companyId, req.body, (req as any).user);
        res.status(201).json({ invoice });
    } catch (err) { next(err); }
};

export const updateInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const invoice = await InvoiceService.updateInvoice(req.params.id, (req as any).user.companyId, req.body);
        res.json({ invoice });
    } catch (err: any) { 
        if (err.message === 'Not found') {
            return res.status(404).json({ error: 'Not found' });
        }
        next(err); 
    }
};

export const deleteInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await InvoiceService.deleteInvoice(req.params.id, (req as any).user.companyId);
        res.json(result);
    } catch (err) { next(err); }
};
