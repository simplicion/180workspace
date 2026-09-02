import { PrismaClient, Prisma } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';
export { PrismaClient, Prisma };
export declare const queryMetricsStorage: AsyncLocalStorage<any>;
export declare const requestContext: AsyncLocalStorage<{
    [key: string]: any;
    companyId?: string;
    userId?: string;
}>;
export declare const basePrisma: PrismaClient<Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export declare const prisma: PrismaClient<Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
/**
 * Creates a company-scoped Prisma Client.
 * Automatically injects `companyId` into all relevant queries
 * to guarantee Row-Level Security (RLS) across the shared PostgreSQL database.
 */
export declare const getCompanyPrisma: (companyId: string, onSearchSync?: (model: string, operation: string, result: any, args: any) => void) => any;
