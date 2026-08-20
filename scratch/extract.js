const fs = require('fs');

const path = 'c:/Users/saavi/OneDrive/Desktop/180workspace/packages/domains/identity/src/auth.service.ts';
let content = fs.readFileSync(path, 'utf8');

// Replace strict
content = content.replace(/'use strict';\n/g, '');

// Replace basic requires with imports
content = content.replace(/const\s+\{([^}]+)\}\s*=\s*require\((['"][^'"]+['"])\);/g, 'import { $1 } from $2;');
content = content.replace(/const\s+([a-zA-Z0-9_]+)\s*=\s*require\((['"][^'"]+['"])\);/g, 'import $1 from $2;');

// Special replacements for internal paths since they are moved to @workspace/identity
content = content.replace(/import \{ logAction \} from '\.\.\/\.\.\/system-configs\/middleware\/audit\/audit\.js';/g, 'import { logAction } from \'@workspace/backend-common\';');
content = content.replace(/import \{ signAccessToken, signRefreshToken \} from '\.\.\/\.\.\/system-configs\/middleware\/auth\/auth\.js';/g, 'import { signAccessToken, signRefreshToken } from \'@workspace/backend-common\';');
content = content.replace(/import BillingService from '\.\.\/finance-app\/bills\/billing\.service';/g, 'import { BillingService } from \'@workspace/finance\';');
content = content.replace(/import EmailService from '\.\.\/communications-app\/emails\/email\.service';/g, 'import { EmailService } from \'@workspace/communications\';');
content = content.replace(/import { prisma: globalPrisma, getCompanyPrisma } from '@workspace\/db';/g, 'import { PrismaClient, prisma as globalPrisma, getCompanyPrisma } from \'@workspace/db\';');

// Replace module.exports
content = content.replace(/module\.exports\s*=\s*AuthService;/g, 'export { AuthService };');
content = content.replace(/class AuthService \{/g, 'export class AuthService {');

// Fix inline requires
content = content.replace(/const AutomationService = require\('\.\.\/\.\.\/platform-core\/platform-communications\/services\/automation\.service\.js'\);/g, 'import { AutomationService } from \'@workspace/communications\';');
content = content.replace(/const \{ getIo \} = require\('\.\.\/\.\.\/system-configs\/sockets'\);/g, 'import { getIo } from \'@workspace/backend-common\';');

// Type overrides
content = content.replace(/static async registerTenant\(body\)/g, 'static async registerTenant(body: any)');
content = content.replace(/static async register\(companyPrisma, body, company, currentUser\)/g, 'static async register(companyPrisma: any, body: any, company: any, currentUser: any)');
content = content.replace(/static async login\(body, req\)/g, 'static async login(body: any, req: any)');
content = content.replace(/static async verify2FA\(userId, token\)/g, 'static async verify2FA(userId: string, token: string)');
content = content.replace(/static async setup2FA\(userId\)/g, 'static async setup2FA(userId: string)');
content = content.replace(/static async disable2FA\(userId, token\)/g, 'static async disable2FA(userId: string, token: string)');
content = content.replace(/static async forgotPassword\(email\)/g, 'static async forgotPassword(email: string)');
content = content.replace(/static async resetPassword\(token, newPassword\)/g, 'static async resetPassword(token: string, newPassword: string)');
content = content.replace(/static async verifyEmail\(token\)/g, 'static async verifyEmail(token: string)');

fs.writeFileSync(path, content);
console.log('Conversion complete.');
