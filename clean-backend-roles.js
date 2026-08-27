const fs = require('fs');
const path = require('path');

const replacements = [
    {
        file: 'packages/domains/projects-and-tasks/src/tasks/task.service.ts',
        regex: /const isAdminOrCeo = userRoles\.includes\('admin'\) \|\| userRoles\.includes\('ceo'\);/g,
        replacement: "const isAdminOrCeo = userRoles.includes('admin');"
    },
    {
        file: 'packages/domains/projects-and-tasks/src/modules/module.service.ts',
        regex: /const isAdminOrManager = userRoles\.some\(role => \['admin', 'manager', 'ceo', 'BMSP_SUPER_ADMIN', 'BMSP_ADMIN'\]\.includes\(role\)\) \|\| \((data|user as any)\.?permissions\?\.\includes\('can_manage_team'\) \|\| data\.permissions && data\.permissions\.includes\('can_manage_team'\)\);/g,
        replacement: "const isAdminOrManager = userRoles.includes('admin') || ($1.permissions && $1.permissions.includes('can_manage_team'));"
    },
    {
        file: 'packages/domains/identity/src/user/user.service.ts',
        regex: /if \(!\['admin', 'ceo'\]\.includes\(currentUser\.role\)\) \{/g,
        replacement: "if (currentUser.role !== 'admin') {"
    },
    {
        file: 'packages/domains/identity/src/auth/auth.service.ts',
        regex: /role: 'ceo'/g,
        replacement: "role: 'admin'"
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
