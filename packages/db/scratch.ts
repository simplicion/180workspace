import { PrismaClient } from '@workspace/db';
const prisma = new PrismaClient();
async function main() {
    const subs = await prisma.subscription.findMany({ include: { company: true, plan: true } });
    console.log(subs.map(s => ({
        company: s.company?.name,
        plan: s.plan?.planName,
        status: s.status,
        end: s.currentPeriodEnd
    })));
}
main().finally(() => prisma.$disconnect());
