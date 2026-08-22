import { PrismaClient } from '../generated/client';
const prisma = new PrismaClient();

async function main() {
    const plans = await prisma.plan.findMany({
        where: {
            planName: { contains: 'Kickstart' },
        }
    });
    
    for (const plan of plans) {
        if (plan.price === 10) {
            console.log(`Updating ${plan.planName} (ID: ${plan.id}) price from 10 to 0`);
            await prisma.plan.update({
                where: { id: plan.id },
                data: { price: 0 }
            });
        }
    }
    
    console.log("Finished updating Kickstart plans to $0.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
