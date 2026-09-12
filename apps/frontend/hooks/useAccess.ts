import { useAuth } from '@/lib/auth-context';

type ModuleName = 'hr' | 'finance' | 'sales' | 'projects' | 'admin' | 'inventory' | 'marketing' | 'customer_support';

export function useAccess(moduleName: ModuleName) {
    const { user } = useAuth();

    if (!user) {
        return { canRead: false, canWrite: false };
    }

    // Admins and CEOs have full access to everything
    if (user.role === 'admin' || (user.roles && user.roles.some((r: string) => r === 'admin'))) {
        return { canRead: true, canWrite: true };
    }

    const permissions = user.permissions || [];

    // Legacy fallback mappings
    const canManageTeam = permissions.includes('can_manage_team');
    const canManageHr = permissions.includes('can_manage_hr');

    // If they have explicit write/read permissions in the new format
    const hasWrite = permissions.includes(`${moduleName}:write`);
    const hasRead = permissions.includes(`${moduleName}:read`) || hasWrite; // write implies read

    // Default access rules for employees
    let defaultRead = false;
    const defaultWrite = false;

    // Based on user feedback: "default access will have the employees okay"
    if (moduleName === 'hr') {
        // All employees can read basic HR info (like their own attendance)
        defaultRead = true;
    }

    // The old system effectively gave managers HR read/write.
    const isLegacyManager = canManageTeam || canManageHr;

    return {
        canRead: hasRead || defaultRead || (isLegacyManager && ['hr', 'projects'].includes(moduleName)),
        canWrite: hasWrite || defaultWrite || (isLegacyManager && ['hr', 'projects'].includes(moduleName))
    };
}
