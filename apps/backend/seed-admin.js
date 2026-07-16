const { PrismaClient } = require('c:/Users/saavi/OneDrive/Desktop/180workspace/packages/db/generated/client/index.js');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@180workspace.com';
    const password = 'Password@123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password: hashedPassword,
            role: 'admin',
        },
        create: {
            name: 'Platform Admin',
            email: email,
            password: hashedPassword,
            role: 'admin',
        }
    });

    console.log(`Admin user created: ${user.email} / ${password}`);
    
    const company = await prisma.company.upsert({
        where: { adminEmail: email },
        update: {},
        create: {
            name: '180workspace HQ',
            slug: '180workspace-hq',
            adminEmail: email,
            adminRole: 'admin',
            adminPasswordHash: hashedPassword,
            databaseConfigured: true,
            isOnboardingComplete: true
        }
    });
    console.log(`Default Company created: ${company.name}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
