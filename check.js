const { PrismaClient } = require('./packages/db/generated/client');
const prisma = new PrismaClient();
async function run() {
  const model = prisma._dmmf.datamodel.models.find(m => m.name === 'SuperAdmin');
  console.log(model);
  prisma.$disconnect();
}
run().catch(console.error);
