import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { getCompanyPrisma } from '@workspace/db';
import { redis } from '../../config/redis';
/**
 * Protect routes — verifies JWT Bearer token, attaches req.user
 */
export async function protect(req: any, res: Response, next: NextFunction) {
    if (process.env.DEBUG_AUTH === 'true') {
        console.log(`[Auth] PROTECT: ${req.method} ${req.url}`);
    }
    try {
        let token;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (req.query.token) {
            token = req.query.token as string;
        }

        if (!token) {
            // NOTE: a former test shortcut here let ANY unauthenticated request whose URL contained "settings" through as a
            // fake user, which exposed every company's settings to anyone who sent `x-company-id`. Never reintroduce it.
            return res.status(401).json({ error: 'Authentication required. Please log in.' });
        }

        const secret = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;
        if (!secret) {
            return res.status(500).json({ error: 'Server configuration error' });
        }
        
        let decoded: any = null;
        let isOAuthToken = false;
        let oAuthUser: any = null;

        try {
            decoded = jwt.verify(token, secret);
        } catch (jwtErr: any) {
            // Check if this is an OAuth access token from 180 Identity or an RS256 token
            try {
                let dbToken: any = null;
                try {
                    const { corePrisma } = require('@workspace/db-180core');
                    dbToken = await corePrisma.oAuthToken.findUnique({
                        where: { accessToken: token },
                        include: { user: true, app: true }
                    });
                } catch (_) {}

                const { prisma: globalPrisma } = require('@workspace/db');

                if (dbToken && !dbToken.revokedAt && dbToken.expiresAt > new Date() && dbToken.user) {
                    isOAuthToken = true;
                    // Resolve user in local workspace database
                    let localUser = await globalPrisma.user.findUnique({
                        where: { id: dbToken.userId }
                    });
                    if (!localUser && dbToken.user.email) {
                        localUser = await globalPrisma.user.findFirst({
                            where: { email: { equals: dbToken.user.email, mode: 'insensitive' } }
                        });
                    }
                    if (!localUser && dbToken.user) {
                        try {
                            localUser = await globalPrisma.user.create({
                                data: {
                                    id: dbToken.user.id,
                                    email: dbToken.user.email || `${dbToken.user.username || dbToken.user.id}@180workspace.internal`,
                                    name: dbToken.user.name || dbToken.user.username || '180 User',
                                    username: dbToken.user.username || null,
                                    phone: dbToken.user.phone || null,
                                    photoUrl: dbToken.user.avatarUrl || null,
                                    role: 'admin',
                                    isActive: true,
                                    isFirstLogin: true,
                                    googleId: dbToken.user.googleId || null
                                }
                            });
                        } catch (_) {
                            localUser = await globalPrisma.user.findFirst({
                                where: { OR: [{ id: dbToken.userId }, ...(dbToken.user.email ? [{ email: { equals: dbToken.user.email, mode: 'insensitive' } }] : [])] }
                            });
                        }
                    }
                    oAuthUser = localUser || dbToken.user;
                    decoded = {
                        id: dbToken.userId,
                        companyId: localUser?.companyId || null,
                        scopes: dbToken.scopes
                    };
                } else {
                    // Try verifying as RS256 ID Token from 180 Identity
                    let verifyIdTokenFn: any = null;
                    try {
                        verifyIdTokenFn = require('@workspace/identity-provider').verifyIdToken;
                    } catch (_) {
                        try {
                            verifyIdTokenFn = require('@workspace/identity').verifyIdToken;
                        } catch (_) {}
                    }
                    const verified = typeof verifyIdTokenFn === 'function' ? verifyIdTokenFn(token) : { valid: false };
                    if (verified.valid && verified.payload?.sub) {
                        const targetUserId = verified.payload.sub;
                        const targetEmail = verified.payload.email;

                        // 1. Look up user in workspace DB by ID or Email
                        let localUser = await globalPrisma.user.findUnique({
                            where: { id: targetUserId }
                        });
                        if (!localUser && targetEmail) {
                            localUser = await globalPrisma.user.findFirst({
                                where: { email: { equals: targetEmail, mode: 'insensitive' } }
                            });
                        }

                        // 2. Fall back to 180 Core DB if user was created via 180 Profile
                        if (!localUser) {
                            try {
                                const { corePrisma } = require('@workspace/db-180core');
                                if (corePrisma?.user) {
                                    let coreUser = await corePrisma.user.findUnique({
                                        where: { id: targetUserId }
                                    });
                                    if (!coreUser && targetEmail) {
                                        coreUser = await corePrisma.user.findFirst({
                                            where: { email: { equals: targetEmail, mode: 'insensitive' } }
                                        });
                                    }
                                    if (coreUser) {
                                        try {
                                            localUser = await globalPrisma.user.create({
                                                data: {
                                                    id: coreUser.id,
                                                    email: coreUser.email || `${coreUser.username || coreUser.id}@180workspace.internal`,
                                                    name: coreUser.name || coreUser.username || verified.payload.name || '180 User',
                                                    username: coreUser.username || verified.payload.username || null,
                                                    phone: coreUser.phone || verified.payload.phone || null,
                                                    photoUrl: coreUser.avatarUrl || verified.payload.picture || verified.payload.avatarUrl || null,
                                                    role: 'admin',
                                                    isActive: true,
                                                    isFirstLogin: true,
                                                    googleId: coreUser.googleId || null
                                                }
                                            });
                                        } catch (_) {
                                            localUser = await globalPrisma.user.findFirst({
                                                where: {
                                                    OR: [
                                                        { id: targetUserId },
                                                        ...(targetEmail ? [{ email: { equals: targetEmail, mode: 'insensitive' } }] : [])
                                                    ]
                                                }
                                            });
                                        }
                                    }
                                }
                            } catch (_) {}
                        }

                        // 3. Auto-provision in workspace DB directly from cryptographically verified claims if needed
                        if (!localUser) {
                            try {
                                localUser = await globalPrisma.user.create({
                                    data: {
                                        id: targetUserId,
                                        email: targetEmail || `${verified.payload.username || targetUserId}@180workspace.internal`,
                                        name: verified.payload.name || verified.payload.username || '180 User',
                                        username: verified.payload.username || null,
                                        phone: verified.payload.phone || null,
                                        photoUrl: verified.payload.picture || verified.payload.avatarUrl || null,
                                        role: 'admin',
                                        isActive: true,
                                        isFirstLogin: true
                                    }
                                });
                            } catch (_) {
                                localUser = await globalPrisma.user.findFirst({
                                    where: {
                                        OR: [
                                            { id: targetUserId },
                                            ...(targetEmail ? [{ email: { equals: targetEmail, mode: 'insensitive' } }] : [])
                                        ]
                                    }
                                });
                            }
                        }

                        isOAuthToken = true;
                        oAuthUser = localUser || {
                            id: targetUserId,
                            email: targetEmail,
                            name: verified.payload.name,
                            username: verified.payload.username,
                            role: 'admin'
                        };
                        decoded = {
                            id: localUser?.id || targetUserId,
                            sub: targetUserId,
                            email: localUser?.email || targetEmail,
                            name: localUser?.name || verified.payload.name,
                            companyId: localUser?.companyId || null,
                            scopes: verified.payload.scopes || ['openid', 'identity:read']
                        };
                    }
                }
            } catch (oauthLookupErr) {
                console.warn('[Auth] OAuth token fallback check error:', oauthLookupErr);
            }

            if (!decoded) {
                throw jwtErr;
            }
        }

        // Tenant binding: company-context resolves the workspace from `x-company-id` BEFORE the token is verified, and the
        // domain services scope every query by that workspace. A token issued for company A must never act on company B
        // just because the caller sent B's id in a header.
        const contextCompanyId = req.company?.id;
        if (contextCompanyId && decoded.companyId && String(contextCompanyId) !== String(decoded.companyId)) {
            return res.status(403).json({ error: 'This session does not belong to the requested workspace. Please sign in again.', code: 'WORKSPACE_MISMATCH' });
        }

        // Ensure multitenancy DB connection is established by proceeding middleware
        if (!req.prisma) {
            const { prisma: globalPrisma } = require('@workspace/db');
            req.prisma = globalPrisma;
        }

        let user: any = oAuthUser || null;
        const cacheKey = `auth:user:${decoded.id}`;
        
        try {
            if (redis) {
                const cachedUser = await redis.get(cacheKey);
                if (cachedUser) {
                    user = JSON.parse(cachedUser);
                }
            }
        } catch (cacheErr) {
            console.warn('[Auth] Redis cache error:', cacheErr);
        }

        const tokenUserId = decoded.id || decoded.userId || decoded.sub;

        if (!user && tokenUserId) {
            user = await req.prisma.user.findUnique({
                where: { id: tokenUserId }
            });
        }

        if (!user && decoded.email) {
            user = await req.prisma.user.findFirst({
                where: { email: { equals: decoded.email, mode: 'insensitive' } }
            });
        }

        // Cross-domain fallback: If token was signed by 180 Core / Sovereign Identity (db-180core),
        // resolve user in 180 Workspace DB by email, phone, googleId or username, or auto-provision workspace record.
        if (!user) {
            try {
                let coreUser: any = null;

                // Direct core database lookup via corePrisma
                try {
                    const { corePrisma } = require('@workspace/db-180core');
                    if (corePrisma?.user) {
                        if (tokenUserId) {
                            coreUser = await corePrisma.user.findUnique({
                                where: { id: tokenUserId }
                            });
                        }
                        if (!coreUser && decoded.email) {
                            coreUser = await corePrisma.user.findFirst({
                                where: { email: { equals: decoded.email, mode: 'insensitive' } }
                            });
                        }
                    }
                } catch (_) {}

                    // Decoupled Core OIDC User Resolution: Fetch userinfo over HTTP if direct db lookup didn't succeed
                    if (!coreUser) {
                        try {
                            const coreBackendUrl =
                                process.env.CORE_BACKEND_INTERNAL_URL ||
                                process.env.CORE_BACKEND_URL ||
                                (process.env.NODE_ENV === 'production' ? 'http://core-backend:4003' : 'http://localhost:4003');
                            const coreRes = await fetch(`${coreBackendUrl}/api/oauth/userinfo`, {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            if (coreRes.ok) {
                                const coreData: any = await coreRes.json();
                                coreUser = coreData.user || coreData.data || coreData;
                            }
                        } catch (_) {}
                    }

                    const resolvedEmail = coreUser?.email || decoded.email;
                    const resolvedId = coreUser?.id || decoded.id;
                    const resolvedName = coreUser?.name || decoded.name || coreUser?.username || decoded.username || '180 User';
                    const resolvedUsername = coreUser?.username || decoded.username || null;
                    const resolvedPhone = coreUser?.phone || decoded.phone || null;
                    const resolvedAvatar = coreUser?.avatarUrl || decoded.avatarUrl || null;
                    const resolvedGoogleId = coreUser?.googleId || decoded.googleId || null;

                    if (!user && resolvedEmail) {
                        user = await req.prisma.user.findFirst({
                            where: { email: { equals: resolvedEmail, mode: 'insensitive' } }
                        });
                    }

                    // Auto-provision user in workspace DB
                    if (!user && (resolvedEmail || resolvedId)) {
                        try {
                            user = await req.prisma.user.create({
                                data: {
                                    id: resolvedId,
                                    email: resolvedEmail || `${resolvedUsername || resolvedId}@180workspace.internal`,
                                    name: resolvedName,
                                    username: resolvedUsername,
                                    phone: resolvedPhone,
                                    photoUrl: resolvedAvatar,
                                    role: 'admin',
                                    isActive: true,
                                    isFirstLogin: true,
                                    googleId: resolvedGoogleId
                                }
                            });
                        } catch (provisionErr) {
                            user = await req.prisma.user.findFirst({
                                where: {
                                    OR: [
                                        { id: resolvedId },
                                        ...(resolvedEmail ? [{ email: { equals: resolvedEmail, mode: 'insensitive' } }] : [])
                                    ]
                                }
                            });
                        }
                    }
                } catch (coreLookupErr) {
                    console.warn('[Auth] Core user fallback lookup note:', coreLookupErr);
                }
            }

            if (user) {
                try {
                    if (redis) {
                        // Cache for 60 seconds to reduce DB load while keeping auth responsive to role changes
                        await redis.set(cacheKey, JSON.stringify(user), 'EX', 60);
                    }
                } catch (cacheSetErr) {
                    // Ignore cache set errors
                }
            }

        if (!user) {
            return res.status(401).json({ error: 'Your account could not be found. Please sign in again.' });
        }

        if (user.isActive === false) {
            return res.status(401).json({ error: 'Your account has been deactivated. Please contact your administrator.' });
        }

        // Attach user and decoded companyId
        req.user = user;
        // Normalize role if missing (fallback to roles[0] or default)
        if (!req.user.role) {
            req.user.role = (user.roles && user.roles.length > 0) ? user.roles[0] : 'employee';
        }
        req.user.companyId = decoded.companyId || req.company?.id || user.companyId;

        // If user still doesn't have companyId, attempt resolving from adminEmail in company
        if (!req.user.companyId && user.email) {
            try {
                const { prisma: globalPrisma } = require('@workspace/db');
                const adminCompany = await globalPrisma.company.findFirst({
                    where: { adminEmail: { equals: user.email, mode: 'insensitive' } },
                    select: { id: true }
                });
                if (adminCompany) {
                    req.user.companyId = adminCompany.id;
                    try {
                        await globalPrisma.user.update({
                            where: { id: user.id },
                            data: { companyId: adminCompany.id }
                        });
                    } catch (_) {}
                }
            } catch (_) {}
        }
        
        // If company-context.js fell back to the global Prisma client because it couldn't extract companyId
        // from the request before verification, but we now know the user's companyId, upgrade the connection
        // to prevent cross-company data leakage.
        if (req.user.companyId && !req.prisma.companyId) {
            req.prisma = getCompanyPrisma(req.user.companyId);
            if (process.env.DEBUG_AUTH === 'true') {
                console.log(`[Auth] Upgraded global Prisma client to company client for companyId: ${req.user.companyId}`);
            }
        }

        // Ensure req.company and req.companyId are attached when user is authenticated with a company context.
        if (req.user.companyId && !req.company) {
            try {
                const targetCompanyId = req.user.companyId;
                const { prisma: globalPrisma } = require('@workspace/db');
                const comp = await (req.prisma || globalPrisma).company.findUnique({
                    where: { id: targetCompanyId }
                });
                if (comp) {
                    comp._id = comp.id;
                    req.company = comp;
                    req.companyId = comp.id;
                }
            } catch (err: any) {
                console.warn('[Auth] Failed to attach company context in protect:', err?.message);
            }
        }

        
        if (req.performanceData) req.performanceData.mark('authenticationDuration');
        next();
    } catch (err: any) {
        console.error(`[Auth] protect ERROR: ${err.name} - ${err.message}`);
        if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError' || err instanceof SyntaxError) {
            const message = err.name === 'TokenExpiredError' 
                ? 'Your session has expired. Please sign in again.' 
                : 'Your session is invalid. Please sign in again.';
            return res.status(401).json({ error: message });
        }
        next(err);
    }
}

/**
 * Sign an access token
 */
export function signAccessToken(userId: string, companyId: string) {
    const secret = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;
    if (!secret) {
        console.error('[Auth] ERROR: JWT_SECRET or JWT_ACCESS_SECRET is missing from environment variables!');
        throw new Error('Server configuration error: missing JWT secret');
    }
    return jwt.sign({ id: userId, companyId }, secret, {
        expiresIn: `${process.env.ACCESS_TOKEN_EXPIRE_MINUTES || 15}m` as any,
    });
}

/**
 * Sign a refresh token. `familyId` (JWT claim `sid`) is the session family used for rotation and reuse detection;
 * omit it to start a new family (a new sign-in).
 */
export function signRefreshToken(userId: string, companyId: string, familyId: string = crypto.randomUUID()) {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
        console.error('[Auth] ERROR: JWT_REFRESH_SECRET is missing from environment variables!');
        throw new Error('Server configuration error: missing JWT refresh secret');
    }
    // jti keeps two tokens minted in the same second (grace-window retries) distinct.
    return jwt.sign({ id: userId, companyId, sid: familyId, jti: crypto.randomUUID() }, secret, {
        expiresIn: `${process.env.REFRESH_TOKEN_EXPIRE_DAYS || 7}d` as any,
    });
}

/**
 * Authorize roles or permissions
 * @param  {...string} rolesOrPermissions
 */
export function authorize(...rolesOrPermissions: string[]) {
    return (req: any, res: Response, next: NextFunction) => {
        if (process.env.DEBUG_AUTH === 'true') {
            console.log(`[RBAC] User: ${req.user?.email}, Current Role: "${req.user?.role}", Allowed: [${rolesOrPermissions}]`);
        }

        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Master roles always bypass
        if (req.user.role === 'admin') {
            if (process.env.DEBUG_AUTH === 'true') console.log(`[RBAC] Access GRANTED for admin ${req.user?.email}`);
            return next();
        }

        // Map legacy role strings to new permission tags for backward compatibility
        const legacyMapping: Record<string, string> = {
            'manager': 'can_manage_team',
            'hr': 'can_manage_hr',
            'finance': 'can_manage_finance',
            'sales': 'can_manage_sales'
        };

        const userPermissions = req.user.permissions || [];
        
        const hasAccess = rolesOrPermissions.some(reqItem => {
            if (req.user.role === reqItem) return true; // Direct role match
            const reqPermission = legacyMapping[reqItem] || reqItem;
            return userPermissions.includes(reqPermission);
        });

        if (!hasAccess) {
            if (process.env.DEBUG_AUTH === 'true') console.log(`[RBAC] Access DENIED for ${req.user?.email}`);
            return res.status(403).json({
                error: 'You don\'t have permission to perform this action.'
            });
        }

        if (process.env.DEBUG_AUTH === 'true') console.log(`[RBAC] Access GRANTED for ${req.user?.email}`);
        if (req.performanceData) req.performanceData.mark('authorizationDuration');
        next();
    };
}

/**
 * Require specific permission
 */
export function requirePermission(...permissions: string[]) {
    return authorize(...permissions); // We can just reuse authorize since it checks permissions now
}

/**
 * Require Admin or HR role
 */
export function requireAdminOrHR(req: Request, res: Response, next: NextFunction) {
    return authorize('admin', 'can_manage_hr')(req, res, next);
}

/**
 * Optional Protect — attaches req.user if valid token provided, otherwise proceeds as unauthenticated
 */
export async function optionalProtect(req: any, res: Response, next: NextFunction) {
    try {
        let token;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (req.query.token) {
            token = req.query.token as string;
        }

        if (!token) {
            return next();
        }

        const secret = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;
        let decoded: any = null;
        let oAuthUser: any = null;

        try {
            decoded = jwt.verify(token, secret);
        } catch (jwtErr) {
            try {
                const { prisma: globalPrisma } = require('@workspace/db');
                const dbToken = await globalPrisma.oAuthToken.findUnique({
                    where: { accessToken: token },
                    include: { user: true }
                });
                if (dbToken && !dbToken.revokedAt && dbToken.expiresAt > new Date() && dbToken.user) {
                    oAuthUser = dbToken.user;
                    decoded = { id: dbToken.userId, companyId: dbToken.user.companyId || null };
                } else {
                    let verifyIdTokenFn: any = null;
                    try {
                        verifyIdTokenFn = require('@workspace/identity-provider').verifyIdToken;
                    } catch (_) {
                        try {
                            verifyIdTokenFn = require('@workspace/identity').verifyIdToken;
                        } catch (_) {}
                    }
                    const verified = typeof verifyIdTokenFn === 'function' ? verifyIdTokenFn(token) : { valid: false };
                    if (verified.valid && verified.payload?.sub) {
                        const targetUserId = verified.payload.sub;
                        const targetEmail = verified.payload.email;
                        const u = await globalPrisma.user.findFirst({
                            where: {
                                OR: [
                                    { id: targetUserId },
                                    ...(targetEmail ? [{ email: { equals: targetEmail, mode: 'insensitive' } }] : [])
                                ]
                            }
                        });
                        if (u) {
                            oAuthUser = u;
                            decoded = { id: u.id, companyId: u.companyId || null };
                        } else {
                            decoded = { id: targetUserId, email: targetEmail, companyId: null };
                        }
                    }
                }
            } catch (_) {}
        }

        if (!decoded) return next();

        const { prisma } = require('@workspace/db');
        const user = oAuthUser || await prisma.user.findUnique({
            where: { id: decoded.id }
        });

        if (user && user.isActive) {
            req.user = user;
            req.user.companyId = decoded.companyId || user.companyId;
        }
        next();
    } catch (err) {
        next();
    }
}

