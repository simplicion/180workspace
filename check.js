const { PrismaClient } = require('./packages/db/dist/index.js');
const prisma = new PrismaClient();

async function run() {
  const plans = await prisma.plan.findMany();
  console.log("Plans: ", JSON.stringify(plans, null, 2));
  
  const comp = await prisma.company.findFirst({ orderBy: { createdAt: 'desc' } });
  console.log("Latest Company enabledApps: ", comp?.metadata?.enabledApps);
  
  prisma.$disconnect();
}
run();
