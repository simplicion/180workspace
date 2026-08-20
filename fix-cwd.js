const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== 'dist') replaceInDir(fullPath);
        } else if (fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes(`process.cwd() + '/apps/backend/src/`)) {
                content = content.replace(/process\.cwd\(\)\s*\+\s*['"`]\/apps\/backend\/src\//g, `(process.cwd().endsWith('backend') ? process.cwd() + '/src/' : process.cwd() + '/apps/backend/src/')`);
                fs.writeFileSync(fullPath, content);
                console.log('Fixed:', fullPath);
            }
        }
    }
}

replaceInDir('packages/domains');
