const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const companies = await prisma.company.findMany();
        console.log('Companies:', companies.map(c => c.name));
        const users = await prisma.user.findMany({ where: { email: 'princegupta3641@gmail.com' } });
        console.log('Users:', users.map(u => u.email));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
run();
