const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
const content = fs.readFileSync(schemaPath, 'utf8');
const lines = content.split('\n');

const outLines = [];
let currentModel = null;
let hasCompanyId = false;
let hasCreatedAt = false;
let hasCompanyIdIdIndex = false;
let hasCompanyIdCreatedAtIndex = false;

// We will collect the model boundaries to process
const models = [];
let startIdx = -1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const tline = line.trim();
  if (tline.startsWith('model ')) {
    currentModel = tline.split(' ')[1];
    hasCompanyId = false;
    hasCreatedAt = false;
    hasCompanyIdIdIndex = false;
    hasCompanyIdCreatedAtIndex = false;
    startIdx = i;
  } else if (currentModel && tline.startsWith('}')) {
    if (hasCompanyId) {
      models.push({
        name: currentModel,
        startLine: startIdx,
        endLine: i,
        hasCreatedAt,
        hasCompanyIdIdIndex,
        hasCompanyIdCreatedAtIndex
      });
    }
    currentModel = null;
  } else if (currentModel) {
    if (tline.match(/^companyId\s+/)) hasCompanyId = true;
    if (tline.match(/^createdAt\s+/)) hasCreatedAt = true;
    if (tline.includes('@@index([companyId, id])')) hasCompanyIdIdIndex = true;
    if (tline.includes('@@index([companyId, createdAt])')) hasCompanyIdCreatedAtIndex = true;
  }
}

// Now we apply replacements from bottom to top to preserve line numbers
for (let i = models.length - 1; i >= 0; i--) {
  const m = models[i];
  const inserts = [];
  
  if (!m.hasCompanyIdIdIndex) {
    inserts.push('  @@index([companyId, id])');
  }
  if (m.hasCreatedAt && !m.hasCompanyIdCreatedAtIndex) {
    inserts.push('  @@index([companyId, createdAt])');
  }
  
  if (inserts.length > 0) {
    // Find where to insert (right before the '}')
    // But what if there are mapping or other attributes? We just insert right before }
    let endIdx = m.endLine;
    lines.splice(endIdx, 0, ...inserts);
  }
}

fs.writeFileSync(schemaPath, lines.join('\n'));
console.log(`Injected missing indexes.`);
