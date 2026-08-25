import { prisma } from '@workspace/db';

async function run() {
    try {
        const companies = await prisma.company.findMany();
        console.log('Companies:', companies.map((c: any) => c.name));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
run();
