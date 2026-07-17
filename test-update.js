const { PrismaClient } = require('./packages/db/generated/client');
const prisma = new PrismaClient();

async function run() {
    const companyId = '84f637af-c357-4161-8ea3-923e32544e69';
    const updateData = { smtpHost: 'smtp.gmail.com', smtpPort: 587 };
    
    const company = await prisma.company.findUnique({
        where: { id: companyId }
    });
    let currentMeta = company?.metadata || {};
    if (typeof currentMeta === 'string') {
        try { currentMeta = JSON.parse(currentMeta); } catch (e) { currentMeta = {}; }
    }
    
    console.log('Before update:', currentMeta);

    const updated = await prisma.company.update({
        where: { id: companyId },
        data: {
            metadata: {
                ...currentMeta,
                ...updateData
            }
        }
    });

    console.log('After update:', updated.metadata);
}

run().catch(console.error).finally(() => prisma.$disconnect());
