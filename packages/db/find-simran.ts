import { prisma } from './src';

async function main() {
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { name: { contains: 'simran', mode: 'insensitive' } },
                { email: { contains: 'simran', mode: 'insensitive' } }
            ]
        },
        include: {
            company: true
        }
    });

    console.log(JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
