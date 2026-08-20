'use strict';
const { InvoiceService } = require('@workspace/finance');

exports.getInvoices = async (req, res, next) => {
    try {
        const { status, clientId, projectId } = req.query;
        const filter = { companyId: req.user.companyId };

        if (req.user.role === 'client') {
            filter.clientId = req.user.id;
        } else if (clientId) {
            filter.clientId = clientId;
        }

        if (projectId) filter.projectId = projectId;
        if (status) filter.status = status;

        const { invoices, totalRevenue } = await InvoiceService.getInvoices(filter);
        res.json({ invoices, totalRevenue });
    } catch (err) { next(err); }
};

exports.getInvoiceById = async (req, res, next) => {
    try {
        const invoice = await InvoiceService.getInvoiceById(req.user.companyId, req.params.id);

        if (req.user.role === 'client' && invoice.clientId !== req.user.id) {
            return res.status(403).json({ error: 'Permission denied' });
        }

        res.json({ invoice });
    } catch (err) { next(err); }
};

exports.createInvoice = async (req, res, next) => {
    try {
        const invoice = await InvoiceService.createInvoice(req.user.companyId, req.body, req.user);
        res.status(201).json({ invoice });
    } catch (err) { next(err); }
};

exports.updateInvoice = async (req, res, next) => {
    try {
        const invoice = await InvoiceService.updateInvoice(req.params.id, req.user.companyId, req.body);
        res.json({ invoice });
    } catch (err) { 
        if (err.message === 'Not found') {
            return res.status(404).json({ error: 'Not found' });
        }
        next(err); 
    }
};

exports.deleteInvoice = async (req, res, next) => {
    try {
        const result = await InvoiceService.deleteInvoice(req.params.id, req.user.companyId);
        res.json(result);
    } catch (err) { next(err); }
};
