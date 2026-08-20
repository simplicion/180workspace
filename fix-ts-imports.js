const fs = require('fs');
const path = require('path');
function fixTs(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== 'dist') fixTs(fullPath);
        } else if (fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.match(/from\s+['"][^'"]+\.ts['"]/)) {
                content = content.replace(/(from\s+['"][^'"]+)\.ts(['"])/g, '$1.js$2');
                fs.writeFileSync(fullPath, content);
                console.log('Fixed:', fullPath);
            }
        }
    }
}
fixTs('packages/domains');
