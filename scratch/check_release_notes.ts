import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const notes = await prisma.releaseNote.findMany({
        orderBy: [{ version: 'desc' }, { createdAt: 'desc' }]
    });
    console.log('Found release notes:', notes.length);
    console.log(JSON.stringify(notes, null, 2));
    await prisma.$disconnect();
}

main().catch(console.error);
