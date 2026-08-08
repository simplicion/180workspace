const fs = require('fs');

const schemaPath = 'c:/Users/saavi/OneDrive/Desktop/180workspace/packages/db/prisma/schema.prisma';
let content = fs.readFileSync(schemaPath, 'utf8');

// Replace model name
content = content.replace(/model CompanyTransaction \{/g, 'model CompanyTransaction {');

// Replace relations and types
content = content.replace(/CompanyTransaction(\s|\[|\?)/g, 'CompanyTransaction$1');
content = content.replace(/companyTransactions/g, 'companyTransactions');

fs.writeFileSync(schemaPath, content);
console.log('Updated schema.prisma');
