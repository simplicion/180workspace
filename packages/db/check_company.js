const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const c = await prisma.company.findFirst({
        where: { name: { contains: 'SaaVik' } },
        select: { logoUrl: true, bannerUrl: true, id: true, name: true }
    });
    console.log(JSON.stringify(c, null, 2));
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
check();
