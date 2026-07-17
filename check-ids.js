const { PrismaClient } = require('./packages/db/generated/client');
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany({ 
      where: { email: 'admin@workspace.pitchin180.com' }
  });
  console.log('Admin user companyId:', users[0]?.companyId);

  const settings = await prisma.settings.findFirst();
  console.log('Settings companyId:', settings?.companyId);

  const company = await prisma.company.findFirst();
  console.log('First Company ID:', company?.id);
}

run().catch(console.error).finally(() => prisma.$disconnect());
