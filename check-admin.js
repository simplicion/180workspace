const { PrismaClient } = require('./packages/db/generated/client');
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany({ 
      take: 10
  });
  console.log('Users:', users.map(u => ({ email: u.email, role: u.role, name: u.name })));
  
  // If no super admin, let's create one or update admin@workspace.pitchin180.com
  const existing = await prisma.user.findFirst({ where: { email: 'admin@workspace.pitchin180.com' }});
  if (existing) {
      await prisma.user.update({
          where: { id: existing.id },
          data: { role: 'BMSP_SUPER_ADMIN' }
      });
      console.log('Updated admin@workspace.pitchin180.com to BMSP_SUPER_ADMIN');
  } else {
      // create it? We would need a hashed password. We can just set the role of any existing user.
  }
  
  prisma.$disconnect();
}
run().catch(console.error);
