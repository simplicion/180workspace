const { PrismaClient } = require('./generated/client');
const prisma = new PrismaClient();

async function main() {
    const companies = await prisma.company.findMany();
    console.log(JSON.stringify(companies.map(c => ({ id: c.id, metadata: c.metadata })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
