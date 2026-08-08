const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDb() {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, slug: true, customDomain: true, subdomain: true, isOnboardingComplete: true }
  });
  console.log('--- Companies ---');
  console.table(companies);

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, companyId: true, isFirstLogin: true }
  });
  console.log('--- Users ---');
  console.table(users);
}

checkDb().catch(console.error).finally(() => prisma.$disconnect());
