const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const companies = await prisma.company.findMany({ select: { id: true, name: true, enabledModules: true } });
  
  for (const c of companies) {
    if (c.enabledModules && Array.isArray(c.enabledModules)) {
      if (!c.enabledModules.includes('bills-and-expenses')) {
        c.enabledModules.push('bills-and-expenses');
      }
      if (!c.enabledModules.includes('vendors')) {
        c.enabledModules.push('vendors');
      }
      await prisma.company.update({
        where: { id: c.id },
        data: { enabledModules: c.enabledModules }
      });
    }
  }
  console.log('Updated modules successfully');
  await prisma.$disconnect();
}
run();
