const { PrismaClient } = require('@workspace/db');
const prisma = new PrismaClient();

async function benchmark() {
  const company = await prisma.company.findFirst();
  if (!company) return console.log('No company found');
  const companyId = company.id;
  
  console.log('Company:', companyId);
  console.time('Total time');

  console.time('getActiveSubscription');
  let sub = await prisma.subscription.findFirst({
      where: {
          companyId,
          status: { in: ['trial', 'active', 'ACTIVE', 'past_due'] },
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' }
  });
  console.timeEnd('getActiveSubscription');

  console.time('plan fetch');
  let plan = sub?.planId 
      ? await prisma.plan.findUnique({ where: { id: sub.planId } }) 
      : null;
  console.timeEnd('plan fetch');

  console.time('companyConfig');
  const companyConfig = await prisma.companyConfig.findUnique({ where: { companyId } });
  console.timeEnd('companyConfig');

  console.time('teamMembersCount');
  const teamMembersCount = await prisma.user.count({ where: { companyId } });
  console.timeEnd('teamMembersCount');

  console.time('activeWebsitesCount');
  const activeWebsitesCount = await prisma.website.count({ where: { companyId } });
  console.timeEnd('activeWebsitesCount');

  console.time('storageAgg');
  const storageAgg = await prisma.document.aggregate({
      where: { companyId },
      _sum: { fileSize: true }
  });
  console.timeEnd('storageAgg');
  
  console.timeEnd('Total time');
}

benchmark().catch(console.error).finally(() => prisma.$disconnect());
