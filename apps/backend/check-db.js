const { globalPrisma } = require('@workspace/db');

async function checkDb() {
  const companies = await globalPrisma.company.findMany({
    select: { id: true, name: true, slug: true, customDomain: true, subdomain: true, isOnboardingComplete: true }
  });
  console.log('--- Companies ---');
  console.table(companies);

  const users = await globalPrisma.user.findMany({
    select: { id: true, name: true, email: true, companyId: true, isFirstLogin: true }
  });
  console.log('--- Users ---');
  console.table(users);
}

checkDb().catch(console.error).finally(() => globalPrisma.$disconnect());
