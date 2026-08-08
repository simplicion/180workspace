'use strict';

const { prisma } = require('@workspace/db');

/**
 * Lifecycle Service â€” Manages Trial Expiration & Data Cleanup (migrated to Prisma/PostgreSQL)
 */
class LifecycleService {
    /**
     * Initializes a company's trial dates upon registration.
     */
    static async handleOnboarding(company) {
        const settings = await prisma.platformSettings.findFirst() || {};
        const trialDays = settings.trialDays || 14;
        const retentionDays = settings.dataRetentionDays || 30;

        const now = new Date();
        const trialEndDate = new Date(now);
        trialEndDate.setDate(trialEndDate.getDate() + trialDays);

        const dataDeletionDate = new Date(trialEndDate);
        dataDeletionDate.setDate(dataDeletionDate.getDate() + retentionDays);

        const updatedCompany = await prisma.company.update({
            where: { id: company.id },
            data: {
                trialStartDate: now,
                trialEndDate: trialEndDate,
                // store dataDeletionDate inside metadata JSON
                metadata: {
                    ...(company.metadata || {}),
                    dataDeletionDate: dataDeletionDate.toISOString()
                },
                accountStatus: 'active',
                subscriptionStatus: 'trial'
            }
        });

        return updatedCompany;
    }

    /**
     * Scans for companies whose trials have newly expired.
     */
    static async checkExpirations() {
        const now = new Date();
        const expiredCompanies = await prisma.company.findMany({
            where: {
                accountStatus: 'active',
                subscriptionStatus: 'trial',
                trialEndDate: { lt: now }
            }
        });

        const EmailService = require('../../productivity-tools-app/emails/email.service.js');

        for (const company of expiredCompanies) {
            console.log(`[Lifecycle] Trial expired for: ${company.name}`);
            
            await prisma.company.update({
                where: { id: company.id },
                data: {
                    accountStatus: 'trial_expired',
                    subscriptionStatus: 'expired'
                }
            });

            // Notify Admin
            try {
                await EmailService.notify(
                    { email: company.adminEmail, name: company.adminName },
                    'trial_expired',
                    { adminName: company.adminName },
                    prisma
                );
            } catch (err) {
                console.error(`[Lifecycle] Email failed for ${company.adminEmail}:`, err.message);
            }
        }
        return expiredCompanies.length;
    }

    /**
     * Scans for 'trial_expired' companies past their data retention date.
     */
    static async cleanupExpiredData() {
        const now = new Date();
        const companies = await prisma.company.findMany({
            where: {
                accountStatus: 'trial_expired',
                subscriptionStatus: 'expired'
            }
        });

        let count = 0;
        for (const company of companies) {
            const metadata = company.metadata || {};
            if (metadata.dataDeletionDate) {
                const deletionDate = new Date(metadata.dataDeletionDate);
                if (deletionDate < now) {
                    await this.performSafeDelete(company);
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * Sends warnings to companies approaching their data deletion date.
     */
    static async checkDeletionWarnings() {
        const warningDays = 7;
        const now = new Date();
        const warningThreshold = new Date(now);
        warningThreshold.setDate(warningThreshold.getDate() + warningDays);

        const companies = await prisma.company.findMany({
            where: {
                accountStatus: 'trial_expired'
            }
        });

        const EmailService = require('../../productivity-tools-app/emails/email.service.js');

        for (const company of companies) {
            const metadata = company.metadata || {};
            if (metadata.dataDeletionDate && !metadata.deletion_warning_sent) {
                const deletionDate = new Date(metadata.dataDeletionDate);
                if (deletionDate < warningThreshold && deletionDate > now) {
                    try {
                        const daysRemaining = Math.ceil((deletionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        
                        await EmailService.notify(
                            { email: company.adminEmail, name: company.adminName },
                            'deletion_warning',
                            {
                                retentionDays: daysRemaining,
                                deletionDate: deletionDate,
                                adminName: company.adminName
                            },
                            prisma
                        );

                        // Mark as warned in metadata
                        await prisma.company.update({
                            where: { id: company.id },
                            data: {
                                metadata: {
                                    ...metadata,
                                    deletion_warning_sent: true
                                }
                            }
                        });
                    } catch (err) {
                        console.error(`[Lifecycle] Deletion warning failed for ${company.adminEmail}:`, err.message);
                    }
                }
            }
        }
    }

    /**
     * Deletes operational records from PostgreSQL matching companyId.
     */
    static async performSafeDelete(company) {
        console.log(`[Lifecycle] Starting safe delete for: ${company.name}`);
        let recordsDeleted = {};

        try {
            // Models to prune (operational data)
            const modelsToClean = [
                'Project', 'Task', 'Client', 'Attendance', 'Leave', 'Job', 'Application',
                'Document', 'Notification', 'Chat', 'Message', 'AutomationLog', 'EmailLog',
                'AuditLog', 'Salary', 'Expense', 'Invoice', 'Review', 'CalendarEvent',
                'Asset', 'Category', 'Milestone', 'TimeLog', 'MeetingLog', 'Holiday'
            ];

            for (const modelName of modelsToClean) {
                const prismaModel = modelName.charAt(0).toLowerCase() + modelName.slice(1);
                if (prisma[prismaModel]) {
                    const count = await prisma[prismaModel].count({ where: { companyId: company.id } });
                    await prisma[prismaModel].deleteMany({ where: { companyId: company.id } });
                    recordsDeleted[modelName] = count;
                }
            }

            // Update Company Status
            await prisma.company.update({
                where: { id: company.id },
                data: {
                    accountStatus: 'deleted',
                    metadata: {
                        ...(company.metadata || {}),
                        lastCleanupAt: new Date().toISOString()
                    }
                }
            });

            // Audit Log
            await prisma.deletionLog.create({
                data: {
                    companyId: company.id,
                    companyName: company.name,
                    adminEmail: company.adminEmail,
                    recordsDeleted: JSON.stringify(recordsDeleted),
                    success: true
                }
            });

            console.log(`[Lifecycle] Successfully cleaned up ${company.name}`);

        } catch (err) {
            console.error(`[Lifecycle] Cleanup failed for ${company.name}:`, err.message);
            await prisma.deletionLog.create({
                data: {
                    companyId: company.id,
                    companyName: company.name,
                    adminEmail: company.adminEmail,
                    success: false,
                    error: err.message
                }
            });
        }
    }

    /**
     * Performs a full, permanent deletion of a company and ALL associated data.
     */
    static async performFullDelete(companyId) {
        const company = await prisma.company.findUnique({ where: { id: companyId } });
        if (!company) throw new Error('Company not found');

        console.log(`[Lifecycle] Starting FULL delete for: ${company.name} (${companyId})`);

        // 1. Wipe Company Data (Operational Data)
        await this.performSafeDelete(company);

        // 2. Delete company users
        await prisma.user.deleteMany({ where: { companyId } });

        // 3. Delete billing records
        await prisma.subscription.deleteMany({ where: { companyId } });
        await prisma.paymentHistory.deleteMany({ where: { companyId } });

        // 4. Delete the Company document itself (frees the slug/subdomain)
        await prisma.company.delete({ where: { id: companyId } });

        console.log(`[Lifecycle] Completed FULL delete for: ${company.name}`);
        return true;
    }
}

module.exports = LifecycleService;
