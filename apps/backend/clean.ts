import { prisma } from '@workspace/db';

async function run() {
    try {
        const companies = await prisma.company.findMany();
        const companiesToDelete = companies.filter((c: any) => c.name.toLowerCase().trim() !== 'saaviksolutions');
        
        if (companiesToDelete.length > 0) {
            const ids = companiesToDelete.map((c: any) => `'${c.id}'`).join(',');
            console.log(`Deleting companies: ${ids}`);
            await prisma.$executeRawUnsafe(`DELETE FROM "Company" WHERE id IN (${ids});`);
            console.log('Successfully deleted companies');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
run();
