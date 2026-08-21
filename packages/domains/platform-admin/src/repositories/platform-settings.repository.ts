import { prisma } from '@workspace/db';

export class PlatformSettingsRepository {
    static async getPlatformSettingsInstance() {
        let settings = await prisma.platformSettings.findFirst();
        if (!settings) {
            settings = await prisma.platformSettings.create({
                data: {
                    platformName: '180workspace',
                    maintenanceMode: false,
                    maintenanceMessage: 'System is under maintenance. Please try again shortly.',
                    maxFreeUsers: 5,
                    supportEmail: 'support@ims.system',
                    currency: 'INR'
                }
            });
        }
        return settings;
    }

    static async updateSettings(id: string, data: any) {
        return await prisma.platformSettings.update({
            where: { id },
            data
        });
    }

    static async testDbConnection() {
        await prisma.$queryRaw`SELECT 1`;
        return true;
    }
}
