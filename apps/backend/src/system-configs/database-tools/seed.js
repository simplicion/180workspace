'use strict';

require('dotenv').config();
const { prisma } = require('@workspace/db');

const seed = async () => {
    try {
        console.log('ðŸŒ± Starting system seeding...');
        const settings = await prisma.platformSettings.findFirst();
        if (!settings) {
            await prisma.platformSettings.create({
                data: {
                    platformName: 'IMS Platform',
                    themeColor: '#4f46e5',
                    smtpFrom: 'noreply@ims-platform.com'
                }
            });
            console.log('âœ… Default platform settings created');
        } else {
            console.log('â„¹ï¸ Settings already exist, skipping...');
        }
        console.log('\nâœ¨ Seeding completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('âŒ Seeding failed:', err);
        process.exit(1);
    }
};

seed();
