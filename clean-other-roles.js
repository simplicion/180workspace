const fs = require('fs');
const path = require('path');

const replacements = [
    {
        file: 'apps/frontend/app/(platform)/(communications-app)/emails/page.tsx',
        regex: /const isHR = Boolean\(user && \(\['admin', 'manager', 'hr', 'owner', 'super_admin', 'superadmin', 'bmsp_super_admin'\]\.includes\(userRole\) \|\| \(user as any\)\.isSuperAdmin\)\);/g,
        replacement: "const isHR = Boolean(user && userRole === 'admin');"
    },
    {
        file: 'apps/frontend/app/(platform)/(settings-app)/profile/[id]/page.tsx',
        regex: /\['admin', 'ceo'\]\.includes\(profileUser\.role\)/g,
        replacement: "profileUser.role === 'admin'"
    },
    {
        file: 'apps/frontend/app/(platform)/(settings-app)/settings/roles-access/page.tsx',
        regex: /const ALL_ROLES = \['admin', 'manager', 'hr', 'employee', 'finance', 'sales', 'client'\] as const;/g,
        replacement: "const ALL_ROLES = ['admin', 'employee', 'client'] as const;"
    },
    {
        file: 'apps/frontend/app/(platform)/(settings-app)/_components/EmployeeBankDetails.tsx',
        regex: /const isAdmin = \['admin', 'manager', 'hr'\]\.includes\(currentUser\?\.role \|\| ''\);/g,
        replacement: "const isAdmin = currentUser?.role === 'admin';"
    },
    {
        file: 'apps/frontend/app/(platform)/(social-media-management-app)/content-calendar/page.tsx',
        regex: /if \(user && !\['admin', 'manager', 'hr'\]\.includes\(user\.role\)\) \{/g,
        replacement: "if (user && user.role !== 'admin') {"
    },
    {
        file: 'apps/frontend/app/(platform)/(workspace-tools-app)/documents/page.tsx',
        regex: /const isAdminHrFinance = user\?\.roles\?\.some\(\(r: string\) => \['admin', 'ceo'\]\.includes\(r\)\) \|\| \['admin', 'ceo'\]\.includes\(user\?\.role \|\| ''\) \|\|/g,
        replacement: "const isAdminHrFinance = user?.roles?.some((r: string) => r === 'admin') || user?.role === 'admin' ||"
    },
    {
        file: 'apps/frontend/app/(setup)/onboarding/page.tsx',
        regex: /if \(\['admin', 'hr'\]\.includes\(user\?\.role \|\| ''\) && allObs\.length > 0 && !ob\) \{/g,
        replacement: "if (user?.role === 'admin' && allObs.length > 0 && !ob) {"
    },
    {
        file: 'apps/frontend/components/shared/SubscriptionExpiredWall.tsx',
        regex: /const isAdmin = \['admin', 'manager'\]\.includes\(user\?\.role \|\| ''\) \|\| user\?\.roles\?\.includes\('admin'\) \|\| user\?\.roles\?\.includes\('manager'\);/g,
        replacement: "const isAdmin = user?.role === 'admin' || user?.roles?.includes('admin');"
    }
];

for (const { file, regex, replacement } of replacements) {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        content = content.replace(regex, replacement);
        fs.writeFileSync(fullPath, content);
        console.log('Updated ' + file);
    }
}
