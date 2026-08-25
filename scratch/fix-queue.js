const fs = require('fs');
const p = 'C:/Users/saavi/OneDrive/Desktop/180workspace/packages/backend-common/src/queue.service.ts';
let code = fs.readFileSync(p, 'utf8');

const origEmail = `    if (!emailQueue) {
        const { EmailService } = require('./email.service');
        const { getCompanyPrisma } = require('@workspace/db');
        
        try {
            const companyPrisma = targetCompanyId ? getCompanyPrisma(targetCompanyId) : null;
            return EmailService.dispatchEmail({ 
                to, 
                subject, 
                html, 
                templateName: template, 
                templateData: data,
                category
            }, companyPrisma);
        } catch (err) {
            console.error('[Queue Fallback] Failed to send email:', err.message);
            return { success: false, error: err.message };
        }
    }`;

const repEmail = `    if (!emailQueue) {
        const { EmailService } = require('./email.service');
        const { prisma, requestContext } = require('@workspace/db');
        
        try {
            return await requestContext.run({ companyId: targetCompanyId }, async () => {
                return await EmailService.dispatchEmail({ 
                    to, 
                    subject, 
                    html, 
                    templateName: template, 
                    templateData: data,
                    category
                }, targetCompanyId ? prisma : null);
            });
        } catch (err) {
            console.error('[Queue Fallback] Failed to send email:', err.message);
            return { success: false, error: err.message };
        }
    }`;

code = code.replace(origEmail, repEmail);

const origNotif = `    if (!notificationQueue) {
        const { getCompanyPrisma } = require('@workspace/db');
        const companyPrisma = companyId ? getCompanyPrisma(companyId) : null;
        if (companyPrisma) {
            return companyPrisma.notification.create({ data });
        }
        return null;
    }`;

const repNotif = `    if (!notificationQueue) {
        const { prisma, requestContext } = require('@workspace/db');
        if (companyId) {
            return await requestContext.run({ companyId }, async () => {
                return await prisma.notification.create({ data });
            });
        }
        return null;
    }`;

code = code.replace(origNotif, repNotif);

const origAuto = `        if (type === 'internal_trigger') {
            try {
                const { getCompanyPrisma } = require('@workspace/db');
                const AutomationService = require('../../../apps/backend/src/platform-core/platform-communications/services/automation.service');
                const companyPrisma = companyId ? getCompanyPrisma(companyId) : null;
                console.log(\`[Queue Fallback] Processing automation [\${data.eventType}] immediately for company \${companyId}\`);
                return await AutomationService.processTrigger(data, companyPrisma);
            } catch (err) {
                console.error('[Queue Fallback] Failed to process automation immediately:', err.message);
                return { success: false, error: err.message };
            }
        }`;

const repAuto = `        if (type === 'internal_trigger') {
            try {
                const { prisma, requestContext } = require('@workspace/db');
                const AutomationService = require('../../../apps/backend/src/platform-core/platform-communications/services/automation.service');
                console.log(\`[Queue Fallback] Processing automation [\${data.eventType}] immediately for company \${companyId}\`);
                return await requestContext.run({ companyId }, async () => {
                    return await AutomationService.processTrigger(data, companyId ? prisma : null);
                });
            } catch (err) {
                console.error('[Queue Fallback] Failed to process automation immediately:', err.message);
                return { success: false, error: err.message };
            }
        }`;

code = code.replace(origAuto, repAuto);

fs.writeFileSync(p, code);
console.log('Fixed queue.service.ts');
