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

export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const startTime = Date.now();
        const result = await query(args);
        const executionTime = Date.now() - startTime;
        
        if (executionTime > 200) {
            console.warn(`[Prisma Profiler - SLOW QUERY (GLOBAL)] Model: ${model}, Operation: ${operation}, Time: ${executionTime}ms`);
        } else if (process.env.PRISMA_PROFILER_LOG === 'true') {
            console.log(`[Prisma Profiler (GLOBAL)] Model: ${model}, Operation: ${operation}, Time: ${executionTime}ms`);
        }

        const perfData = queryMetricsStorage.getStore();
        if (perfData) {
            perfData.numberOfQueries = (perfData.numberOfQueries || 0) + 1;
            perfData.databaseDuration = (perfData.databaseDuration || 0) + executionTime;
            if (!perfData.slowestQuery || executionTime > perfData.slowestQuery.ms) {
                perfData.slowestQuery = { ms: executionTime, query: `GLOBAL:${model}.${operation}` };
            }
        }
        return result;
      }
    }
  }
}) as unknown as PrismaClient;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;

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
  if (companyClients.has(companyId)) {
    return companyClients.get(companyId);
  }

  const extendedPrisma = basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          let anyArgs: any = (args as any) || {};

          // 1. Company Scope Injection (Before Query)
          if (!GLOBAL_MODELS.has(model) && modelsWithCompanyId.has(model)) {
            // Force companyId into where clause for read/update/delete operations
            if (['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany', 'update', 'updateMany', 'delete', 'deleteMany', 'count', 'aggregate', 'groupBy'].includes(operation)) {
              anyArgs.where = { ...anyArgs.where, companyId };
            }
            
            // Force companyId into data for create operations
            if (['create', 'createMany'].includes(operation)) {
              if (operation === 'createMany' && Array.isArray(anyArgs.data)) {
                anyArgs.data = anyArgs.data.map((d: any) => ({ ...d, companyId }));
              } else {
                anyArgs.data = { ...anyArgs.data, companyId };
              }
            }
            
            // Upsert is special because it has both where and create/update data
            if (operation === 'upsert') {
               anyArgs.where = { ...anyArgs.where, companyId };
               anyArgs.create = { ...anyArgs.create, companyId };
            }
          }

          // 2. Execute Query with Profiling
          const startTime = Date.now();
          const result = await query(anyArgs);
          const executionTime = Date.now() - startTime;
          
          if (executionTime > 200) { // Log queries taking longer than 200ms
              console.warn(`[Prisma Profiler - SLOW QUERY] Model: ${model}, Operation: ${operation}, Time: ${executionTime}ms`);
          } else if (process.env.PRISMA_PROFILER_LOG === 'true') {
              console.log(`[Prisma Profiler] Model: ${model}, Operation: ${operation}, Time: ${executionTime}ms`);
          }

          // Track per-request metrics if AsyncLocalStorage is active
          const perfData = queryMetricsStorage.getStore();
          if (perfData) {
              perfData.numberOfQueries = (perfData.numberOfQueries || 0) + 1;
              perfData.databaseDuration = (perfData.databaseDuration || 0) + executionTime;
              if (!perfData.slowestQuery || executionTime > perfData.slowestQuery.ms) {
                  perfData.slowestQuery = { ms: executionTime, query: `${model}.${operation}` };
              }
          }

          // 3. Search Sync (After Query)
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

