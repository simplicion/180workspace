const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, regex, replacement) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf-8');
    content = content.replace(regex, replacement);
    fs.writeFileSync(filePath, content);
    console.log('Updated ' + filePath);
}

// 1. Update navigation.ts
replaceInFile(
    'apps/frontend/lib/navigation.ts',
    /href:\s*['"`]\/dashboard\/?([^'"`]*)['"`]/g,
    "href: '/$1'"
);

// 2. Update module-map.ts
replaceInFile(
    'apps/frontend/lib/module-map.ts',
    /['"`]\/dashboard\/?([^'"`]*)['"`]:/g,
    "'/$1':"
);

// 3. Go through all tsx/ts files in apps/frontend and replace "/dashboard" with "/" for routing purposes.
function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walk(dirPath, callback);
        } else {
            callback(path.join(dir, f));
        }
    });
}

walk('apps/frontend', function(filePath) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf-8');
        let newContent = content.replace(/['"`]\/dashboard([^'"`]*)['"`]/g, (match, p1) => {
            // Avoid touching api routes if any 
            if (p1.startsWith('/api') || match.includes('/api/')) return match;
            
            // Replaces "/dashboard/foo" to "/foo"
            return `'/${p1.replace(/^\//, '')}'`;
        });
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent);
            console.log('Replaced dashboard links in ' + filePath);
        }
    }
});
