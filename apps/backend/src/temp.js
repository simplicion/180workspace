const prisma = require('../../../packages/db/prisma');

async function main() {
  const companies = await prisma.company.findMany();
  for (const company of companies) {
    const modules = company.enabledModules || [];
    const toAdd = ['bills-and-expenses', 'vendors', 'invoices', 'salary'];
    let changed = false;
    for (const mod of toAdd) {
      if (!modules.includes(mod)) {
        modules.push(mod);
        changed = true;
      }
    }
    if (changed) {
      await prisma.company.update({
        where: { id: company.id },
        data: { enabledModules: modules }
      });
      console.log(`Updated company ${company.id} with new modules`);
    }
  }
  console.log('Done');
}

main().catch(console.error).finally(() => prisma.$disconnect());
