'use strict';
const jwt = require('jsonwebtoken');
const { prisma, getCompanyPrisma } = require('@workspace/db');
const SearchService = require('../../../platform-core/platform-integrations/services/search.service');

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
 * Middleware to intercept requests, identify the Company context (companyId),
 * and attach the company-scoped Prisma client to the request object.
 */
async function companyContextMiddleware(req, res, next) {
    try {
        // Fast Fail: Verify Prisma global client connection
        if (!prisma) {
            console.error(`[Company Context] Prisma global client NOT connected.`);
            return res.status(503).json({
                error: 'Database connection is currently unavailable.',
                retryAfter: 30
            });
        }

        // 0. Detect Company Workspace via Subdomain (e.g., mycompany.localhost:5000)
        const host = req.headers.host || '';
        const parts = host.split('.');
        const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
        let subdomain = null;

        if (isLocalhost) {
            if (parts.length >= 2 && parts[parts.length - 1].split(':')[0] === 'localhost') {
                subdomain = parts[0].toLowerCase();
                if (subdomain === 'localhost') {
                    subdomain = null;
                }
            }
        } else {
            if (parts.length > 2) {
                subdomain = parts[0].toLowerCase();
            }
        }

        // Validate subdomain against ignored platform domains
        const ignoredSubdomains = ['www', 'ims', 'api', 'admin', 'app'];
        if (subdomain && ignoredSubdomains.includes(subdomain)) {
            subdomain = null;
        }

        // 0.5 Skip for public routes that don't strictly require company context
        const publicRoutes = ['/api/auth', '/api/setup', '/api/public', '/api/health'];
        const isPublic = publicRoutes.some(route => req.path.startsWith(route));
        const isOnboardingRoute = (req.originalUrl || req.url).includes('/api/auth/complete-workspace-setup') || 
                                 (req.originalUrl || req.url).includes('/api/setup/configure') ||
                                 (req.originalUrl || req.url).includes('/api/setup/register') ||
                                 (req.originalUrl || req.url).includes('/api/setup/check-db') ||
                                 (req.originalUrl || req.url).includes('/api/init');

        // Resolve companyId from headers (x-company-id or legacy x-company-id) or JWT
        let companyId = req.headers['x-company-id'] || req.headers['x-company-id'];
        const authHeader = req.headers.authorization;
        let token = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (req.query.token) {
            token = req.query.token;
        }

        if (!companyId && token) {
            try {
                const decoded = jwt.decode(token);
                if (decoded && decoded.companyId) companyId = decoded.companyId;
            } catch (e) {}
        }

        if ((isPublic || isOnboardingRoute) && !subdomain && !companyId) {
            if (!isOnboardingRoute) {
                req.prisma = prisma;
                return next();
            }
        }

        // 1. Resolve Company via Subdomain / Header / Token
        const { redis } = require('../../config/redis');

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
                            await redis.set(subCacheKey, companyId, 'EX', 3600);
                        } catch (e) {}
                    }
                } else {
                    console.warn(`[Company Context] Subdomain "${subdomain}" provided but no company found.`);
                }
            }
        }

        const onboardingTokenHeader = req.headers['x-onboarding-token'];
        if (!companyId && onboardingTokenHeader) {
            const companyByToken = await prisma.company.findFirst({
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
            req.prisma = prisma;
            return next();
        }

        // Validate companyId format (CUID/UUID/ObjectId)
        if (companyId.length !== 24 && companyId.length !== 25 && companyId.length !== 36) { 
            console.error(`[Company Context] Invalid companyId format: "${companyId}".`);
            return res.status(400).json({ error: 'Invalid company workspace identifier provided.' });
        }

        // 2. Fetch Company details (with Redis & Memory caching)
        let company = null;
        const cacheKey = `company:${companyId}`;
        
        const memCachedCompany = getFromMemoryCache(cacheKey);
        if (memCachedCompany && memCachedCompany.isOnboardingComplete) {
            company = memCachedCompany;
        } else {
            if (redis) {
                try {
                    const cached = await redis.get(cacheKey);
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        if (parsed.isOnboardingComplete) {
                            company = parsed;
                            setToMemoryCache(cacheKey, company);
                        }
                    }
                } catch (err) {
                    console.warn('[Company Context] Redis cache read failed:', err.message);
                }
            }

            if (!company) {
                company = await prisma.company.findUnique({
                    where: { id: companyId }
                });
                if (!company) {
                    if (isPublic) {
                        req.prisma = prisma;
                        return next();
                    }
                    return res.status(404).json({ error: 'Company workspace not found.' });
                }
                
                company._id = company.id;
                setToMemoryCache(cacheKey, company);

                if (redis) {
                    try {
                        await redis.set(cacheKey, JSON.stringify(company), 'EX', 3600);
                    } catch (err) {
                        console.warn('[Company Context] Redis cache write failed:', err.message);
                    }
                }
            }
        }

        // 3. Security & Onboarding Check
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

        if (!company.isOnboardingComplete && !isOnboardingRoute && !isPublic && !isPitchInRoute) {
            return res.status(403).json({
                error: 'Your workspace requires setup. Redirecting to onboarding...',
                onboardingRequired: true
            });
        }

        // 4. Attach Company-Scoped Prisma Client
        const scopedPrisma = getCompanyPrisma(company.id, (model, operation, result, args) => {
            if (['Company', 'User', 'Lead'].includes(model)) {
                if (['create', 'update', 'upsert'].includes(operation)) {
                    if (result) SearchService.syncDocument(model.toLowerCase() === 'company' ? 'companies' : model.toLowerCase() + 's', result);
                } else if (['delete'].includes(operation)) {
                    if (args.where && args.where.id) SearchService.removeDocument(model.toLowerCase() === 'company' ? 'companies' : model.toLowerCase() + 's', args.where.id);
                }
            }
        });

        req.prisma = scopedPrisma;
        req.company = company;
        req.companyId = company.id;
        req.subdomain = subdomain;

        // Legacy compatibility shim for req.companyPrisma
        req.companyPrisma = {
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
                    populate: (field) => {
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
                    select: () => chain(where, options),
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
                    populate: (field) => {
                        let fieldName = field.split(' ')[0];
                        options.include[fieldName] = true;
                        return chainFirst(where, options);
                    },
                    select: () => chainFirst(where, options),
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
                    find: (q) => chain(sanitizeQuery(q)),
                    findOne: (q) => chainFirst(sanitizeQuery(q)),
                    findById: (id) => chainFirst({ id }),
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

        if (req.performanceData?.mark) req.performanceData.mark('companyResolutionDuration');
        next();
    } catch (err) {
        console.error('[Company Context Middleware Error]', err);
        return res.status(500).json({ error: 'Failed to resolve company workspace context.' });
    }
}

/**
 * Clear cached company data from memory and redis.
 */
companyContextMiddleware.clearCompanyCache = async (companyId) => {
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

module.exports = companyContextMiddleware;
