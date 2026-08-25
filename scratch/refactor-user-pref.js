const fs = require('fs');
const path = 'C:/Users/saavi/OneDrive/Desktop/180workspace/packages/domains/identity/src/user-preference/user-preference.service.ts';
let code = fs.readFileSync(path, 'utf8');

// Remove unused getCompanyPrisma import
code = code.replace(/import \{ getCompanyPrisma \} from '@workspace\/db';\n?/g, '');

fs.writeFileSync(path, code);
console.log('Fixed user-preference.service.ts');
