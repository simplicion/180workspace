const { PrismaClient } = require('./packages/db/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const companies = await prisma.company.findMany({ select: { id: true, name: true, slug: true } });
  console.table(companies);
  
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, companyId: true } });
  console.table(users);
}
main().catch(console.error).finally(() => prisma.$disconnect());
