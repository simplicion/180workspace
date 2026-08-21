import { PlatformCompanyRepository } from '../repositories/platform-company.repository';
import { PlatformSettingsRepository } from '../repositories/platform-settings.repository';

export class PlatformDatabaseService {
    static async listDatabases() {
        const maskedUri = (process.env.DATABASE_URL || '').replace(/:([^:]+):([^@]+)@/, '://$1:****@');
        const systemNode = {
            _id: 'system',
            companyName: 'SYSTEM INFRASTRUCTURE',
            adminEmail: 'PLATFORM_CORE',
            maskedUri: maskedUri || 'DEFAULT_DATABASE_URL',
            databaseConfigured: true,
            subscriptionStatus: 'active',
            isSystem: true
        };

        const companies = await PlatformCompanyRepository.listAll();
        const result = companies.map(c => ({
            _id: c.id,
            companyName: c.name,
            adminEmail: c.adminEmail,
            maskedUri: maskedUri,
            databaseConfigured: c.databaseConfigured,
            subscriptionStatus: c.subscriptionStatus,
        }));
        
        return [systemNode, ...result];
    }

    static async testConnection() {
        return await PlatformSettingsRepository.testDbConnection();
    }
}
