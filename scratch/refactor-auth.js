const fs = require('fs');
const path = 'C:/Users/saavi/OneDrive/Desktop/180workspace/packages/domains/identity/src/auth/auth.service.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Add requestContext to imports
if (!code.includes('requestContext')) {
  code = code.replace(
    "import { prisma as globalPrisma, getCompanyPrisma } from '@workspace/db';",
    "import { prisma as globalPrisma, getCompanyPrisma, requestContext } from '@workspace/db';"
  );
}

function replaceMethod(methodName, argsRegex, companyIdVar) {
    const regex = new RegExp(`(static async ${methodName}\\(${argsRegex}\\)\\s*\\{)\\n([\\s\\S]*?\\n    \\})`, 'g');
    code = code.replace(regex, (match, signature, body) => {
        // Remove getCompanyPrisma from the body
        let newBody = body.replace(/const companyPrisma = getCompanyPrisma\([^)]+\);/g, 'const companyPrisma = globalPrisma;');
        // indent the body
        newBody = newBody.split('\n').map((line, i, arr) => {
            if (i === arr.length - 1) return line; // the closing brace '    }' will be handled separately
            return line ? '    ' + line : line;
        }).join('\n');
        
        // return the wrapped version
        return `${signature}\n        return requestContext.run({ companyId: ${companyIdVar} }, async () => {\n${newBody.replace(/\n    \}$/, '\n        });\n    }')}`;
    });
}

// Wrap register
replaceMethod('register', 'body: any, company: any, currentUser: any', 'company.id');
// Wrap changePassword
replaceMethod('changePassword', 'body: any, currentUser: any, companyObj: any', 'companyObj.id');
// Wrap setupMFA
replaceMethod('setupMFA', 'currentUser: any, companyObj: any', 'companyObj.id');
// Wrap enableMFA
replaceMethod('enableMFA', 'body: any, currentUser: any', 'currentUser.companyId');
// Wrap completeWorkspaceSetup - Wait! completeWorkspaceSetup resolves companyId inside the function.
// It can't be fully wrapped immediately at the top level without resolving companyId first.

fs.writeFileSync(path, code);
console.log('Done replacement.');
