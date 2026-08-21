import { getCompanyPrisma } from '@workspace/db';

/**
 * Company DB accessor for Prisma/PostgreSQL.
 * Returns the company-scoped extended Prisma client.
 */
export const getCompanyDb = async (companyId: string | number) => {
    if (!companyId) return null;
    return getCompanyPrisma(companyId.toString());
};

export const getCompanyConnection = (companyId: string | number) => {
    if (!companyId) return null;
    return getCompanyPrisma(companyId.toString());
};

export const destroyCompanyConnection = async () => {
    return true;
};
