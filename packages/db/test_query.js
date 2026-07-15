const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const jobs = await prisma.job.findMany({
        where: { status: 'open' },
        include: {
            company: {
                select: {
                    name: true,
                    logoUrl: true,
                    industry: true,
                    headquarters: true,
                    country: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
    console.log('Success!', jobs.length, 'jobs found.');
    console.log(JSON.stringify(jobs, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}
check();
