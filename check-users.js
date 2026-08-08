const { PrismaClient } = require('./packages/db/generated/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ where: { companyId: null } });
  console.log('Users without company:', users.length, users.map(x=>x.email));
}
main().finally(() => prisma.$disconnect());
