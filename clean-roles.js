const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'apps/frontend/lib/navigation.ts');
let content = fs.readFileSync(file, 'utf8');

const regex = /roles:\s*\[([^\]]+)\]/g;
content = content.replace(regex, (match, p1) => {
    let roles = p1.split(',').map(r => r.trim().replace(/['"]/g, ''));
    let newRoles = roles.filter(r => ['admin', 'employee', 'client'].includes(r));
    return 'roles: [' + newRoles.map(r => `'${r}'`).join(', ') + ']';
});

fs.writeFileSync(file, content);
console.log('Done replacing navigation.ts');
