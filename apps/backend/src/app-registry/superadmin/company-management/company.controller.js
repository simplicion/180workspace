const { prisma } = require('@workspace/db');
'use strict';
const bcrypt = require('bcryptjs');

exports.list = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', status } = req.query;
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const where = {};

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { adminEmail: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (status) where.subscriptionStatus = status;

        const [companies, total] = await Promise.all([
            prisma.company.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
            }).company.count({ where }),
        ]);

        res.json({ companies, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
    } catch (err) {
        console.error('[Company Controller] List failed:', err.message);
        res.status(500).json({ error: 'Failed to list companies' });
    }
};

exports.getOne = async (req, res) => {
    try {
        const company = await prisma.company.findUnique({
            where: { id: req.params.id },
        });
        if (!company) return res.status(404).json({ error: 'Company not found' });

        const subscriptions = await prisma.subscription.findMany({
            where: { companyId: company.id },
            include: {
                plan: { select: { id: true, name: true, price: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });

        res.json({ company, subscriptions });
    } catch (err) {
        console.error('[Company Controller] GetOne failed:', err.message);
        res.status(500).json({ error: 'Failed to fetch company' });
    }
};

exports.suspend = async (req, res) => {
    try {
        const { reason } = req.body;
        const company = await prisma.company.update({
            where: { id: req.params.id },
            data: {
                accountStatus: 'suspended',
                subscriptionStatus: 'suspended',
                metadata: { suspendedReason: reason, suspendedAt: new Date().toISOString() },
            },
        });
        res.json({ message: 'Company suspended', company });
    } catch (err) {
        if (err.code === 'P2025') return res.status(404).json({ error: 'Company not found' });
        console.error('[Company Controller] Suspend failed:', err.message);
        res.status(500).json({ error: 'Failed to suspend company' });
    }
};

exports.unsuspend = async (req, res) => {
    try {
        const company = await prisma.company.update({
            where: { id: req.params.id },
            data: {
                accountStatus: 'active',
                subscriptionStatus: 'active',
                metadata: {},
            },
        });
        res.json({ message: 'Company unsuspended', company });
    } catch (err) {
        if (err.code === 'P2025') return res.status(404).json({ error: 'Company not found' });
        console.error('[Company Controller] Unsuspend failed:', err.message);
        res.status(500).json({ error: 'Failed to unsuspend company' });
    }
};

exports.deleteCompany = async (req, res) => {
    try {
        const { confirm } = req.body;
        if (confirm !== 'DELETE') return res.status(400).json({ error: 'Please type DELETE to confirm' });

        // Use LifecycleService for comprehensive cleanup (Users, Mappings, Subscriptions, Company DB)
        await LifecycleService.performFullDelete(req.params.id);

        res.json({ message: 'Company and all associated data deleted permanently' });
    } catch (err) {
        console.error('[Company Controller] Delete failed:', err.message);
        res.status(500).json({ error: `Failed to delete company: ${err.message}` });
    }
};

exports.bulkDelete = async (req, res) => {
    try {
        const { companyIds, confirm } = req.body;
        if (confirm !== 'DELETE') return res.status(400).json({ error: 'Please type DELETE to confirm' });
        if (!Array.isArray(companyIds) || companyIds.length === 0) {
            return res.status(400).json({ error: 'No companies selected' });
        }

        const results = { success: [], failed: [], total: companyIds.length };
        
        console.log(`[Company Controller] Starting bulk delete for ${companyIds.length} companies...`);

        // We process sequentially to avoid overloading the system during DB drops
        for (const id of companyIds) {
            try {
                await LifecycleService.performFullDelete(id);
                results.success.push(id);
                console.log(`[Company Controller] Bulk delete success for: ${id}`);
            } catch (err) {
                console.error(`[Company Controller] Bulk delete failed for ${id}:`, err.message);
                results.failed.push({ id, error: err.message });
            }
        }

        const successCount = results.success.length;
        const failCount = results.failed.length;

        res.json({ 
            message: `Processed ${companyIds.length} companies: ${successCount} deleted, ${failCount} failed.`,
            results,
            success: successCount > 0
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to process bulk deletion' });
    }
};

exports.resetAdminPassword = async (req, res) => {
    try {
        const company = await prisma.company.findUnique({ where: { id: req.params.id } });
        if (!company) return res.status(404).json({ error: 'Company not found' });

        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters' });
        }

        const hashed = await bcrypt.hash(newPassword, 12);
        await prisma.user.updateMany({
            where: { email: company.adminEmail },
            data: { password: hashed },
        });

        res.json({ message: `Admin password reset for ${company.adminEmail}` });
    } catch (err) {
        console.error('[Company Controller] Reset password failed:', err.message);
        res.status(500).json({ error: 'Failed to reset password' });
    }
};

const LifecycleService = require('../system-operations/lifecycle.service');

exports.create = async (req, res) => {
    try {
        let company = await prisma.company.create({ data: req.body });
        // Initialize Lifecycle fields (Trial Dates, Status)
        company = await LifecycleService.handleOnboarding(company);
        res.status(201).json({ company });
    } catch (err) {
        if (err.code === 'P2002') {
            return res.status(400).json({ error: 'Company with this email or name already exists' });
        }
        console.error('[Company Controller] Create failed:', err.message);
        res.status(500).json({ error: 'Failed to create company' });
    }
};
