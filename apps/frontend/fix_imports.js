const fs = require('fs');

const drawerFiles = [
    'app/dashboard/(productivity-tools-app)/_components/AIEmailDraftDrawer.tsx',
    'app/dashboard/(productivity-tools-app)/_components/ContentPieceDrawer.tsx',
    'app/dashboard/(productivity-tools-app)/_components/DocumentAIChatDrawer.tsx',
    'app/dashboard/(productivity-tools-app)/_components/EventDetailsDrawer.tsx',
    'app/dashboard/(productivity-tools-app)/_components/TemplatesListDrawer.tsx',
    'app/dashboard/(settings-app)/_components/ManageAccessDrawer.tsx'
];

for (const file of drawerFiles) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        content = content.replace(/import\s+Drawer\s+from\s+['"]@\/components\/ui\/Drawer['"];?/g, 'import { Drawer } from "@/components/ui/Drawer";');
        fs.writeFileSync(file, content);
    }
}

const recruitmentPage = 'app/dashboard/(hr-management-app)/recruitment/page.tsx';
if (fs.existsSync(recruitmentPage)) {
    let content = fs.readFileSync(recruitmentPage, 'utf8');
    content = content.replace(/\.\/_components\//g, '../_components/');
    fs.writeFileSync(recruitmentPage, content);
}

const assetsPage = 'app/dashboard/(assets-app)/assets/page.tsx';
if (fs.existsSync(assetsPage)) {
    let content = fs.readFileSync(assetsPage, 'utf8');
    content = content.replace(/AddAssetModal/g, 'AddAssetDrawer');
    fs.writeFileSync(assetsPage, content);
}

console.log('Fixes applied!');
