import { Request, Response, NextFunction } from 'express';

/**
 * Role-based access control middleware factory.
 * Usage: router.get('/route', protect, requireRole('admin', 'hr'), handler)
 */
export function requireRole(...roles: string[]) {
    return (req: any, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const userRoles = req.user.roles || [req.user.role || 'employee'];
        const hasPermission = userRoles.includes('admin') || userRoles.includes('ceo') || userRoles.includes('BMSP_SUPER_ADMIN') || userRoles.includes('BMSP_ADMIN') || roles.some(role => userRoles.includes(role));

        if (!hasPermission) {
            return res.status(403).json({
                error: `Access denied. Required role(s): ${roles.join(', ')}. Your roles: ${userRoles.join(', ')}`,
            });
        }
        next();
    };
}

/**
 * Granular access control middleware factory based on Module + Action (read/write).
 * Usage: router.get('/hr/employees', protect, requireAccess('hr', 'read'), handler)
 */
export function requireAccess(moduleName: string, action: string = 'read') {
    return (req: any, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        const userRoles = req.user.roles || [req.user.role || 'employee'];
        
        // Admins and CEOs have full access
        if (userRoles.includes('admin') || userRoles.includes('ceo') || userRoles.includes('BMSP_SUPER_ADMIN') || userRoles.includes('BMSP_ADMIN')) {
            return next();
        }

        const permissions = req.user.permissions || [];
        const isLegacyManager = permissions.includes('can_manage_team') || permissions.includes('can_manage_hr');
        
        // Legacy fallback rules
        if (isLegacyManager && ['hr', 'recruitment', 'projects'].includes(moduleName)) {
            return next();
        }

        // Default access rules for basic employees
        let defaultRead = false;
        let defaultWrite = false;
        
        if (moduleName === 'hr') {
            defaultRead = true; // All employees can read basic HR info
        }
        if (moduleName === 'projects') {
            defaultRead = true; // Employees can read projects (filtered by membership in controller)
        }

        const hasWrite = permissions.includes(`${moduleName}:write`);
        const hasRead = permissions.includes(`${moduleName}:read`) || hasWrite; // write implies read

        const canRead = hasRead || defaultRead;
        const canWrite = hasWrite || defaultWrite;

        const hasAccess = action === 'write' ? canWrite : canRead;

        if (!hasAccess) {
            return res.status(403).json({
                error: `Access denied. You do not have ${action} permission for the ${moduleName} module.`,
            });
        }

        next();
    };
}

// Convenience role guards
export const requireAdmin = requireRole('admin', 'manager', 'ceo');
export const requireHR = requireRole('admin', 'manager', 'ceo', 'hr');
export const requireManager = requireRole('admin', 'manager', 'ceo', 'hr');
export const requireEmployee = requireRole('admin', 'manager', 'ceo', 'hr', 'employee');
export const requireClient = requireRole('admin', 'manager', 'ceo', 'hr', 'employee', 'client');

export { requirePermission, requireAdminOrHR } from './auth';
