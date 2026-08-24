const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.coupon.findMany().then(console.log).finally(() => p.$disconnect());
