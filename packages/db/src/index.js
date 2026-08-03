'use strict';

const { PrismaClient, Prisma } = require('../generated/client/index.js');
const { AsyncLocalStorage } = require('async_hooks');

const queryMetricsStorage = new AsyncLocalStorage();

// Global singleton to prevent connection exhaustion in dev
const globalForPrisma = globalThis;

function getPrismaLogLevels() {
  const levels = ['error', 'warn'];
  if (process.env.NODE_ENV !== 'production' && process.env.PRISMA_QUERY_LOGGING === 'true') {
    levels.push('query');
  }
  return levels;
}

const basePrisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: getPrismaLogLevels(),
  });

const prisma = basePrisma.$extends({
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
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;

const modelsWithCompanyId = new Set();
if (Prisma && Prisma.dmmf && Prisma.dmmf.datamodel && Prisma.dmmf.datamodel.models) {
  for (const m of Prisma.dmmf.datamodel.models) {
    if (m.fields && m.fields.some((f) => f.name === 'companyId')) {
      modelsWithCompanyId.add(m.name);
    }
  }
}

const GLOBAL_MODELS = new Set([
  'Company', 'PlatformSettings', 'Plan', 'Coupon', 'SuperAdmin',
  'TenantUserMapping', 'ActivityLog', 'Announcement', 'DeletionLog',
  'FeatureFlag', 'ReleaseNote', 'SupportTicket', 'DocumentPage',
  'ForumPost', 'ForumReply', 'Chat', 'Message',
  'CalendarContentPiece', 'AiRequestLog', 'CalendarEvent'
]);

const tenantClients = new Map();

const getTenantPrisma = (
  companyId,
  onSearchSync
) => {
  if (tenantClients.has(companyId)) {
    return tenantClients.get(companyId);
  }

  const extendedPrisma = basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          let anyArgs = args || {};

          // 1. Tenant Injection (Before Query)
          if (!GLOBAL_MODELS.has(model) && modelsWithCompanyId.has(model)) {
            if (['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany', 'update', 'updateMany', 'delete', 'deleteMany', 'count', 'aggregate', 'groupBy'].includes(operation)) {
              anyArgs.where = { ...anyArgs.where, companyId };
            }
            
            if (['create', 'createMany'].includes(operation)) {
              if (operation === 'createMany' && Array.isArray(anyArgs.data)) {
                anyArgs.data = anyArgs.data.map((d) => ({ ...d, companyId }));
              } else {
                anyArgs.data = { ...anyArgs.data, companyId };
              }
            }
            
            if (operation === 'upsert') {
               anyArgs.where = { ...anyArgs.where, companyId };
               anyArgs.create = { ...anyArgs.create, companyId };
            }
          }

          // 2. Execute Query with Profiling
          const startTime = Date.now();
          const result = await query(anyArgs);
          const executionTime = Date.now() - startTime;
          
          if (executionTime > 200) {
              console.warn(`[Prisma Profiler - SLOW QUERY] Model: ${model}, Operation: ${operation}, Time: ${executionTime}ms`);
          } else if (process.env.PRISMA_PROFILER_LOG === 'true') {
              console.log(`[Prisma Profiler] Model: ${model}, Operation: ${operation}, Time: ${executionTime}ms`);
          }

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

  extendedPrisma.companyId = companyId;
  tenantClients.set(companyId, extendedPrisma);
  
  return extendedPrisma;
};

module.exports = {
  queryMetricsStorage,
  basePrisma,
  prisma,
  getTenantPrisma,
  GLOBAL_MODELS,
  modelsWithCompanyId,
  PrismaClient,
  Prisma
};
