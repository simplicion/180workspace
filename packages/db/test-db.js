const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Connecting...');
    const company = await prisma.company.findFirst({ where: { slug: 'prince' }});
    console.log('Company:', company ? company.name : 'Not Found');
    
    if (company) {
        const websites = await prisma.website.findMany({ where: { companyId: company.id }});
        console.log('Websites:', websites.map(w => ({ id: w.id, slug: w.slug, name: w.name, status: w.status })));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
