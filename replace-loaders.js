const fs = require('fs');
const path = require('path');

function processDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (!fullPath.includes('node_modules') && !fullPath.includes('.next')) {
                processDir(fullPath);
            }
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            processFile(fullPath);
        }
    }
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let hasChanges = false;
    
    // Quick check to avoid regex heavy operations if not needed
    if (!content.includes('Loader2')) {
        return;
    }

    // 1. Replace lucide-react import
    const importRegex = /import\s+({[^}]+})\s+from\s+['"]lucide-react['"]/g;
    let match;
    let replacedImports = false;

    // Use a while loop because there could be multiple lucide-react imports (though rare)
    content = content.replace(importRegex, (match, importsStr) => {
        const importBlock = importsStr.replace(/[{}]/g, '');
        const icons = importBlock.split(',').map(i => i.trim()).filter(i => i !== '');
        
        if (icons.includes('Loader2')) {
            replacedImports = true;
            const newIcons = icons.filter(i => i !== 'Loader2');
            if (newIcons.length === 0) {
                // If it was the only icon, replace the whole line with empty string
                // But we will add LogoLoader later
                return '';
            } else {
                return `import { ${newIcons.join(', ')} } from 'lucide-react'`;
            }
        }
        return match; // Return unchanged
    });

    if (replacedImports) {
        // Add LogoLoader import to the top of the file
        // Find the position of the last import to insert after, or just at top
        const hasUiImport = /import\s+{[^}]*}\s+from\s+['"]@workspace\/ui['"]/;
        if (hasUiImport.test(content)) {
            content = content.replace(/(import\s+{[^}]*)(\}\s+from\s+['"]@workspace\/ui['"])/, (match, p1, p2) => {
                if (p1.includes('LogoLoader')) return match; // Already there
                return `${p1}, LogoLoader ${p2}`;
            });
        } else {
            // Add new import statement at the beginning of the file, after 'use client' if present
            if (content.startsWith("'use client'") || content.startsWith('"use client"')) {
                content = content.replace(/^(['"]use client['"];?[\r\n]*)/, `$1import { LogoLoader } from "@workspace/ui";\n`);
            } else {
                content = `import { LogoLoader } from "@workspace/ui";\n${content}`;
            }
        }
        hasChanges = true;
    }

    // 2. Replace <Loader2 ... /> with <LogoLoader ... />
    if (content.includes('<Loader2') || content.includes('Loader2')) {
        content = content.replace(/<Loader2/g, '<LogoLoader');
        // Also handle cases where Loader2 is passed as a prop, e.g. icon={Loader2} or Icon: Loader2
        content = content.replace(/\bLoader2\b/g, 'LogoLoader');
        hasChanges = true;
    }

    if (hasChanges) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated ${filePath}`);
    }
}

const appsDir = path.join(__dirname, 'apps');
processDir(path.join(appsDir, 'frontend'));
processDir(path.join(appsDir, 'admin-web'));
processDir(path.join(__dirname, 'packages', 'ui'));

console.log('Finished updating loaders.');
