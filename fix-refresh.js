const fs = require('fs');
const files = [
  'apps/frontend/app/dashboard/(settings-app)/_components/StorageTab.tsx',
  'apps/frontend/app/dashboard/(settings-app)/settings/company-legals/page.tsx',
  'apps/frontend/app/dashboard/(settings-app)/settings/apps/[appId]/config/page.tsx',
  'apps/admin-web/components/settings/StorageTab.tsx',
  'apps/admin-web/app/workspace-setup/page.tsx',
  'apps/admin-web/components/settings/CompanyTab.tsx',
  'apps/frontend/app/dashboard/(settings-app)/_components/AiTab.tsx',
  'apps/admin-web/components/settings/AiTab.tsx',
  'apps/frontend/app/dashboard/(settings-app)/_components/IntegrationsTab.tsx',
  'apps/frontend/app/dashboard/(settings-app)/_components/DatabaseTab.tsx',
  'apps/admin-web/components/settings/IntegrationsTab.tsx',
  'apps/admin-web/components/settings/DatabaseTab.tsx'
];

for(const f of files) {
   if(fs.existsSync(f)) {
       let content = fs.readFileSync(f, 'utf8');
       content = content.replace(/await refreshSettings\(\);?/g, 'await refreshSettings(true);');
       content = content.replace(/await refreshGlobalSettings\(\);?/g, 'await refreshGlobalSettings(true);');
       
       // Handle cases where it might not have await
       content = content.replace(/refreshSettings\(\);/g, 'refreshSettings(true);');
       content = content.replace(/refreshGlobalSettings\(\);/g, 'refreshGlobalSettings(true);');
       fs.writeFileSync(f, content);
   }
}
