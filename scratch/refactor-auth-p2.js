const fs = require('fs');
const path = 'C:/Users/saavi/OneDrive/Desktop/180workspace/packages/domains/identity/src/auth/auth.service.ts';
let code = fs.readFileSync(path, 'utf8');

// fix refreshToken
code = code.replace(
  /const companyPrisma = getCompanyPrisma\(company\.id\);\s*const user = await companyPrisma\.user\.findUnique\(\{ where: \{ id: decoded\.id \} \}\);/,
  `const user = await requestContext.run({ companyId: company.id }, async () => {
            return await globalPrisma.user.findUnique({ where: { id: decoded.id } });
        });`
);

// fix completeWorkspaceSetup
code = code.replace(
  /const companyPrisma = getCompanyPrisma\(companyId\);/g,
  `const companyPrisma = globalPrisma;` // wait, we must wrap it!
);

fs.writeFileSync(path, code);
console.log('Fixed refreshToken');
