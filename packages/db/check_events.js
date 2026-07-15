const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const events = await prisma.event.findMany();
    console.log(`Total events: ${events.length}`);
    console.log(events);
}

main().catch(console.error).finally(() => prisma.$disconnect());
