const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const res = await prisma.emailLog.groupBy({ by: ['status'], _count: { _all: true } });
    console.log("Status Stats:", res);

    const res2 = await prisma.emailLog.groupBy({ by: ['templateName', 'status'], _count: { _all: true } });
    console.log("Template Stats:", res2);

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
