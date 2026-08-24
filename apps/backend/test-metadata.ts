import { prisma } from '@workspace/db';

async function main() {
  const companies = await prisma.company.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1
  });
  const company = companies[0];
  if (!company) return;

  const sub = await prisma.subscription.findFirst({
    where: { companyId: company.id },
    orderBy: { createdAt: 'desc' },
    include: { plan: true }
  });

  console.log("Sub:", JSON.stringify(sub, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
