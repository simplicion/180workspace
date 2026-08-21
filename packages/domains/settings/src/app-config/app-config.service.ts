import { prisma } from '@workspace/db';

export class AppConfigService {
    static async getAppConfig() {
        let settings = await prisma.platformSettings.findFirst();
        if (!settings) {
            settings = await prisma.platformSettings.create({
                data: {
                    platformName: '180workspace',
                    maintenanceMode: false,
                }
            });
        }
        return settings;
    }

    static async updateAppConfig(config: any) {
        let settings = await prisma.platformSettings.findFirst();
        if (settings) {
            return await prisma.platformSettings.update({
                where: { id: settings.id },
                data: config
            });
        }
        return await prisma.platformSettings.create({ data: config });
    }
}
