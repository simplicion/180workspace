const { PrismaClient } = require('./packages/db/generated/client');
const prisma = new PrismaClient();

async function run() {
  const company = await prisma.company.findUnique({ 
      where: { id: '84f637af-c357-4161-8ea3-923e32544e69' }
  });
  console.log('Company:', company);
}

run().catch(console.error).finally(() => prisma.$disconnect());
