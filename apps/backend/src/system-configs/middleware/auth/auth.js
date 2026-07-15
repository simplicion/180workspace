'use strict';

const jwt = require('jsonwebtoken');

/**
 * Protect routes â€” verifies JWT Bearer token, attaches req.user
 */
async function protect(req, res, next) {
    if (process.env.DEBUG_AUTH === 'true') {
        console.log(`[Auth] PROTECT: ${req.method} ${req.url}`);
    }
    try {
        let token;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({ error: 'Authentication required. Please log in.' });
        }

        const secret = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;
        const decoded = jwt.verify(token, secret);

        // Ensure multitenancy DB connection is established by proceeding middleware
        if (!req.prisma) {
            return res.status(500).json({ error: 'We couldn\'t identify your workspace connection. Please ensure your Company ID is correct.' });
        }

        const user = await req.prisma.user.findUnique({
            where: { id: decoded.id }
        });


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
        
        if (req.performanceData) req.performanceData.mark('authenticationDuration');
        next();
    } catch (err) {
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
function signAccessToken(userId, companyId) {
    const secret = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;
    return jwt.sign({ id: userId, companyId }, secret, {
        expiresIn: `${process.env.ACCESS_TOKEN_EXPIRE_MINUTES || 15}m`,
    });
}

/**
 * Sign a refresh token
 */
function signRefreshToken(userId, companyId) {
    return jwt.sign({ id: userId, companyId }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: `${process.env.REFRESH_TOKEN_EXPIRE_DAYS || 7}d`,
    });
}

/**
 * Authorize roles or permissions
 * @param  {...string} rolesOrPermissions
 */
function authorize(...rolesOrPermissions) {
    return (req, res, next) => {
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
        const legacyMapping = {
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
function requirePermission(...permissions) {
    return authorize(...permissions); // We can just reuse authorize since it checks permissions now
}

/**
 * Require Admin or HR role
 */
function requireAdminOrHR(req, res, next) {
    return authorize('admin', 'can_manage_hr')(req, res, next);
}

module.exports = { protect, authorize, requirePermission, signAccessToken, signRefreshToken, requireAdminOrHR };
