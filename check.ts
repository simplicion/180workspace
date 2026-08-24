import { PrismaClient } from '@workspace/db';
const prisma = new PrismaClient();
prisma.plan.findFirst({ where: { planName: 'Kickstart' } })
  .then((p: any) => console.log(JSON.stringify(p, null, 2)))
  .catch((e: any) => console.error(e))
  .finally(() => prisma.$disconnect());
