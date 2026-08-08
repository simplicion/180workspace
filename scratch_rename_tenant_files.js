const fs = require('fs');
const path = require('path');

function renameInDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.next' || file === 'dist' || file === 'build') continue;
        
        const fullPath = path.join(dir, file);
        
        let newName = file.replace(/tenant/g, 'company').replace(/Tenant/g, 'Company');
        if (newName !== file) {
            const newPath = path.join(dir, newName);
            fs.renameSync(fullPath, newPath);
            console.log(`Renamed ${fullPath} to ${newPath}`);
            if (fs.statSync(newPath).isDirectory()) {
                renameInDir(newPath);
            }
        } else {
            if (fs.statSync(fullPath).isDirectory()) {
                renameInDir(fullPath);
            }
        }
    }
}

renameInDir('c:/Users/saavi/OneDrive/Desktop/180workspace/apps');
renameInDir('c:/Users/saavi/OneDrive/Desktop/180workspace/packages');
