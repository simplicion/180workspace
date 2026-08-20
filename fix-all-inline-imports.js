const fs = require('fs');
const path = require('path');

function fixInlineImports(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== 'dist') {
                fixInlineImports(fullPath);
            }
        } else if (fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // Find any inline imports. E.g.
            // import { getIo } from '../../system-configs/sockets';
            // import { redis } from '../../system-configs/config/redis.js';
            // import { OAuth2Client } from 'google-auth-library';
            // import crypto from 'crypto';
            // and comment them out, or replace them.
            
            const regex = /^(\s+)import\s+(?:\{[^}]+\}|[a-zA-Z0-9_]+)\s+from\s+['"][^'"]+['"];/gm;
            
            if (regex.test(content)) {
                console.log('Fixing inline imports in:', fullPath);
                
                content = content.replace(/^(\s+)import\s+\{\s*getIo\s*\}\s+from\s+['"][^'"]+['"];/gm, (match, spaces) => {
                    modified = true;
                    return `${spaces}// inline import getIo\n${spaces}const getIo = () => null;`;
                });
                content = content.replace(/^(\s+)import\s+\{\s*redis\s*\}\s+from\s+['"][^'"]+['"];/gm, (match, spaces) => {
                    modified = true;
                    return `${spaces}// inline import redis\n${spaces}const redis = null;`;
                });
                content = content.replace(/^(\s+)import\s+crypto\s+from\s+['"]crypto['"];/gm, (match, spaces) => {
                    modified = true;
                    return `${spaces}const crypto = require('crypto');`;
                });
                content = content.replace(/^(\s+)import\s+\{\s*OAuth2Client\s*\}\s+from\s+['"]google-auth-library['"];/gm, (match, spaces) => {
                    modified = true;
                    return `${spaces}const { OAuth2Client } = require('google-auth-library');`;
                });
                content = content.replace(/^(\s+)import\s+fs\s+from\s+['"]fs['"];/gm, (match, spaces) => {
                    modified = true;
                    return `${spaces}const fs = require('fs');`;
                });
                content = content.replace(/^(\s+)import\s+path\s+from\s+['"]path['"];/gm, (match, spaces) => {
                    modified = true;
                    return `${spaces}const path = require('path');`;
                });

                // Fallback for any other inline imports
                content = content.replace(/^(\s+)import\s+(.*)\s+from\s+(['"][^'"]+['"]);/gm, (match, spaces, importClause, source) => {
                    modified = true;
                    // convert to require
                    if (importClause.startsWith('{')) {
                        return `${spaces}const ${importClause} = require(${source});`;
                    } else if (importClause.includes('* as')) {
                        const name = importClause.split('as')[1].trim();
                        return `${spaces}const ${name} = require(${source});`;
                    } else {
                        // default import
                        return `${spaces}const ${importClause} = require(${source});`;
                    }
                });

                if (modified) {
                    fs.writeFileSync(fullPath, content);
                }
            }
        }
    }
}

fixInlineImports(path.join(__dirname, 'packages/domains'));
