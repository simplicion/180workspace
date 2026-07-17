const { PrismaClient } = require('./packages/db/generated/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function run() {
  const passwordHash = await bcrypt.hash('PrincePassword123!', 10);
  const admin = await prisma.superAdmin.upsert({
    where: { email: 'admin@workspace.pitchin180.com' },
    update: {
      passwordHash,
    },
    create: {
      email: 'admin@workspace.pitchin180.com',
      passwordHash,
      name: 'Prince Super Admin'
    }
  });
  console.log('Created super admin:', admin);
  prisma.$disconnect();
}
run().catch(console.error);
