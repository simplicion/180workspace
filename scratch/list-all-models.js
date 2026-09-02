const fs = require('fs');
const content = fs.readFileSync('packages/db/prisma/schema.prisma', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.trim().startsWith('model ')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
