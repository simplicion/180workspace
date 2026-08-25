import { prisma } from './src/index';

async function main() {
  try {
    console.log('Connecting to database...');
    const result = await prisma.company.findFirst();
    console.log('Result:', result);
  } catch (error) {
    console.error('Database connection error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
