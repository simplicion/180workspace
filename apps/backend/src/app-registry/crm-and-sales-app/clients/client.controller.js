'use strict';

const { ClientService } = require('@workspace/crm-and-sales');
const { logAction } = require('../../../system-configs/middleware/audit/audit.js');
const { triggerN8nWebhook } = require('../../../platform-core/platform-integrations/webhooks/webhook.routes');
const AutomationService = require('../../../platform-core/platform-communications/services/automation.service');
const { cacheDel } = require('../../../system-configs/middleware/system/cache.js');
const { sendWelcomeEmail } = require('../../communications-app/emails/email.service');

const clearCRMCache = async (companyId) => {
    if (!companyId) return;
    await cacheDel(`company:${companyId}:dashboard_metrics_v2`);
    await cacheDel(`company:${companyId}:forecasting`);
    await cacheDel(`company:${companyId}:productivity`);
};

exports.getClients = async (req, res, next) => {
    try {
        const result = await ClientService.getClients(req.query);
        res.json(result);
    } catch (err) { next(err); }
};

exports.createClient = async (req, res, next) => {
    try {
        const companyId = req.company?.id;
        const { client, givePortalAccess, password } = await ClientService.createClient(req.body, req.user.id, companyId);

        await logAction(req.user.id, 'CREATE_CLIENT', 'client', client.id, { name: client.name }, req);

        await AutomationService.trigger({
            eventType: 'client_created',
            triggeredBy: req.user.id,
            targetUser: client.id,
            relatedItem: { itemId: client.id, itemModel: 'Client' },
            description: `New client account created for ${client.name}`,
            metadata: { clientName: client.name }
        });

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
    } catch (err) {
        if (err.message === 'A client with this email already exists.') {
            return res.status(400).json({ error: err.message });
        }
        next(err); 
    }
};

exports.getClientById = async (req, res, next) => {
    try {
        const mappedClient = await ClientService.getClientById(req.params.id);
        res.json({ client: mappedClient });
    } catch (err) { 
        if (err.message === 'Client not found') return res.status(404).json({ error: err.message });
        next(err); 
    }
};

exports.updateClient = async (req, res, next) => {
    try {
        if (req.storageResult) {
            req.body.logoUrl = req.storageResult.fileUrl;
        }

        const client = await ClientService.updateClient(req.params.id, req.body);

        if (req.company && req.company.id) {
            await clearCRMCache(req.company.id);
        }

        res.json({ client: { ...client, _id: client.id } });
    } catch (err) { 
        if (err.message === 'A client with this email already exists.') {
            return res.status(400).json({ error: err.message });
        }
        next(err); 
    }
};

exports.deleteClient = async (req, res, next) => {
    try {
        await ClientService.deleteClient(req.params.id);
        await logAction(req.user.id, 'DELETE_CLIENT', 'client', req.params.id, {}, req);
        
        if (req.company && req.company.id) {
            await clearCRMCache(req.company.id);
        }
        
        res.json({ message: 'Client deleted' });
    } catch (err) { next(err); }
};

/* â”€â”€â”€ Communications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

exports.getCommunications = async (req, res, next) => {
    try {
        const communications = await ClientService.getCommunications(req.params.id);
        res.json({ communications });
    } catch (err) { next(err); }
};

exports.createCommunication = async (req, res, next) => {
    try {
        const comm = await ClientService.createCommunication(req.params.id, req.body, req.user);

        await logAction(req.user.id, 'CREATE_CLIENT_COMM', 'client', req.params.id, { subject: req.body.subject }, req);
        
        if (req.company && req.company.id) {
            await clearCRMCache(req.company.id);
        }

        res.status(201).json({ communication: { ...comm, _id: comm.id } });
    } catch (err) { 
        if (err.message === 'Subject is required') return res.status(400).json({ error: err.message });
        next(err); 
    }
};

exports.deleteCommunication = async (req, res, next) => {
    try {
        await ClientService.deleteCommunication(req.params.commId);
        await logAction(req.user.id, 'DELETE_CLIENT_COMM', 'client', req.params.id, {}, req);
        
        if (req.company && req.company.id) {
            await clearCRMCache(req.company.id);
        }

        res.json({ message: 'Communication deleted' });
    } catch (err) { next(err); }
};

/* â”€â”€â”€ Activity Feed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

exports.getActivity = async (req, res, next) => {
    try {
        const activities = await ClientService.getActivity(req.params.id);
        res.json({ activities });
    } catch (err) { next(err); }
};


