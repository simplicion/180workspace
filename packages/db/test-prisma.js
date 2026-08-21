const { prisma } = require('./src/index.js');

async function main() {
    try {
        console.log("Testing EmailLog.groupBy...");
        const companyId = undefined; // Try undefined, which is what it might be if req.user.companyId is missing
        
        const statusGroups = await prisma.emailLog.groupBy({
            by: ['status'],
            where: { companyId }, // explicitly pass { companyId: undefined }
            _count: { _all: true }
        });
        console.log("Status Groups:", statusGroups);

        const templateGroups = await prisma.emailLog.groupBy({
            by: ['templateName', 'status'],
            _count: { _all: true }
        });
        console.log("Template Groups:", templateGroups);

        const dateLimit = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentLogs = await prisma.emailLog.findMany({
            where: { createdAt: { gte: dateLimit } },
            select: { createdAt: true }
        });
        console.log("Recent Logs Count:", recentLogs.length);
        
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
