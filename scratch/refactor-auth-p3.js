const fs = require('fs');
const path = 'C:/Users/saavi/OneDrive/Desktop/180workspace/packages/domains/identity/src/auth/auth.service.ts';
let code = fs.readFileSync(path, 'utf8');

const completeWorkspaceSetupStart = code.indexOf('static async completeWorkspaceSetup(');
const completeWorkspaceSetupEnd = code.indexOf('static async forgotPassword(');
let block = code.substring(completeWorkspaceSetupStart, completeWorkspaceSetupEnd);

let newBlock = block.replace(
  /let companyId = reqCompany\?\.id;\s*const companyPrisma = globalPrisma;([\s\S]*?if \(!user\) \{)/,
  `let companyId = reqCompany?.id;

        if (!user && onboardingTokenHeader) {
            if (!reqCompany || (reqCompany.metadata as any)?.onboardingToken !== onboardingTokenHeader) {
                throw AppError.forbidden('Invalid or expired onboarding token');
            }
            companyId = reqCompany.id;
        }

        if (!companyId) {
            throw AppError.badRequest('Company context is missing');
        }

        return requestContext.run({ companyId }, async () => {
            const companyPrisma = globalPrisma;

            if (!user && onboardingTokenHeader) {
                user = await companyPrisma.user.findFirst({ where: { role: 'admin' } });
            }

            if (!user) {`
);

// properly format lines for inner indentation
let lines = newBlock.split('\n');
let inside = false;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('return requestContext.run')) {
        inside = true;
        continue;
    }
    if (inside && lines[i].trim() !== '') {
        lines[i] = '    ' + lines[i];
    }
}
newBlock = lines.join('\n');

newBlock = newBlock.replace(/\n        \}\n$/, '\n            });\n        }\n');

code = code.substring(0, completeWorkspaceSetupStart) + newBlock + code.substring(completeWorkspaceSetupEnd);
fs.writeFileSync(path, code);
console.log('Fixed completeWorkspaceSetup');
