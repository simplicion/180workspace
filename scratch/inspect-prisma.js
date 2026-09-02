const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectModels() {
    console.log('Inspecting Prisma client models:');
    const keys = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));
    console.log('Available models count:', keys.length);
    console.log('Models containing "form" or "Form":', keys.filter(k => k.toLowerCase().includes('form')));
    console.log('All model keys:', keys.sort());
    await prisma.$disconnect();
}

inspectModels().catch(console.error);
