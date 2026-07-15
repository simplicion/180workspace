const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const jobs = await prisma.job.findMany({
    select: { id: true, title: true, status: true, type: true }
  });
  console.log('Total jobs:', jobs.length);
  console.log('Sample jobs:', jobs.slice(0, 5));
  process.exit(0);
}
check();
