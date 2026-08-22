import { prisma } from './src';

async function main() {
    const userEmail = 'simranmadad123@gmail.com';
    const user = await prisma.user.findFirst({
        where: { email: userEmail },
        include: { company: true }
    });

    if (!user) {
        console.log("User not found!");
        return;
    }

    const companyId = user.companyId;

    console.log(`Found user: ${user.name} (${user.id})`);
    console.log(`Found company: ${user.company?.name} (${companyId})`);

    if (!companyId) return;

    try {
        // Delete audit logs
        await prisma.auditLog.deleteMany({
            where: {
                OR: [
                    { companyId: companyId },
                    { userId: user.id }
                ]
            }
        });
        console.log("Deleted AuditLogs");
        
        // Delete notifications
        await prisma.notification.deleteMany({
            where: { userId: user.id }
        });
        console.log("Deleted Notifications");
        
        // Delete company config
        await prisma.companyConfig.deleteMany({
            where: { companyId }
        });
        console.log("Deleted CompanyConfig");
        
        // Let's just try to delete the company.
        // Prisma will cascade if configured. 
        // If not, we'll see what else blocks it.
        await prisma.company.delete({
            where: { id: companyId }
        });
        console.log(`Deleted company ${companyId} and cascaded records.`);
        
        // User should be deleted if user.companyId cascades. Let's check:
        const checkUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (checkUser) {
            await prisma.user.delete({ where: { id: user.id } });
            console.log("Deleted user manually");
        } else {
            console.log("User cascaded automatically");
        }
    } catch (error) {
        console.error(`Failed to delete:`, error);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
