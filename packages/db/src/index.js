"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompanyPrisma = exports.prisma = exports.basePrisma = exports.requestContext = exports.queryMetricsStorage = exports.Prisma = exports.PrismaClient = void 0;
const client_1 = require("@prisma/client");
Object.defineProperty(exports, "PrismaClient", { enumerable: true, get: function () { return client_1.PrismaClient; } });
Object.defineProperty(exports, "Prisma", { enumerable: true, get: function () { return client_1.Prisma; } });
const async_hooks_1 = require("async_hooks");
exports.queryMetricsStorage = new async_hooks_1.AsyncLocalStorage();
// Global singleton to prevent connection exhaustion in dev
const globalForPrisma = globalThis;
/**
 * Environment-aware Prisma log levels.
 * - Production: only 'error' and 'warn' — never log raw SQL.
 * - Development: 'error' + 'warn', plus 'query' when PRISMA_QUERY_LOGGING=true.
 */
function getPrismaLogLevels() {
    const levels = ['error', 'warn'];
    if (process.env.NODE_ENV !== 'production' && process.env.PRISMA_QUERY_LOGGING === 'true') {
        levels.push('query');
    }
    return levels;
}
exports.requestContext = new async_hooks_1.AsyncLocalStorage();
exports.basePrisma = globalForPrisma.prisma ??
    new client_1.PrismaClient();
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.basePrisma;
exports.prisma = new Proxy(exports.basePrisma, {
    get(target, prop) {
        const context = exports.requestContext.getStore();
        const companyId = context?.companyId;
        if (companyId) {
            const companyPrisma = (0, exports.getCompanyPrisma)(companyId);
            const value = companyPrisma[prop];
            return typeof value === 'function' ? value.bind(companyPrisma) : value;
        }
        const value = target[prop];
        return typeof value === 'function' ? value.bind(target) : value;
    }
});
// Precompute models that have companyId to avoid O(N) traversal on every query
const modelsWithCompanyId = new Set();
if (client_1.Prisma.dmmf && client_1.Prisma.dmmf.datamodel && client_1.Prisma.dmmf.datamodel.models) {
    for (const m of client_1.Prisma.dmmf.datamodel.models) {
        if (m.fields.some((f) => f.name === 'companyId')) {
            modelsWithCompanyId.add(m.name);
        }
    }
}
const GLOBAL_MODELS = new Set([
    'Company', 'PlatformSettings', 'Plan', 'Coupon', 'SuperAdmin',
    'ActivityLog', 'Announcement', 'DeletionLog',
    'FeatureFlag', 'ReleaseNote', 'SupportTicket', 'DocumentPage',
    'ForumPost', 'ForumReply', 'Chat', 'Message',
    'CalendarContentPiece', 'AiRequestLog', 'CalendarEvent'
]);
const FILTER_OPERATIONS = new Set([
    'findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow',
    'findMany', 'update', 'updateMany', 'delete', 'deleteMany',
    'count', 'aggregate', 'groupBy'
]);
// Cache for extended Prisma clients to prevent memory leaks and massive CPU overhead
const companyClients = new Map();
/**
 * Creates a company-scoped Prisma Client.
 * Automatically injects `companyId` into all relevant queries
 * to guarantee Row-Level Security (RLS) across the shared PostgreSQL database.
 */
const getCompanyPrisma = (companyId, onSearchSync) => {
    if (!companyId)
        return exports.basePrisma;
    if (companyClients.has(companyId)) {
        return companyClients.get(companyId);
    }
    const extendedPrisma = exports.basePrisma.$extends({
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }) {
                    // @ts-ignore
                    let anyArgs = args || {};
                    // 1. Company Scope Injection (Before Query)
                    if (!GLOBAL_MODELS.has(model) && modelsWithCompanyId.has(model)) {
                        if (FILTER_OPERATIONS.has(operation)) {
                            if (!anyArgs.where) {
                                anyArgs.where = { companyId };
                            }
                            else if (anyArgs.where.companyId !== companyId) {
                                anyArgs.where.companyId = companyId;
                            }
                        }
                        if (operation === 'create' || operation === 'createMany') {
                            if (operation === 'createMany' && Array.isArray(anyArgs.data)) {
                                for (let i = 0; i < anyArgs.data.length; i++) {
                                    if (anyArgs.data[i])
                                        anyArgs.data[i].companyId = companyId;
                                }
                            }
                            else if (anyArgs.data) {
                                anyArgs.data.companyId = companyId;
                            }
                        }
                        if (operation === 'upsert') {
                            if (!anyArgs.where)
                                anyArgs.where = { companyId };
                            else
                                anyArgs.where.companyId = companyId;
                            if (anyArgs.create)
                                anyArgs.create.companyId = companyId;
                        }
                    }
                    // 2. Fast Path Execution (only log slow queries > 200ms)
                    const isProfilerActive = process.env.PRISMA_PROFILER_LOG === 'true';
                    const perfData = exports.queryMetricsStorage.getStore();
                    if (!isProfilerActive && !perfData && !onSearchSync) {
                        return query(anyArgs);
                    }
                    const startTime = Date.now();
                    const result = await query(anyArgs);
                    const executionTime = Date.now() - startTime;
                    if (executionTime > 200) {
                        console.warn(`[Prisma Profiler - SLOW QUERY] Model: ${model}, Operation: ${operation}, Time: ${executionTime}ms`);
                    }
                    else if (isProfilerActive) {
                        console.log(`[Prisma Profiler] Model: ${model}, Operation: ${operation}, Time: ${executionTime}ms`);
                    }
                    if (perfData) {
                        perfData.numberOfQueries = (perfData.numberOfQueries || 0) + 1;
                        perfData.databaseDuration = (perfData.databaseDuration || 0) + executionTime;
                        if (!perfData.slowestQuery || executionTime > perfData.slowestQuery.ms) {
                            perfData.slowestQuery = { ms: executionTime, query: `${model}.${operation}` };
                        }
                    }
                    if (onSearchSync) {
                        try {
                            onSearchSync(model, operation, result, anyArgs);
                        }
                        catch (e) {
                            console.error(`[SearchSync] Error syncing ${model}:`, e);
                        }
                    }
                    return result;
                },
            },
        },
    });
    extendedPrisma.companyId = companyId;
    companyClients.set(companyId, extendedPrisma);
    return extendedPrisma;
};
exports.getCompanyPrisma = getCompanyPrisma;
