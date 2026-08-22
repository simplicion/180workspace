import { PrismaClient } from './generated/client/index.js';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding coupon code FREE100...');

    const existingCoupon = await prisma.coupon.findUnique({
        where: { couponCode: 'FREE100' }
    });

    if (!existingCoupon) {
        await prisma.coupon.create({
            data: {
                couponCode: 'FREE100',
                discountType: 'percentage',
                discountValue: 100, // 100% discount
                maxUses: null, // Unlimited uses
                isActive: true
            }
        });
        console.log('Successfully created FREE100 coupon.');
    } else {
        console.log('FREE100 coupon already exists.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
