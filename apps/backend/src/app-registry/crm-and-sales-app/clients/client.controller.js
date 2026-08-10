'use strict';

const { logAction } = require('../../../system-configs/middleware/audit/audit.js');
const { triggerN8nWebhook } = require('../../../platform-core/platform-integrations/webhooks/webhook.routes');
const AutomationService = require('../../../platform-core/platform-communications/services/automation.service');
const { cacheDel } = require('../../../system-configs/middleware/system/cache.js');
const bcrypt = require('bcryptjs');
const { sendWelcomeEmail } = require('../../productivity-tools-app/emails/email.service');

const clearCRMCache = async (companyId) => {
    if (!companyId) return;
    await cacheDel(`company:${companyId}:dashboard_metrics_v2`);
    await cacheDel(`company:${companyId}:forecasting`);
    await cacheDel(`company:${companyId}:productivity`);
};

exports.getClients = async (req, res, next) => {
    try {
        const Client = req.prisma.client;
        const { search, page = 1, limit = 50 } = req.query;
        const query = {};

        if (search) {
            query.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const [clients, total] = await Promise.all([
            Client.findMany({
                where: query,
                skip,
                take,
                orderBy: { name: 'asc' }
            }),
            Client.count({ where: query }),
        ]);

        const mappedClients = clients.map(c => ({
            ...c,
            _id: c.id
        }));

        res.json({ clients: mappedClients, total });
    } catch (err) { next(err); }
};

exports.createClient = async (req, res, next) => {
    try {
        const Client = req.prisma.client;
        
        const createData = { ...req.body };
        
        if (createData.email && createData.email.trim() !== '') {
            const existingClient = await Client.findFirst({ where: { email: createData.email } });
            if (existingClient) {
                return res.status(400).json({ error: 'A client with this email already exists.' });
            }
        }

        if (!createData.clientId) {
            const count = await Client.count();
            createData.clientId = `CLT-${String(count + 1).padStart(4, '0')}`;
        }
        
        if (createData.company !== undefined) {
            createData.companyName = createData.company;
            delete createData.company;
        }
        if (req.company && req.company.id) {
            createData.companyId = req.company.id;
        }

        const givePortalAccess = createData.givePortalAccess === true || createData.givePortalAccess === 'true';
        const password = createData.password;
        
        delete createData.givePortalAccess;
        delete createData.password;

        const client = await Client.create({
            data: createData
        });

        await logAction(req.user.id, 'CREATE_CLIENT', 'client', client.id, { name: client.name }, req);

        // Trigger Automation for new client
        await AutomationService.trigger({
            eventType: 'client_created',
            triggeredBy: req.user.id,
            targetUser: client.id,
            relatedItem: { itemId: client.id, itemModel: 'Client' },
            description: `New client account created for ${client.name}`,
            metadata: { clientName: client.name }
        }, req.prisma);

        // Trigger n8n automation for new client onboarding (Optional/Legacy)
        await triggerN8nWebhook('new-client', {
            clientId: client.id,
            name: client.name,
            email: client.email
        }).catch(() => { });

        if (givePortalAccess && password && client.email) {
            const User = req.prisma.user;
            const existingUser = await User.findFirst({ where: { email: client.email } });
            if (!existingUser) {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);
                
                const clientUser = await User.create({
                    data: {
                        name: client.name,
                        email: client.email,
                        password: hashedPassword,
                        role: 'client',
                        isActive: true
                    }
                });

                // Send welcome email with credentials
                try {
                    await sendWelcomeEmail(clientUser, password, req.prisma);
                } catch (emailErr) {
                    console.error('Failed to send welcome email to client:', emailErr);
                }
            }
        }

        if (req.company && req.company.id && typeof clearCRMCache === 'function') {
            await clearCRMCache(req.company.id);
        }

        res.status(201).json({ client: { ...client, _id: client.id } });
    } catch (err) { next(err); }
};

exports.getClientById = async (req, res, next) => {
    try {
        const Client = req.prisma.client;
        const client = await Client.findUnique({
            where: { id: req.params.id }
        });
        if (!client) return res.status(404).json({ error: 'Client not found' });

        const mappedClient = {
            ...client,
            _id: client.id,
            projectIds: [],
            projects: []
        };
        res.json({ client: mappedClient });
    } catch (err) { next(err); }
};

exports.updateClient = async (req, res, next) => {
    try {
        const Client = req.prisma.client;
        if (req.storageResult) {
            req.body.logoUrl = req.storageResult.fileUrl;
        }

        // Clean body to prevent Prisma validation errors
        const updateData = { ...req.body };
        delete updateData.id;
        delete updateData._id;

        if (updateData.company !== undefined) {
            updateData.companyName = updateData.company;
            delete updateData.company;
        }

        if (updateData.email && updateData.email.trim() !== '') {
            const existingClient = await Client.findFirst({ 
                where: { 
                    email: updateData.email,
                    id: { not: req.params.id }
                } 
            });
            if (existingClient) {
                return res.status(400).json({ error: 'A client with this email already exists.' });
            }
        }

        const client = await Client.update({
            where: { id: req.params.id },
            data: updateData
        });

        if (req.company && req.company.id && typeof clearCRMCache === 'function') {
            await clearCRMCache(req.company.id);
        }

        res.json({ client: { ...client, _id: client.id } });
    } catch (err) { next(err); }
};

exports.deleteClient = async (req, res, next) => {
    try {
        const Client = req.prisma.client;
        await Client.delete({
            where: { id: req.params.id }
        });
        await logAction(req.user.id, 'DELETE_CLIENT', 'client', req.params.id, {}, req);
        
        if (req.company && req.company.id && typeof clearCRMCache === 'function') {
            await clearCRMCache(req.company.id);
        }
        
        res.json({ message: 'Client deleted' });
    } catch (err) { next(err); }
};

/* â”€â”€â”€ Communications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

exports.getCommunications = async (req, res, next) => {
    try {
        const Comm = req.prisma.clientCommunication;
        const communications = await Comm.findMany({
            where: { clientId: req.params.id },
            include: {
                loggedBy: {
                    select: { name: true }
                }
            },
            orderBy: { date: 'desc' }
        });

        const mappedComms = communications.map(c => ({
            ...c,
            _id: c.id,
            loggedBy: { name: c.loggedByName || c.loggedBy?.name || 'System' }
        }));

        res.json({ communications: mappedComms });
    } catch (err) { next(err); }
};

exports.createCommunication = async (req, res, next) => {
    try {
        const Comm = req.prisma.clientCommunication;
        const { type, subject, summary, date } = req.body;

        if (!subject) return res.status(400).json({ error: 'Subject is required' });

        const comm = await Comm.create({
            data: {
                clientId: req.params.id,
                type: type || 'note',
                subject,
                summary: summary || '',
                date: date ? new Date(date) : new Date(),
                loggedById: req.user.id,
                loggedByName: req.user.name,
            }
        });

        await logAction(req.user.id, 'CREATE_CLIENT_COMM', 'client', req.params.id, { subject }, req);
        
        if (req.company && req.company.id && typeof clearCRMCache === 'function') {
            await clearCRMCache(req.company.id);
        }

        res.status(201).json({ communication: { ...comm, _id: comm.id } });
    } catch (err) { next(err); }
};

exports.deleteCommunication = async (req, res, next) => {
    try {
        const Comm = req.prisma.clientCommunication;
        await Comm.delete({
            where: { id: req.params.commId }
        });
        await logAction(req.user.id, 'DELETE_CLIENT_COMM', 'client', req.params.id, {}, req);
        
        if (req.company && req.company.id && typeof clearCRMCache === 'function') {
            await clearCRMCache(req.company.id);
        }

        res.json({ message: 'Communication deleted' });
    } catch (err) { next(err); }
};

/* â”€â”€â”€ Activity Feed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

exports.getActivity = async (req, res, next) => {
    try {
        const AuditLog = req.prisma.auditLog;
        const logs = await AuditLog.findMany({
            where: { resourceId: req.params.id },
            include: {
                user: {
                    select: { name: true, role: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        const activities = logs.map(log => ({
            id: log.id,
            action: log.action,
            content: formatActivityContent(log),
            date: log.createdAt,
            user: log.user?.name || 'System',
            role: log.user?.role || 'system',
        }));

        res.json({ activities });
    } catch (err) { next(err); }
};

function formatActivityContent(log) {
    const map = {
        'CREATE_CLIENT': 'Client profile created',
        'UPDATE_CLIENT': 'Client profile updated',
        'DELETE_CLIENT': 'Client removed',
        'CREATE_CLIENT_COMM': `Interaction logged: ${log.details?.subject || ''}`,
        'CREATE_INVOICE': `Invoice created: ${log.details?.invoiceNumber || ''}`,
        'UPDATE_INVOICE': `Invoice status updated`,
        'CREATE_PROJECT': `Project linked: ${log.details?.name || ''}`,
    };
    return map[log.action] || log.action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
}
