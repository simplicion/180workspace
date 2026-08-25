const fs = require('fs');
const path = 'C:/Users/saavi/OneDrive/Desktop/180workspace/packages/domains/identity/src/profile/profile.service.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Remove companyPrisma: any from all method signatures
code = code.replace(/static async (\w+)\(\s*companyPrisma:\s*any,\s*/g, 'static async $1(');
code = code.replace(/static async (\w+)\(\s*companyPrisma:\s*any\s*\)/g, 'static async $1()');

// 2. Replace all remaining companyPrisma with prisma
code = code.replace(/companyPrisma/g, 'prisma');

// 3. Remove unused getCompanyPrisma import
code = code.replace(/import \{ getCompanyPrisma \} from '@workspace\/db';\n?/g, '');

fs.writeFileSync(path, code);
console.log('Fixed profile.service.ts');
