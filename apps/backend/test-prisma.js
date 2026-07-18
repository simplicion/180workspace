const { prisma } = require('@workspace/db');

async function testDb() {
    try {
        console.log("Connecting to Prisma...");
        const company = await prisma.company.findFirst();
        console.log("Connected successfully! Found company:", company?.id);
    } catch (e) {
        console.error("Prisma Error:", e);
    }
}

testDb();
