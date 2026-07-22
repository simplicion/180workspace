const fs = require('fs');
const files = [
  'apps/backend/src/app-registry/crm-and-sales-app/sales/sales.service.js',
  'apps/backend/src/app-registry/crm-and-sales-app/sales/sales.controller.js'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/tenantPrisma\.(lead|opportunity)/g, (match, p1) => {
    return p1 === 'lead' ? 'tenantPrisma.deal' : 'tenantPrisma.lead';
  });
  content = content.replace(/tenantDb\.(lead|opportunity)/g, (match, p1) => {
    return p1 === 'lead' ? 'tenantDb.deal' : 'tenantDb.lead';
  });
  fs.writeFileSync(file, content);
});
