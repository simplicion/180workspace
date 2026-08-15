import { PrismaClient } from '../generated/client/index.js';

const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany();
  for (const company of companies) {
    const metadata = (company.metadata as any) || {};
    const modules = metadata.enabledModules || [];
    const toAdd = ['bills-and-expenses', 'vendors', 'invoices', 'salary'];
    let changed = false;
    for (const mod of toAdd) {
      if (!modules.includes(mod)) {
        modules.push(mod);
        changed = true;
      }
    }
    if (changed) {
      metadata.enabledModules = modules;
      await prisma.company.update({
        where: { id: company.id },
        data: { metadata }
      });
      console.log(`Updated company ${company.id} with new modules in metadata`);
    }
  }
  console.log('Done');
}

main().catch(console.error).finally(() => prisma.$disconnect());
