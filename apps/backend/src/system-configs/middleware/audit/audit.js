'use strict';

const { prisma } = require('@workspace/db');

/**
 * Log an action to the AuditLog table using Prisma.
 * Designed to be called from controllers after successful operations.
 */
async function logAction(userId, action, resourceType = '', resourceId = '', details = {}, req = null) {
    try {
        const prismaClient = (req && req.prisma) ? req.prisma : prisma;
        const companyId = req?.user?.companyId || null;

        await prismaClient.auditLog.create({
            data: {
                userId,
                action,
                resourceType,
                resourceId: resourceId ? String(resourceId) : '',
                details: details || {},
                ipAddress: req?.ip || '',
                userAgent: req?.get?.('user-agent') || '',
                companyId
            }
        });
    } catch (err) {
        // Never throw â€” audit logging should never break the main flow
        console.error('[Audit] Failed to log action:', err.message);
    }
}

module.exports = { logAction };
