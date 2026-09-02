const fs = require('fs');
const content = fs.readFileSync('packages/db/prisma/schema.prisma', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('model form')) {
        console.log(`Line ${idx + 1}: ${line}`);
    }
});
