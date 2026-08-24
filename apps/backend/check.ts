import { PrismaClient } from '@workspace/db';

const prisma = new PrismaClient();

async function run() {
  const comp = await prisma.company.findFirst({ orderBy: { createdAt: 'desc' }, include: { subscriptions: true } });
  console.log("Latest Company: ", comp?.name);
  console.log("Enabled Apps: ", (comp?.metadata as any)?.enabledApps);
  console.log("Enabled Modules: ", (comp?.metadata as any)?.enabledModules);
  console.log("Subscription status: ", comp?.subscriptionStatus);
  console.log("Subscriptions: ", JSON.stringify(comp?.subscriptions, null, 2));

  if (comp?.subscriptions && comp.subscriptions.length > 0) {
    const plan = await prisma.plan.findUnique({ where: { id: comp.subscriptions[0].planId } });
    console.log("Plan: ", JSON.stringify(plan, null, 2));
  }
  
  prisma.$disconnect();
}
run();
