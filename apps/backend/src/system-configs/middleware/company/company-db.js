'use strict';

/**
 * Backward compatibility wrapper.
 * The platform has migrated to company-scoped architecture (companyId) in unified PostgreSQL.
 */
const companyContextMiddleware = require('../company/company-context');

module.exports = companyContextMiddleware;
