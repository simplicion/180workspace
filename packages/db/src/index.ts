import { PrismaClient, Prisma } from '../generated/client/index.js';
import { AsyncLocalStorage } from 'async_hooks';

export const queryMetricsStorage = new AsyncLocalStorage<any>();

// Global singleton to prevent connection exhaustion in dev
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Environment-aware Prisma log levels.
 * - Production: only 'error' and 'warn' — never log raw SQL.
 * - Development: 'error' + 'warn', plus 'query' when PRISMA_QUERY_LOGGING=true.
 */
function getPrismaLogLevels(): Prisma.LogLevel[] {
  const levels: Prisma.LogLevel[] = ['error', 'warn'];
  if (process.env.NODE_ENV !== 'production' && process.env.PRISMA_QUERY_LOGGING === 'true') {
    levels.push('query');
  }
  return levels;
}

export const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: getPrismaLogLevels(),
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;

export const prisma = basePrisma;

// Precompute models that have companyId to avoid O(N) traversal on every query
const modelsWithCompanyId = new Set<string>();
if ((Prisma as any).dmmf && (Prisma as any).dmmf.datamodel && (Prisma as any).dmmf.datamodel.models) {
  for (const m of (Prisma as any).dmmf.datamodel.models) {
    if (m.fields.some((f: any) => f.name === 'companyId')) {
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
const companyClients = new Map<string, any>();

/**
 * Creates a company-scoped Prisma Client.
 * Automatically injects `companyId` into all relevant queries
 * to guarantee Row-Level Security (RLS) across the shared PostgreSQL database.
 */
export const getCompanyPrisma = (
  companyId: string,
  onSearchSync?: (model: string, operation: string, result: any, args: any) => void
) => {
  if (!companyId) return basePrisma;
  
  if (companyClients.has(companyId)) {
    return companyClients.get(companyId);
  }

  const extendedPrisma = basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          let anyArgs: any = args || {};

          // 1. Company Scope Injection (Before Query)
          if (!GLOBAL_MODELS.has(model) && modelsWithCompanyId.has(model)) {
            if (FILTER_OPERATIONS.has(operation)) {
              if (!anyArgs.where) {
                anyArgs.where = { companyId };
              } else if (anyArgs.where.companyId !== companyId) {
                anyArgs.where.companyId = companyId;
              }
            }
            
            if (operation === 'create' || operation === 'createMany') {
              if (operation === 'createMany' && Array.isArray(anyArgs.data)) {
                for (let i = 0; i < anyArgs.data.length; i++) {
                  if (anyArgs.data[i]) anyArgs.data[i].companyId = companyId;
                }
              } else if (anyArgs.data) {
                anyArgs.data.companyId = companyId;
              }
            }
            
            if (operation === 'upsert') {
               if (!anyArgs.where) anyArgs.where = { companyId };
               else anyArgs.where.companyId = companyId;
               if (anyArgs.create) anyArgs.create.companyId = companyId;
            }
          }

          // 2. Fast Path Execution (only log slow queries > 200ms)
          const isProfilerActive = process.env.PRISMA_PROFILER_LOG === 'true';
          const perfData = queryMetricsStorage.getStore();

          if (!isProfilerActive && !perfData && !onSearchSync) {
            return query(anyArgs);
          }

          const startTime = Date.now();
          const result = await query(anyArgs);
          const executionTime = Date.now() - startTime;
          
          if (executionTime > 200) {
              console.warn(`[Prisma Profiler - SLOW QUERY] Model: ${model}, Operation: ${operation}, Time: ${executionTime}ms`);
          } else if (isProfilerActive) {
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
            } catch (e) {
              console.error(`[SearchSync] Error syncing ${model}:`, e);
            }
          }

          return result;
        },
      },
    },
  });

  (extendedPrisma as any).companyId = companyId;
  companyClients.set(companyId, extendedPrisma);
  
  return extendedPrisma;
};
