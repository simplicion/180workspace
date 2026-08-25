const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, 'apps', 'frontend', 'app');

// Rename (dashboard) to (platform)
const dashboardPath = path.join(appDir, '(dashboard)');
const platformPath = path.join(appDir, '(platform)');
if (fs.existsSync(dashboardPath)) {
    fs.renameSync(dashboardPath, platformPath);
    console.log('Renamed (dashboard) to (platform)');
}

// Create (public) directory
const publicPath = path.join(appDir, '(public)');
if (!fs.existsSync(publicPath)) {
    fs.mkdirSync(publicPath);
    console.log('Created (public) directory');
}

// Move folders to (public)
const foldersToMove = ['privacy-policy', 'terms-of-service', 'jobs'];
for (const folder of foldersToMove) {
    const srcPath = path.join(appDir, folder);
    const destPath = path.join(publicPath, folder);
    if (fs.existsSync(srcPath)) {
        fs.renameSync(srcPath, destPath);
        console.log('Moved ' + folder + ' to (public)');
    }
}
