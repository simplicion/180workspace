const { PrismaClient } = require('./packages/db/generated/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function run() {
  const passwordHash = await bcrypt.hash('PrincePassword123!', 10);
  
  // Create or find company
  const company = await prisma.company.upsert({
    where: { adminEmail: 'admin@workspace.pitchin180.com' },
    update: {
      adminPasswordHash: passwordHash
    },
    create: {
      name: 'PitchIn180',
      adminEmail: 'admin@workspace.pitchin180.com',
      adminName: 'Prince Admin',
      adminPasswordHash: passwordHash
    }
  });

  // Create or find user
  const user = await prisma.user.upsert({
    where: { email: 'admin@workspace.pitchin180.com' },
    update: {
      password: passwordHash,
      role: 'admin',
      companyId: company.id
    },
    create: {
      email: 'admin@workspace.pitchin180.com',
      password: passwordHash,
      name: 'Prince Admin',
      role: 'admin',
      companyId: company.id
    }
  });

  console.log('Created regular admin:', user.email);
  prisma.$disconnect();
}
run().catch(console.error);
