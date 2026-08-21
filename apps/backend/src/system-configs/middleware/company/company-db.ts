/**
 * Backward compatibility wrapper.
 * The platform has migrated to company-scoped architecture (companyId) in unified PostgreSQL.
 */
import companyContextMiddleware from '../company/company-context';

export default companyContextMiddleware;
