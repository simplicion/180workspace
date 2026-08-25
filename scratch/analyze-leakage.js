const fs = require('fs');
const path = require('path');

const PRISMA_SCHEMA = 'c:\\Users\\saavi\\OneDrive\\Desktop\\180workspace\\packages\\db\\prisma\\schema.prisma';
const BACKEND_DIR = 'c:\\Users\\saavi\\OneDrive\\Desktop\\180workspace\\apps\\backend\\src';
const DOMAINS_DIR = 'c:\\Users\\saavi\\OneDrive\\Desktop\\180workspace\\packages\\domains\\src';

function getModelsWithCompanyId() {
    const schema = fs.readFileSync(PRISMA_SCHEMA, 'utf-8');
    const models = [];
    let currentModel = null;
    
    schema.split('\n').forEach(line => {
        if (line.trim().startsWith('model ')) {
            currentModel = line.split(' ')[1];
        } else if (currentModel && line.includes('companyId')) {
            if (!models.includes(currentModel)) {
                models.push(currentModel);
            }
        } else if (line.trim() === '}') {
            currentModel = null;
        }
    });
    return models;
}

function findVulnerableQueries(dir, models) {
    let vulnerabilities = [];
    
    if (!fs.existsSync(dir)) return vulnerabilities;
    
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        // Skip node_modules and .test.ts files
        if (fullPath.includes('node_modules') || fullPath.endsWith('.test.ts')) continue;
        
        if (stat.isDirectory()) {
            vulnerabilities = vulnerabilities.concat(findVulnerableQueries(fullPath, models));
        } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            
            models.forEach(model => {
                const modelCamel = model.charAt(0).toLowerCase() + model.slice(1);
                // Look for queries like prisma.user.findMany({ ... }) without companyId
                const queryRegex = new RegExp(`prisma\\.${modelCamel}\\.(findMany|findFirst|updateMany|deleteMany|count)\\s*\\(\\s*{([^}]*)}`, 'g');
                
                let match;
                while ((match = queryRegex.exec(content)) !== null) {
                    const queryArgs = match[2];
                    if (!queryArgs.includes('companyId')) {
                        vulnerabilities.push({
                            file: fullPath.replace('c:\\Users\\saavi\\OneDrive\\Desktop\\180workspace\\', ''),
                            model,
                            query: match[0].substring(0, 80).replace(/\n/g, ' ') + '...'
                        });
                    }
                }
            });
        }
    }
    return vulnerabilities;
}

const models = getModelsWithCompanyId();
const backendVulns = findVulnerableQueries(BACKEND_DIR, models);
const domainsVulns = findVulnerableQueries(path.join('c:\\Users\\saavi\\OneDrive\\Desktop\\180workspace\\packages\\domains'), models);

const allVulns = [...backendVulns, ...domainsVulns];

// Deduplicate
const unique = {};
allVulns.forEach(v => unique[v.file + v.model] = v);

fs.writeFileSync('leakage-results.json', JSON.stringify(Object.values(unique), null, 2));
console.log('Results written to leakage-results.json');
