import * as dotenv from 'dotenv';
import { prisma } from '@workspace/db';

dotenv.config();

const seed = async () => {
    try {
        console.log('🌱 Starting system seeding...');
        const settings = await prisma.platformSettings.findFirst();
        if (!settings) {
            await prisma.platformSettings.create({
                data: {
                    platformName: '180workspace Platform',
                    themeColor: '#4f46e5',
                    smtpFrom: 'noreply@ims-platform.com'
                }
            });
            console.log('✅ Default platform settings created');
        } else {
            console.log('ℹ️ Settings already exist, skipping...');
        }
        console.log('\n✨ Seeding completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
};

seed();
