const { PrismaClient } = require('./packages/db/generated/client');
const prisma = new PrismaClient();
async function main() {
  const c = await prisma.company.findMany({ where: { slug: null } });
  console.log('Companies without slug:', c.length, c.map(x=>x.name));
}
main().finally(() => prisma.$disconnect());
