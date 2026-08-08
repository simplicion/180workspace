const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceInDir(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;
            
            if (content.includes('companyTransaction')) {
                content = content.replace(/companyTransaction/g, 'companyTransaction');
                modified = true;
            }
            if (content.includes('CompanyTransaction')) {
                content = content.replace(/CompanyTransaction/g, 'CompanyTransaction');
                modified = true;
            }
            
            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log('Updated: ' + fullPath);
            }
        }
    }
}

replaceInDir('c:/Users/saavi/OneDrive/Desktop/180workspace/apps/backend/src');
replaceInDir('c:/Users/saavi/OneDrive/Desktop/180workspace/apps/worker/src');
replaceInDir('c:/Users/saavi/OneDrive/Desktop/180workspace/packages/db/src');
