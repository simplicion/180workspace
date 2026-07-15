'use strict';

const { getTenantPrisma } = require('@workspace/db');

/**
 * dbManager compatibility layer for Prisma/PostgreSQL.
 * Shims Mongoose connection methods to return the extended tenant Prisma client.
 */
exports.getTenantDb = async (tenantId) => {
    if (!tenantId) return null;
    return getTenantPrisma(tenantId.toString());
};

exports.getTenantConnection = (tenantId) => {
    if (!tenantId) return null;
    return getTenantPrisma(tenantId.toString());
};

exports.destroyTenantConnection = async (tenantId) => {
    return true;
};
