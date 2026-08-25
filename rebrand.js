const fs = require('fs');
const path = require('path');

const EXCLUDED_DIRS = ['.git', 'node_modules', '.next', 'dist', 'build', 'out'];

// Replacements to make in file content
const REPLACEMENTS = [
    { regex: /180workspace/g, replacement: '180workspace' },
    { regex: /180workspace/g, replacement: '180workspace' },
    { regex: /180workspace/g, replacement: '180workspace' },
    { regex: /180workspace/g, replacement: '180workspace' },
    { regex: /180workspace/g, replacement: '180workspace' },
    { regex: /WORKSPACE/g, replacement: 'WORKSPACE' },
    { regex: /workspace/g, replacement: 'workspace' }
];

function processFile(filePath) {
    if (filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.svg') || filePath.endsWith('.ico') || filePath.endsWith('.lock') || filePath.endsWith('.lockb')) {
        return;
    }

    try {
        let content = fs.readFileSync(filePath, 'utf-8');
        let newContent = content;

        for (const rule of REPLACEMENTS) {
            newContent = newContent.replace(rule.regex, rule.replacement);
        }

        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent);
            console.log(`Updated content in ${filePath}`);
        }
    } catch (e) {
        // Skip binary or locked files
    }
}

function walk(dir) {
    let list = fs.readdirSync(dir);
    for (let file of list) {
        if (EXCLUDED_DIRS.includes(file)) continue;
        let filePath = path.join(dir, file);
        let stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            walk(filePath);
        } else {
            processFile(filePath);
        }
    }
}

// 1. Process files
walk('.');

// 2. Perform file/folder renames
const renames = [
    { from: 'apps/frontend/redux/api/workspaceSocialApi.js', to: 'apps/frontend/redux/api/workspaceSocialApi.js' },
    { from: 'apps/frontend/redux/api/workspaceSocialApi.ts', to: 'apps/frontend/redux/api/workspaceSocialApi.ts' },
    { from: '.agents/rules/180workspace-vision.md', to: '.agents/rules/workspace-vision.md' },
    { from: 'apps/docs/docs/12-observability/180workspace.md', to: 'apps/docs/docs/12-observability/180workspace.md' },
    { from: 'apps/docs/docs/24-reports/180workspace-architecture.md', to: 'apps/docs/docs/24-reports/180workspace-architecture.md' } // Just in case
];

for (const renameRule of renames) {
    if (fs.existsSync(renameRule.from)) {
        fs.renameSync(renameRule.from, renameRule.to);
        console.log(`Renamed ${renameRule.from} to ${renameRule.to}`);
    }
}

console.log('Rebrand completed.');
