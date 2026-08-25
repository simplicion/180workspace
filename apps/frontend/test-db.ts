import { prisma } from '@workspace/db';

async function main() {
  try {
    console.log('Testing DB connection from frontend...');
    const result = await prisma.company.findFirst();
    console.log('Result found:', !!result);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
