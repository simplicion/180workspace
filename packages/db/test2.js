const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const company = await prisma.company.findFirst();
    const companyId = company.id;

    console.log("Original Metadata:", company.metadata);

    // Simulated updateSettings
    let currentMeta = company.metadata || {};
    if (typeof currentMeta === 'string') {
        try { currentMeta = JSON.parse(currentMeta); } catch (e) { currentMeta = {}; }
    }

    const updateData = {
        googleDriveServiceAccount: '{"type":"service_account","project_id":"test"}',
        storageMode: 'google_drive'
    };

    const updated = await prisma.company.update({
        where: { id: companyId },
        data: {
            metadata: {
                ...currentMeta,
                ...updateData
            }
        }
    });

    console.log("Updated Metadata:", updated.metadata);

    // Simulated getSettings
    const fetched = await prisma.company.findUnique({ where: { id: companyId }});
    let fetchedMeta = fetched.metadata || {};
    if (typeof fetchedMeta === 'string') {
        try { fetchedMeta = JSON.parse(fetchedMeta); } catch (e) { fetchedMeta = {}; }
    }
    
    console.log("Fetched Metadata googleDriveServiceAccount:", fetchedMeta.googleDriveServiceAccount);
}
main().catch(console.error).finally(() => prisma.$disconnect());
