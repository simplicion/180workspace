import { PrismaClient, Prisma } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

export { PrismaClient, Prisma };

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

export const requestContext = new AsyncLocalStorage<{ companyId?: string, userId?: string, [key: string]: any }>();

export const SAFE_QUERY_LIMIT = 100;
export const MAX_ALLOWED_TAKE = 500;

/**
 * Universal Query Guardrail
 * Protects database and Node memory from unbounded O(N) queries across all models.
 */
export function applyQueryGuardrails(model: string, operation: string, anyArgs: any): any {
  if (operation === 'findMany') {
    const bypass = anyArgs?._bypassGuardrail === true || anyArgs?.where?._bypassGuardrail === true;
    if (bypass) {
      if (anyArgs?._bypassGuardrail !== undefined) delete anyArgs._bypassGuardrail;
      if (anyArgs?.where?._bypassGuardrail !== undefined) delete anyArgs.where._bypassGuardrail;
      return anyArgs;
    }

    if (anyArgs.take === undefined || anyArgs.take === null) {
      anyArgs.take = SAFE_QUERY_LIMIT;
      if (process.env.NODE_ENV !== 'production' && process.env.PRISMA_GUARDRAIL_SILENT !== 'true') {
        console.warn(`[Prisma Guardrail] Auto-capped unbounded findMany on '${model}' to ${SAFE_QUERY_LIMIT} records.`);
      }
    } else if (typeof anyArgs.take === 'number' && anyArgs.take > MAX_ALLOWED_TAKE) {
      if (process.env.NODE_ENV !== 'production' && process.env.PRISMA_GUARDRAIL_SILENT !== 'true') {
        console.warn(`[Prisma Guardrail] Clamped excessive take (${anyArgs.take}) on '${model}' to ${MAX_ALLOWED_TAKE}.`);
      }
      anyArgs.take = MAX_ALLOWED_TAKE;
    }
  }
  return anyArgs;
}

// Precompute FK scalar -> object relation map across all models from Prisma DMMF
const modelFkToRelationMap = new Map<string, Record<string, string>>();

if ((Prisma as any).dmmf && (Prisma as any).dmmf.datamodel && (Prisma as any).dmmf.datamodel.models) {
  for (const m of (Prisma as any).dmmf.datamodel.models) {
    const fkMap: Record<string, string> = {};
    for (const f of m.fields) {
      if (f.kind === 'object' && f.relationFromFields && f.relationFromFields.length === 1) {
        fkMap[f.relationFromFields[0]] = f.name;
      }
    }
    modelFkToRelationMap.set(m.name.toLowerCase(), fkMap);
    modelFkToRelationMap.set(m.name, fkMap);
  }
}

// Universal Model Data Normalizer to convert flat foreign keys to Prisma object connects
export const sanitizeModelData = (modelName: string, dataObj: any, isUpdate = false) => {
  if (!dataObj || typeof dataObj !== 'object') return;
  const m = modelName.toLowerCase();
  const fkMap = modelFkToRelationMap.get(m) || modelFkToRelationMap.get(modelName);

  if (fkMap) {
    for (const [fkField, relName] of Object.entries(fkMap)) {
      if (fkField in dataObj) {
        const val = dataObj[fkField];
        if (typeof val === 'string' && val.trim() !== '' && val !== 'null' && val !== 'undefined') {
          if (!dataObj[relName]) {
            dataObj[relName] = { connect: { id: val.trim() } };
          }
        } else if (isUpdate && val === null) {
          if (!dataObj[relName]) {
            dataObj[relName] = { disconnect: true };
          }
        }
        delete dataObj[fkField];
      }
    }
  }

  // Handle special aliases
  if (m === 'lead') {
    if (dataObj.company && typeof dataObj.company === 'object' && (dataObj.company.connect || dataObj.company.create)) {
      if (!dataObj.tenantCompany) dataObj.tenantCompany = dataObj.company;
      delete dataObj.company;
    }
  }
};

export const rawPrisma: any =
  globalForPrisma.prisma ??
  new PrismaClient({ log: getPrismaLogLevels() });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = rawPrisma;

export const basePrisma: any = (rawPrisma as any).$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }: any) {
        let anyArgs: any = args || {};
        if (operation === 'create' || operation === 'update' || operation === 'updateMany') {
          if (anyArgs.data) sanitizeModelData(model, anyArgs.data, operation.startsWith('update'));
        } else if (operation === 'createMany' && Array.isArray(anyArgs.data)) {
          for (let i = 0; i < anyArgs.data.length; i++) {
            sanitizeModelData(model, anyArgs.data[i], false);
          }
        } else if (operation === 'upsert') {
          if (anyArgs.create) sanitizeModelData(model, anyArgs.create, false);
          if (anyArgs.update) sanitizeModelData(model, anyArgs.update, true);
        }
        anyArgs = applyQueryGuardrails(model, operation, anyArgs);
        return query(anyArgs);
      }
    }
  }
});

export const prisma: any = new Proxy(basePrisma, {
  get(target, prop) {
    const context = requestContext.getStore();
    const companyId = context?.companyId;
    if (companyId) {
      const companyPrisma = getCompanyPrisma(companyId);
      const value = (companyPrisma as any)[prop];
      return typeof value === 'function' ? value.bind(companyPrisma) : value;
    }
    const value = (target as any)[prop];
    return typeof value === 'function' ? value.bind(target) : value;
  }
});

// Precompute models that have companyId to avoid O(N) traversal on every query
const modelsWithCompanyId = new Set<string>();
const modelCompanyStrategy = new Map<string, 'tenantCompany' | 'company' | 'companyId'>();

if ((Prisma as any).dmmf && (Prisma as any).dmmf.datamodel && (Prisma as any).dmmf.datamodel.models) {
  for (const m of (Prisma as any).dmmf.datamodel.models) {
    const hasTenantCompany = m.fields.find((f: any) => f.name === 'tenantCompany' && f.kind === 'object');
    const hasCompanyObj = m.fields.find((f: any) => f.name === 'company' && f.kind === 'object');
    const hasCompanyIdScalar = m.fields.find((f: any) => f.name === 'companyId');

    if (hasTenantCompany || hasCompanyObj || hasCompanyIdScalar) {
      modelsWithCompanyId.add(m.name);
      modelsWithCompanyId.add(m.name.toLowerCase());
      modelsWithCompanyId.add(m.name.charAt(0).toLowerCase() + m.name.slice(1));
    }

    const strat = hasTenantCompany ? 'tenantCompany' : hasCompanyObj ? 'company' : 'companyId';
    modelCompanyStrategy.set(m.name, strat);
    modelCompanyStrategy.set(m.name.toLowerCase(), strat);
    modelCompanyStrategy.set(m.name.charAt(0).toLowerCase() + m.name.slice(1), strat);
  }
}

// Truly global platform-level models that are NOT partitioned by company
const GLOBAL_MODELS = new Set([
  'Company', 'PlatformSettings', 'Plan', 'Coupon', 'SuperAdmin',
  'FeatureFlag', 'ReleaseNote', 'SupportTicket', 'DeletionLog',
  'company', 'platformSettings', 'plan', 'coupon', 'superAdmin',
  'featureFlag', 'releaseNote', 'supportTicket', 'deletionLog'
]);

const FILTER_OPERATIONS = new Set([
  'findFirst', 'findFirstOrThrow',
  'findMany', 'updateMany', 'deleteMany',
  'count', 'aggregate', 'groupBy'
]);

// Helper to inject company into data object according to model DMMF strategy
const injectCompanyOnData = (modelName: string, dataObj: any, cId: string) => {
  if (!dataObj || typeof dataObj !== 'object') return;
  sanitizeModelData(modelName, dataObj, false);
  if (!cId || cId === 'global') return;
  const strategy = modelCompanyStrategy.get(modelName) ||
                   modelCompanyStrategy.get(modelName.toLowerCase()) ||
                   modelCompanyStrategy.get(modelName.charAt(0).toLowerCase() + modelName.slice(1));
  if (!strategy) return;

  if (strategy === 'tenantCompany') {
    if (!dataObj.tenantCompany) {
      dataObj.tenantCompany = { connect: { id: cId } };
    }
    delete dataObj.companyId;
  } else if (strategy === 'company') {
    if (!dataObj.company || typeof dataObj.company !== 'object' || (!dataObj.company.connect && !dataObj.company.create)) {
      dataObj.company = { connect: { id: cId } };
    }
    delete dataObj.companyId;
  } else if (strategy === 'companyId') {
    if (!dataObj.companyId) {
      dataObj.companyId = cId;
    }
  }
};

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
): any => {
  if (!companyId) return basePrisma;
  
  if (companyClients.has(companyId)) {
    return companyClients.get(companyId);
  }

  const extendedPrisma = (basePrisma as any).$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          // @ts-ignore
          let anyArgs: any = args || {};

          // Sanitize data relation inputs
          if (operation === 'create' || operation === 'update' || operation === 'updateMany') {
            if (anyArgs.data) sanitizeModelData(model, anyArgs.data, operation.startsWith('update'));
          } else if (operation === 'createMany' && Array.isArray(anyArgs.data)) {
            for (let i = 0; i < anyArgs.data.length; i++) {
              sanitizeModelData(model, anyArgs.data[i], false);
            }
          } else if (operation === 'upsert') {
            if (anyArgs.create) sanitizeModelData(model, anyArgs.create, false);
            if (anyArgs.update) sanitizeModelData(model, anyArgs.update, true);
          }

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
                  injectCompanyOnData(model, anyArgs.data[i], companyId);
                }
              } else if (anyArgs.data) {
                injectCompanyOnData(model, anyArgs.data, companyId);
              }
            }
            
            if (operation === 'upsert') {
               if (anyArgs.create) {
                 injectCompanyOnData(model, anyArgs.create, companyId);
               }
            }
          }

          // 2. Query Guardrail (Prevent Unbounded O(N) Memory Exhaustion)
          anyArgs = applyQueryGuardrails(model, operation, anyArgs);

          // 3. Fast Path Execution (only log slow queries > 200ms)
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
