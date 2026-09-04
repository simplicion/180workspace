const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const bcrypt = require('bcryptjs');

async function main() {
  const hash = await bcrypt.hash('36413333', 12);
  const updated = await prisma.superAdmin.upsert({
    where: { email: 'simplicion.com@gmail.com' },
    update: { passwordHash: hash },
    create: {
      name: 'Simplicion Admin',
      email: 'simplicion.com@gmail.com',
      passwordHash: hash,
      role: 'superadmin'
    }
  });
  console.log('Updated simplicion.com@gmail.com:', updated.email);

  const defaultAdmin = await prisma.superAdmin.upsert({
    where: { email: 'admin@180workspace.com' },
    update: { passwordHash: hash },
    create: {
      name: 'Super Admin',
      email: 'admin@180workspace.com',
      passwordHash: hash,
      role: 'superadmin'
    }
  });
  console.log('Upserted admin@180workspace.com:', defaultAdmin.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
