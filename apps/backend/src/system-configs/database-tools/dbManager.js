'use strict';

const { getCompanyPrisma } = require('@workspace/db');

/**
 * Company DB accessor for Prisma/PostgreSQL.
 * Returns the company-scoped extended Prisma client.
 */
exports.getCompanyDb = async (companyId) => {
    if (!companyId) return null;
    return getCompanyPrisma(companyId.toString());
};

exports.getCompanyConnection = (companyId) => {
    if (!companyId) return null;
    return getCompanyPrisma(companyId.toString());
};

exports.destroyCompanyConnection = async () => {
    return true;
};

// Legacy backward-compatibility aliases
exports.getCompanyPrisma = exports.getCompanyDb;
exports.getCompanyConnection = exports.getCompanyConnection;
exports.destroyCompanyConnection = exports.destroyCompanyConnection;
