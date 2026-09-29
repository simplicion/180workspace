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
            // Check if this is an OAuth access token or an RS256 token from 180 Identity
            try {
                const { prisma: globalPrisma } = require('@workspace/db');
                const dbToken = await globalPrisma.oAuthToken.findUnique({
                    where: { accessToken: token },
                    include: { user: true, app: true }
                });

                if (dbToken && !dbToken.revokedAt && dbToken.expiresAt > new Date() && dbToken.user) {
                    isOAuthToken = true;
                    oAuthUser = dbToken.user;
                    decoded = {
                        id: dbToken.userId,
                        companyId: dbToken.user.companyId || dbToken.app?.companyId || null,
                        scopes: dbToken.scopes
                    };
                } else {
                    // Try verifying as RS256 ID Token
                    const { verifyIdToken } = require('@workspace/identity');
                    const verified = verifyIdToken(token);
                    if (verified.valid && verified.payload?.sub) {
                        const userFromSub = await globalPrisma.user.findUnique({
                            where: { id: verified.payload.sub }
                        });
                        if (userFromSub) {
                            isOAuthToken = true;
                            oAuthUser = userFromSub;
                            decoded = {
                                id: userFromSub.id,
                                companyId: userFromSub.companyId || null
                            };
                        }
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

        if (!user) {
            user = await req.prisma.user.findUnique({
                where: { id: decoded.id }
            });

            // Cross-domain fallback: If token was signed by 180 Core / Sovereign Identity (db-180core),
            // resolve user in 180 Workspace DB by email, phone, googleId or username, or auto-provision workspace record.
            if (!user) {
                try {
                    // Decoupled Core OIDC User Resolution: Fetch userinfo over HTTP without direct database access
                    let coreUser: any = null;
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

                    if (coreUser) {
                        const orConditions: any[] = [];
                        if (coreUser.email) orConditions.push({ email: { equals: coreUser.email, mode: 'insensitive' } });
                        if (coreUser.googleId) orConditions.push({ googleId: coreUser.googleId });
                        if (coreUser.phone) orConditions.push({ phone: coreUser.phone });
                        if (coreUser.username) orConditions.push({ username: { equals: coreUser.username, mode: 'insensitive' } });

                        if (orConditions.length > 0) {
                            user = await req.prisma.user.findFirst({
                                where: { OR: orConditions }
                            });
                        }

                        // If user is authenticated in 180 Profile but does not have a Workspace DB record yet, auto-provision
                        if (!user) {
                            user = await req.prisma.user.create({
                                data: {
                                    id: coreUser.id,
                                    email: coreUser.email || `${coreUser.username || coreUser.id}@180workspace.internal`,
                                    name: coreUser.name || coreUser.username || '180 User',
                                    username: coreUser.username || null,
                                    phone: coreUser.phone || null,
                                    photoUrl: coreUser.avatarUrl || null,
                                    role: 'admin',
                                    isActive: true,
                                    isFirstLogin: true,
                                    googleId: coreUser.googleId || null
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
        }

        if (!user) {
            return res.status(401).json({ error: 'Your account could not be found. Please sign in again.' });
        }

        if (!user.isActive) {
            return res.status(401).json({ error: 'Your account has been deactivated. Please contact your administrator.' });
        }

        // Attach user and decoded companyId
        req.user = user;
        // Normalize role if missing (fallback to roles[0] or default)
        if (!req.user.role) {
            req.user.role = (user.roles && user.roles.length > 0) ? user.roles[0] : 'employee';
        }
        req.user.companyId = decoded.companyId || req.company?.id || user.companyId;
        
        // If company-context.js fell back to the global Prisma client because it couldn't extract companyId
        // from the request before verification, but we now know the user's companyId, upgrade the connection
        // to prevent cross-company data leakage.
        if (req.user.companyId && !req.prisma.companyId) {
            req.prisma = getCompanyPrisma(req.user.companyId);
            if (process.env.DEBUG_AUTH === 'true') {
                console.log(`[Auth] Upgraded global Prisma client to company client for companyId: ${req.user.companyId}`);
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
                    const { verifyIdToken } = require('@workspace/identity');
                    const verified = verifyIdToken(token);
                    if (verified.valid && verified.payload?.sub) {
                        const u = await globalPrisma.user.findUnique({ where: { id: verified.payload.sub } });
                        if (u) {
                            oAuthUser = u;
                            decoded = { id: u.id, companyId: u.companyId || null };
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

