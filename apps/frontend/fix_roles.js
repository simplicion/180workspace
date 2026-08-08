const fs = require('fs');
const file = 'app/dashboard/(settings-app)/settings/roles-access/page.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/editingAccess/g, 'selectedUser');
content = content.replace(/setEditingAccess/g, 'setSelectedUser');
content = content.replace(/loadRoles\(\)/g, 'fetchUsers()');
fs.writeFileSync(file, content);
