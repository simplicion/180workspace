const { prisma } = require('@workspace/db');
async function test() {
    const user = await prisma.user.findFirst({ where: { role: 'employee' }, include: { company: true } });
    console.log('Employee:', user?.email, user?.company?.metadata);
}
test().then(() => process.exit(0)).catch(console.error);
