'use strict';
const express = require('express');
const router = express.Router();
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const { requireAdmin } = require('../../../system-configs/middleware/auth/rbac.js');
// 1. Removed direct model import to enforce company isolation
const FraudDetectionService = require('../finance/FraudDetectionService.js');

// GET /api/invoices
router.get('/', protect, async (req, res, next) => {
    try {
        const { status, clientId, projectId } = req.query;
        const filter = {};

        // Security: Clients should only see their own invoices
        if (req.user.role === 'client') {
            filter.clientId = req.user.id;
        } else if (clientId) {
            filter.clientId = clientId;
        }

        if (projectId) filter.projectId = projectId;
        if (status) filter.status = status;

        const invoices = await req.prisma.invoice.findMany({
            where: filter,
            include: {
                client: { select: { id: true, name: true, email: true, company: true } },
                createdBy: { select: { id: true, name: true } }
            },
            orderBy: { issueDate: 'desc' }
        });

        const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.totalAmount || 0), 0);
        res.json({ invoices, totalRevenue });
    } catch (err) { next(err); }
});

// GET /api/invoices/:id
router.get('/:id', protect, async (req, res, next) => {
    try {
        const invoice = await req.prisma.invoice.findUnique({
            where: { id: req.params.id },
            include: {
                client: { select: { id: true, name: true, email: true, company: true, phone: true, address: true } },
                createdBy: { select: { id: true, name: true } },
                lineItems: true
            }
        });

        if (!invoice) return res.status(404).json({ error: 'Not found' });

        // Security: Client can only view their own invoice
        if (req.user.role === 'client' && invoice.clientId !== (req.user.id)) {
            return res.status(403).json({ error: 'Permission denied' });
        }

        res.json({ invoice });
    } catch (err) { next(err); }
});

// POST /api/invoices
router.post('/', protect, async (req, res, next) => {
    try {
        const { lineItems = [], taxPercent = 0, discount = 0, issueDate = new Date(), ...rest } = req.body;

        // Calculate totals for Fraud Detection (since hooks haven't run yet)
        const subtotal = lineItems.reduce((acc, item) => acc + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
        const totalTax = (subtotal * taxPercent) / 100;
        const totalAmount = subtotal + totalTax - discount;

        const invoiceData = {
            ...rest,
            companyId: req.company.id || req.company._id,
            taxPercent,
            discount,
            issueDate: new Date(issueDate),
            subtotal,
            totalAmount,
            createdById: req.user.id,
        };

        // Run Fraud Detection with actual calculated data
        const { score, notes, fingerprint } = await FraudDetectionService.calculateRisk(invoiceData, req.prisma, 'invoice');
        invoiceData.riskScore = score;
        invoiceData.riskNotes = notes;
        invoiceData.fingerprint = fingerprint;

        if (lineItems.length > 0) {
            invoiceData.lineItems = { create: lineItems };
        }

        const invoice = await req.prisma.invoice.create({ data: invoiceData });
        res.status(201).json({ invoice });
    } catch (err) { next(err); }
});

// PUT /api/invoices/:id
router.put('/:id', protect, async (req, res, next) => {
    try {
        const { lineItems = [], taxPercent = 0, discount = 0, ...rest } = req.body;

        const existing = await req.prisma.invoice.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ error: 'Not found' });

        const updateData = {
            ...rest,
            taxPercent,
            discount,
        };

        if (lineItems.length > 0) {
            updateData.lineItems = { deleteMany: {}, create: lineItems };
        }

        const invoice = await req.prisma.invoice.update({
            where: { id: req.params.id },
            data: updateData
        });

        res.json({ invoice });
    } catch (err) { next(err); }
});

// DELETE /api/invoices/:id
router.delete('/:id', protect, requireAdmin, async (req, res, next) => {
    try {
        await req.prisma.invoice.delete({ where: { id: req.params.id } });
        res.json({ message: 'Deleted' });
    } catch (err) { next(err); }
});

module.exports = router;
