'use strict';
const jwt = require('jsonwebtoken');
const { prisma, getTenantPrisma } = require('@workspace/db');
const SearchService = require('../../../platform-core/platform-integrations/services/search.service');

// No more mongoose models, we use prisma


const memoryCache = new Map();

function getFromMemoryCache(key) {
    const item = memoryCache.get(key);
    if (item && item.expiry > Date.now()) return item.value;
    return null;
}

function setToMemoryCache(key, value, ttlSeconds = 60) {
    memoryCache.set(key, { value, expiry: Date.now() + (ttlSeconds * 1000) });
}

/**
 * Middleware to intercept requests, identify the tenant (company),
 * and attach the tenant's database connection to the request object.
 */
async function tenantDbMiddleware(req, res, next) {
    try {
        // FAST FAIL: Check if Prisma is available
        if (!prisma) {
            console.error(`[Tenant DB] Prisma global client NOT connected.`);
            return res.status(503).json({
                error: 'Database connection is currently unavailable.',
                retryAfter: 30
            });
        }

        // 0. Detect Workspace via Subdomain (e.g., snapshiksha.localhost:5000)
        const host = req.headers.host || '';
        const parts = host.split('.');
        const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
        let subdomain = null;

        // Standardized logic matching frontend middleware
        if (isLocalhost) {
            // company.localhost:5000 -> ["company", "localhost:5000"]
            // OR localhost:5000 -> ["localhost:5000"]
            if (parts.length >= 2 && parts[parts.length - 1].split(':')[0] === 'localhost') {
                subdomain = parts[0].toLowerCase();
                if (subdomain === 'localhost') {
                    subdomain = null;
                }
            }
        } else {
            // company.ims.com -> ["company", "ims", "com"]
            if (parts.length > 2) {
                subdomain = parts[0].toLowerCase();
            }
        }

        // Validate subdomain against ignored list
        const ignoredSubdomains = ['www', 'ims', 'api', 'admin', 'app'];
        if (subdomain && ignoredSubdomains.includes(subdomain)) {
            subdomain = null;
        }

        // 0.5 Skip for public routes that don't need tenant DB context yet
        const publicRoutes = ['/api/auth', '/api/setup', '/api/public', '/api/health'];
        const isPublic = publicRoutes.some(route => req.path.startsWith(route));
        const isOnboardingRoute = (req.originalUrl || req.url).includes('/api/auth/complete-workspace-setup') || 
                                 (req.originalUrl || req.url).includes('/api/setup/configure') ||
                                 (req.originalUrl || req.url).includes('/api/setup/register') ||
                                 (req.originalUrl || req.url).includes('/api/setup/check-db') ||
                                 (req.originalUrl || req.url).includes('/api/init');

        // Resolve companyId from header or JWT first, even for public routes
        let companyId = req.headers['x-tenant-id'];
        const authHeader = req.headers.authorization;
        let token = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (req.query.token) {
            token = req.query.token;
        }

        // Fast extraction of companyId from JWT (verify happens later in auth middleware)
        if (!companyId && token) {
            try {
                const decoded = jwt.decode(token);
                if (decoded && decoded.companyId) companyId = decoded.companyId;
            } catch (e) {}
        }

        if ((isPublic || isOnboardingRoute) && !subdomain && !companyId) {
            if (!isOnboardingRoute) {
                return next();
            }
        }

        // 1. Identify Workspace (Subdomain -> Header -> JWT)
        // (companyId already resolved from header/JWT above if present)

        const { redis } = require('../../config/redis');

        // If subdomain is present, prioritize it
        if (subdomain) {
            const subCacheKey = `subdomain:${subdomain}`;
            let cachedCompanyId = getFromMemoryCache(subCacheKey);
            
            if (cachedCompanyId) {
                companyId = cachedCompanyId;
            } else if (redis) {
                try {
                    const cached = await redis.get(subCacheKey);
                    if (cached) {
                        companyId = cached;
                        setToMemoryCache(subCacheKey, companyId);
                    }
                } catch (e) {}
            }

            if (!companyId) {
                const companyBySlug = await prisma.company.findFirst({
                    where: { slug: subdomain },
                    select: { id: true }
                });
                if (companyBySlug) {
                    companyId = companyBySlug.id;
                    setToMemoryCache(subCacheKey, companyId);
                    if (redis) {
                        try {
                            await redis.set(subCacheKey, companyId, 'EX', 3600); // 1 hour cache
                        } catch (e) {}
                    }
                } else {
                    console.warn(`[Tenant DB] Subdomain "${subdomain}" provided but no company found.`);
                }
            }
        }

        const onboardingTokenHeader = req.headers['x-onboarding-token'];

        // If onboardingToken is provided, resolve companyId from it
        if (!companyId && onboardingTokenHeader) {
            const companyByToken = await prisma.company.findFirst({
                // Prisma jsonb fields are handled differently, but since we are doing a direct lookup:
                // If it's a structured field, we might need to adjust this depending on the prisma schema definition of metadata
                // For now, assuming it might be stored elsewhere or we need raw query, but assuming Prisma JSON filter:
                where: {
                    metadata: {
                        path: ['onboardingToken'],
                        equals: onboardingTokenHeader
                    }
                },
                select: { id: true }
            });
            if (companyByToken) {
                companyId = companyByToken.id;
            }
        }

        if (!companyId) {
            if (process.env.DEBUG_TENANT === 'true') {
                console.log(`[Tenant DB] No companyId resolved for path: ${req.path}. Subdomain: ${subdomain}, Header: ${req.headers['x-tenant-id']}`);
            }
            // Some routes don't need a tenant DB (like superadmin, setup, or pitchin users without a workspace)
            // We set req.prisma to the global prisma client to allow global models to be queried
            req.prisma = prisma;
            return next();
        }

        if (process.env.DEBUG_TENANT === 'true') {
            console.log(`[Tenant DB] Resolving connection for companyId: ${companyId}`);
        }
        
        // 0.75 Validate companyId as a valid ObjectId, CUID, or UUID
        // Prisma generated ObjectIds are 24 chars, CUIDs are 25, UUIDs are 36
        if (companyId.length !== 24 && companyId.length !== 25 && companyId.length !== 36) { 
            console.error(`[Tenant DB] Invalid companyId provided: "${companyId}". Aborting resolution.`);
            return res.status(400).json({ error: 'Invalid workspace identifier provided. Please ensure your URL and headers are correct.' });
        }

        // 1. Fetch Company (with Redis Caching)
        let company = null;
        const cacheKey = `company:${companyId}`;
        
        const memCachedCompany = getFromMemoryCache(cacheKey);
        if (memCachedCompany && memCachedCompany.isOnboardingComplete) {
            company = memCachedCompany;
        } else {
            const { redis } = require('../../config/redis');

            if (redis) {
                try {
                    const cached = await redis.get(cacheKey);
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        // If cache says onboarding is NOT complete, fetch fresh from DB to avoid stuck state
                        if (parsed.isOnboardingComplete) {
                            company = parsed;
                            setToMemoryCache(cacheKey, company);
                        }
                    }
                } catch (err) {
                    console.warn('[Tenant DB] Redis cache read failed:', err.message);
                }
            }

            if (!company) {
                company = await prisma.company.findUnique({
                    where: { id: companyId }
                });
                if (!company) {
                    if (isPublic) {
                        return next();
                    }
                    return res.status(404).json({ error: 'Your workspace could not be found. Please check your URL or contact support.' });
                }
                
                // Polyfill _id for legacy mongoose compatibility during migration phase
                company._id = company.id;
                
                setToMemoryCache(cacheKey, company);

                if (redis) {
                    try {
                        await redis.set(cacheKey, JSON.stringify(company), 'EX', 3600); // Cache for 1 hour
                    } catch (err) {
                        console.warn('[Tenant DB] Redis cache write failed:', err.message);
                    }
                }
            }
        }

        // 2. Security & Onboarding Checks
        const pitchInRoutes = [
            '/api/community',
            '/api/chat',
            '/api/search',
            '/api/notifications',
            '/api/users',
            '/api/user',
            '/api/files'
        ];
        const isPitchInRoute = pitchInRoutes.some(route => req.path.startsWith(route));

        // Skip workspace setup check for PitchIn routes since general PitchIn users do not have a configured tenant database
        if (!isPitchInRoute && !company.databaseConfigured) {
            return res.status(403).json({ error: 'Your workspace setup is incomplete. Please complete your registration or contact your administrator.' });
        }

        // Strict Onboarding Enforcement: Block API access if onboarding is not done
        // Allow public routes, onboarding routes, and PitchIn specific routes
        if (!company.isOnboardingComplete && !isOnboardingRoute && !isPublic && !isPitchInRoute) {
            return res.status(403).json({
                error: 'Your workspace requires setup. Redirecting to onboarding...',
                onboardingRequired: true
            });
        }

        // 3. Skip dbManager (we are using single unified PostgreSQL now)

        // 3.5 Get Prisma Client for this Tenant (Now cached internally and extended once)
        const localPrisma = getTenantPrisma(company.id, (model, operation, result, args) => {
            if (['Company', 'User', 'Lead'].includes(model)) {
                if (['create', 'update', 'upsert'].includes(operation)) {
                    if (result) SearchService.syncDocument(model.toLowerCase() === 'company' ? 'companies' : model.toLowerCase() + 's', result);
                } else if (['delete'].includes(operation)) {
                    if (args.where && args.where.id) SearchService.removeDocument(model.toLowerCase() === 'company' ? 'companies' : model.toLowerCase() + 's', args.where.id);
                }
            }
        });

        // 4. Attach to request
        req.prisma = localPrisma;
        req.company = company;
        req.subdomain = subdomain; // Informative for logging

        // Provide a secure mock tenantDb to prevent legacy Mongoose routes from crashing
        // This maps req.tenantDb.model('Name') safely to req.prisma
        req.tenantDb = {
            model: (name) => {
                const prismaModelName = name.charAt(0).toLowerCase() + name.slice(1);
                const prismaModel = req.prisma[prismaModelName] || {
                    findMany: async () => [], findFirst: async () => null, findUnique: async () => null,
                    create: async (args) => args.data, update: async (args) => args.data, delete: async () => null, count: async () => 0
                };
                const sanitizeQuery = (query) => {
                    if (!query) return {};
                    const clean = {};
                    for (const key of Object.keys(query)) {
                        let val = query[key];
                        let prismaKey = key === '_id' ? 'id' : key;
                        if (val && typeof val === 'object' && !Array.isArray(val)) {
                            if (val.$regex) { clean[prismaKey] = { contains: String(val.$regex).replace(/^\/|\/[gi]*$/g, ''), mode: 'insensitive' }; }
                            else if (val.$ne !== undefined) { clean[prismaKey] = { not: val.$ne }; }
                            else if (val.$gte !== undefined) { clean[prismaKey] = { gte: val.$gte }; }
                            else { clean[prismaKey] = val; }
                        } else { clean[prismaKey] = val; }
                    }
                    return clean;
                };
                const chain = (where, options = { include: {}, orderBy: {}, skip: 0, take: undefined, select: undefined }) => ({
                    populate: (field, select) => {
                        let fieldName = field.split(' ')[0];
                        options.include[fieldName] = true;
                        return chain(where, options);
                    },
                    sort: (sortObj) => {
                        if (typeof sortObj === 'object') {
                            for (let key in sortObj) {
                                options.orderBy[key] = sortObj[key] === 1 ? 'asc' : 'desc';
                            }
                        }
                        return chain(where, options);
                    },
                    skip: (val) => { options.skip = val; return chain(where, options); },
                    limit: (val) => { options.take = val; return chain(where, options); },
                    select: (fields) => {
                        // ignore select for now or implement as Prisma select
                        return chain(where, options);
                    },
                    lean: async () => {
                        let queryArgs = { where };
                        if (Object.keys(options.include).length > 0) queryArgs.include = options.include;
                        if (Object.keys(options.orderBy).length > 0) queryArgs.orderBy = options.orderBy;
                        if (options.skip) queryArgs.skip = options.skip;
                        if (options.take) queryArgs.take = options.take;
                        return prismaModel.findMany(queryArgs);
                    },
                    then: async (resolve, reject) => {
                        try {
                            let queryArgs = { where };
                            if (Object.keys(options.include).length > 0) queryArgs.include = options.include;
                            if (Object.keys(options.orderBy).length > 0) queryArgs.orderBy = options.orderBy;
                            if (options.skip) queryArgs.skip = options.skip;
                            if (options.take) queryArgs.take = options.take;
                            const res = await prismaModel.findMany(queryArgs);
                            resolve(res);
                        } catch(err) { reject(err); }
                    }
                });
                
                const chainFirst = (where, options = { include: {}, select: undefined }) => ({
                    populate: (field, select) => {
                        let fieldName = field.split(' ')[0];
                        options.include[fieldName] = true;
                        return chainFirst(where, options);
                    },
                    select: (fields) => { return chainFirst(where, options); },
                    lean: async () => {
                        let queryArgs = { where };
                        if (Object.keys(options.include).length > 0) queryArgs.include = options.include;
                        return prismaModel.findFirst(queryArgs);
                    },
                    then: async (resolve, reject) => {
                        try {
                            let queryArgs = { where };
                            if (Object.keys(options.include).length > 0) queryArgs.include = options.include;
                            const res = await prismaModel.findFirst(queryArgs);
                            resolve(res);
                        } catch(err) { reject(err); }
                    }
                });

                return {
                    schema: { paths: {} },
                    find: (q) => { const w = sanitizeQuery(q); return chain(w); },
                    findOne: (q) => { const w = sanitizeQuery(q); return chainFirst(w); },
                    findById: (id) => { return chainFirst({ id }); },
                    create: async (data) => prismaModel.create({ data }),
                    updateOne: async (q, u) => prismaModel.updateMany({ where: sanitizeQuery(q), data: u.$set || u }),
                    updateMany: async (q, u) => prismaModel.updateMany({ where: sanitizeQuery(q), data: u.$set || u }),
                    deleteOne: async (q) => prismaModel.deleteMany({ where: sanitizeQuery(q) }),
                    deleteMany: async (q) => prismaModel.deleteMany({ where: sanitizeQuery(q) }),
                    aggregate: async (q) => prismaModel.aggregate(q),
                    groupBy: async (q) => prismaModel.groupBy(q),
                    countDocuments: async (q) => prismaModel.count({ where: sanitizeQuery(q) }),
                    findByIdAndUpdate: async (id, u) => prismaModel.update({ where: { id }, data: u.$set || u }),
                    findByIdAndDelete: async (id) => prismaModel.delete({ where: { id } })
                };
            }
        };

        if (req.performanceData?.mark) req.performanceData.mark('tenantResolutionDuration');
        next();
    } catch (err) {
        console.error('[Tenant DB Middleware Error]', err);
        return res.status(500).json({ error: 'Failed to connect to tenant database.' });
    }
}

/**
 * Clear cached company data from memory and redis.
 * Required after updating company profile or metadata.
 */
tenantDbMiddleware.clearCompanyCache = async (companyId) => {
    if (!companyId) return;
    memoryCache.delete(`company:${companyId}`);
    try {
        const { redis } = require('../../config/redis');
        if (redis) {
            await redis.del(`company:${companyId}`);
        }
    } catch (e) {
        console.warn('[Cache] Failed to clear company cache from Redis:', e.message);
    }
};

module.exports = tenantDbMiddleware;
