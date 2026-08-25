import { prisma } from './src';

async function main() {
  const coupons = await prisma.coupon.findMany();
  console.log('Coupons:', coupons);
  const plans = await prisma.plan.findMany();
  console.log('Plans:', plans);
  
  // also check processed webhooks and subscriptions
  const subs = await prisma.subscription.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('Recent Subscriptions:', subs);
  
  const webhooks = await prisma.processedWebhook.findMany({
    orderBy: { processedAt: 'desc' },
    take: 5
  });
  console.log('Recent Webhooks:', webhooks);
}

main().catch(console.error).finally(() => prisma.$disconnect());
