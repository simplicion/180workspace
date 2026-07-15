'use strict';

const { prisma } = require('@workspace/db');

exports.list = async (req, res) => {
    try {
        const maskedUri = (process.env.DATABASE_URL || '').replace(/:([^:]+):([^@]+)@/, '://$1:****@');
        const systemNode = {
            _id: 'system',
            companyName: 'SYSTEM INFRASTRUCTURE',
            adminEmail: 'PLATFORM_CORE',
            maskedUri: maskedUri || 'DEFAULT_DATABASE_URL',
            databaseConfigured: true,
            subscriptionStatus: 'active',
            isSystem: true
        };

        const companies = await prisma.company.findMany();
        const result = companies.map(c => ({
            _id: c.id,
            companyName: c.name,
            adminEmail: c.adminEmail,
            maskedUri: maskedUri,
            databaseConfigured: c.databaseConfigured,
            subscriptionStatus: c.subscriptionStatus,
        }));
        res.json({ databases: [systemNode, ...result] });
    } catch { res.status(500).json({ error: 'Failed to list databases' }); }
};

exports.testConnection = async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'healthy', message: 'Connection successful' });
    } catch (err) {
        res.json({ status: 'error', message: err.message || 'Failed to connect' });
    }
};
