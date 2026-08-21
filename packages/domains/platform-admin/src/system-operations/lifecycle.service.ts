import { EmailService } from '@workspace/backend-infra';
import { LifecycleRepository } from '../repositories/lifecycle.repository';

/**
 * Lifecycle Service — Manages Trial Expiration & Data Cleanup (migrated to Prisma/PostgreSQL)
 */
export class LifecycleService {
    /**
     * Initializes a company's trial dates upon registration.
     */
    static async handleOnboarding(company: any) {
        const settings = (await LifecycleRepository.getPlatformSettings()) || {} as any;
        const trialDays = settings.trialDays || 14;
        const retentionDays = settings.dataRetentionDays || 30;

        const now = new Date();
        const trialEndDate = new Date(now);
        trialEndDate.setDate(trialEndDate.getDate() + trialDays);

        const dataDeletionDate = new Date(trialEndDate);
        dataDeletionDate.setDate(dataDeletionDate.getDate() + retentionDays);

        const updatedCompany = await LifecycleRepository.updateCompany(company.id, {
            trialStartDate: now,
            trialEndDate: trialEndDate,
            metadata: {
                ...(company.metadata as any || {}),
                dataDeletionDate: dataDeletionDate.toISOString()
            },
            accountStatus: 'active',
            subscriptionStatus: 'trial'
        });

        return updatedCompany;
    }

    /**
     * Scans for companies whose trials have newly expired.
     */
    static async checkExpirations() {
        const now = new Date();
        const expiredCompanies = await LifecycleRepository.findCompanies({
            accountStatus: 'active',
            subscriptionStatus: 'trial',
            trialEndDate: { lt: now }
        });

        for (const company of expiredCompanies) {
            console.log(`[Lifecycle] Trial expired for: ${company.name}`);
            
            await LifecycleRepository.updateCompany(company.id, {
                accountStatus: 'trial_expired',
                subscriptionStatus: 'expired'
            });

            // Notify Admin
            try {
                await EmailService.notify(
                    { email: company.adminEmail, name: company.adminName },
                    'trial_expired',
                    { adminName: company.adminName },
                    LifecycleRepository.getRawPrismaClient()
                );
            } catch (err: any) {
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
        const companies = await LifecycleRepository.findCompanies({
            accountStatus: 'trial_expired',
            subscriptionStatus: 'expired'
        });

        let count = 0;
        for (const company of companies) {
            const metadata = company.metadata as any || {};
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

        const companies = await LifecycleRepository.findCompanies({
            accountStatus: 'trial_expired'
        });

        for (const company of companies) {
            const metadata = company.metadata as any || {};
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
                            LifecycleRepository.getRawPrismaClient()
                        );

                        // Mark as warned in metadata
                        await LifecycleRepository.updateCompany(company.id, {
                            metadata: {
                                ...metadata,
                                deletion_warning_sent: true
                            }
                        });
                    } catch (err: any) {
                        console.error(`[Lifecycle] Deletion warning failed for ${company.adminEmail}:`, err.message);
                    }
                }
            }
        }
    }

    /**
     * Deletes operational records from PostgreSQL matching companyId.
     */
    static async performSafeDelete(company: any) {
        console.log(`[Lifecycle] Starting safe delete for: ${company.name}`);
        let recordsDeleted: any = {};

        try {
            const modelsToClean = [
                'Project', 'Task', 'Client', 'Attendance', 'Leave', 'Job', 'Application',
                'Document', 'Notification', 'Chat', 'Message', 'AutomationLog', 'EmailLog',
                'AuditLog', 'Salary', 'Expense', 'Invoice', 'Review', 'CalendarEvent',
                'Asset', 'Category', 'Milestone', 'TimeLog', 'MeetingLog', 'Holiday'
            ];

            recordsDeleted = await LifecycleRepository.safeDeleteModels(company.id, modelsToClean);

            await LifecycleRepository.updateCompany(company.id, {
                accountStatus: 'deleted',
                metadata: {
                    ...(company.metadata as any || {}),
                    lastCleanupAt: new Date().toISOString()
                }
            });

            await LifecycleRepository.createDeletionLog({
                companyId: company.id,
                companyName: company.name,
                adminEmail: company.adminEmail,
                recordsDeleted: JSON.stringify(recordsDeleted),
                success: true
            });

            console.log(`[Lifecycle] Successfully cleaned up ${company.name}`);

        } catch (err: any) {
            console.error(`[Lifecycle] Cleanup failed for ${company.name}:`, err.message);
            await LifecycleRepository.createDeletionLog({
                companyId: company.id,
                companyName: company.name,
                adminEmail: company.adminEmail,
                success: false,
                error: err.message
            });
        }
    }

    /**
     * Performs a full, permanent deletion of a company and ALL associated data.
     */
    static async performFullDelete(companyId: string) {
        const company = await LifecycleRepository.findCompanyById(companyId);
        if (!company) throw new Error('Company not found');

        console.log(`[Lifecycle] Starting FULL delete for: ${company.name} (${companyId})`);

        await this.performSafeDelete(company);
        await LifecycleRepository.fullDeleteCompany(companyId);

        console.log(`[Lifecycle] Completed FULL delete for: ${company.name}`);
        return true;
    }
}

