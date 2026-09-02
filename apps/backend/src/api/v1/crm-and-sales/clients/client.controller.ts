import { Request, Response, NextFunction } from 'express';
import { ClientService } from '@workspace/crm-and-sales';
import { logAction } from '../../../../system-configs/utils/audit';
import { triggerN8nWebhook } from '../../integrations/webhooks/webhook.routes';
import { cacheDel } from '../../../../system-configs/middleware/system/cache';
import { sendWelcomeEmail } from '@workspace/communications';

const clearCRMCache = async (companyId: string) => {
  try {

    if (!companyId) return;
    await cacheDel(`company:${companyId}:dashboard_metrics_v2`);
    await cacheDel(`company:${companyId}:forecasting`);
    await cacheDel(`company:${companyId}:productivity`);

  } catch (error) {
    console.error('Failed to clear CRM cache for company:', companyId, error);
  }
};

export const getClients = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ClientService.getClients(req.query);
        res.json(result);
    } catch (err) { next(err); }
};

export const getClientCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const categories = await ClientService.getCategories();
        res.json({ categories });
    } catch (err) { next(err); }
};

export const createClient = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).company?.id || (req as any).user?.companyId;
        const { client, givePortalAccess, password } = await ClientService.createClient(req.body, (req as any).user.id);

        await logAction((req as any).user.id, 'CREATE_CLIENT', 'client', client.id, { name: client.name }, req);

        await triggerN8nWebhook('new-client', {
            clientId: client.id,
            name: client.name,
            email: client.email
        }).catch(() => { });

        if (givePortalAccess && password && client.email) {
            const clientUser = await ClientService.createPortalUser(client, password);
            if (clientUser) {
                try {
                    await sendWelcomeEmail(clientUser, password);
                } catch (emailErr) {
                    console.error('Failed to send welcome email to client:', emailErr);
                }
            }
        }

        if (companyId) await clearCRMCache(companyId);

        res.status(201).json({ client: { ...client, _id: client.id } });
    } catch (err: any) {
        if (err.message === 'A client with this email already exists.') {
            return res.status(400).json({ error: err.message });
        }
        next(err); 
    }
};

export const getClientById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const mappedClient = await ClientService.getClientById(req.params.id);
        res.json({ client: mappedClient });
    } catch (err: any) { 
        if (err.message === 'Client not found') return res.status(404).json({ error: err.message });
        next(err); 
    }
};

export const updateClient = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if ((req as any).storageResult) {
            req.body.logoUrl = (req as any).storageResult.fileUrl;
        }

        const client = await ClientService.updateClient(req.params.id, req.body);

        const companyId = (req as any).company?.id || (req as any).user?.companyId;
        if (companyId) {
            await clearCRMCache(companyId);
        }

        res.json({ client: { ...client, _id: client.id } });
    } catch (err: any) { 
        if (err.message === 'A client with this email already exists.') {
            return res.status(400).json({ error: err.message });
        }
        next(err); 
    }
};

export const deleteClient = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await ClientService.deleteClient(req.params.id);
        await logAction((req as any).user.id, 'DELETE_CLIENT', 'client', req.params.id, {}, req);
        
        const companyId = (req as any).company?.id || (req as any).user?.companyId;
        if (companyId) {
            await clearCRMCache(companyId);
        }
        
        res.json({ message: 'Client deleted' });
    } catch (err) { next(err); }
};

export const getCommunications = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const communications = await ClientService.getCommunications(req.params.id);
        res.json({ communications });
    } catch (err) { next(err); }
};

export const createCommunication = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const comm = await ClientService.createCommunication(req.params.id, req.body, (req as any).user);

        await logAction((req as any).user.id, 'CREATE_CLIENT_COMM', 'client', req.params.id, { subject: req.body.subject }, req);
        
        const companyId = (req as any).company?.id || (req as any).user?.companyId;
        if (companyId) {
            await clearCRMCache(companyId);
        }

        res.status(201).json({ communication: { ...comm, _id: comm.id } });
    } catch (err: any) { 
        if (err.message === 'Subject is required') return res.status(400).json({ error: err.message });
        next(err); 
    }
};

export const deleteCommunication = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await ClientService.deleteCommunication(req.params.commId);
        await logAction((req as any).user.id, 'DELETE_CLIENT_COMM', 'client', req.params.id, {}, req);
        
        const companyId = (req as any).company?.id || (req as any).user?.companyId;
        if (companyId) {
            await clearCRMCache(companyId);
        }

        res.json({ message: 'Communication deleted' });
    } catch (err) { next(err); }
};

export const getActivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const activities = await ClientService.getActivity(req.params.id);
        res.json({ activities });
    } catch (err) { next(err); }
};
