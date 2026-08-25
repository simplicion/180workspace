import { prisma } from '../index';

async function main() {
    const validCompanyId = 'cd8bc9d7-86f7-4bbf-a83d-3df7dd42125f';
    const deleted = await prisma.calendarEvent.deleteMany({
        where: {
            companyId: {
                not: null,
                notIn: [validCompanyId]
            }
        }
    });
    console.log(`Deleted ${deleted.count} orphaned calendar events.`);

    const deletedTasks = await prisma.task.deleteMany({
        where: {
            companyId: {
                not: null,
                notIn: [validCompanyId]
            }
        }
    });
    console.log(`Deleted ${deletedTasks.count} orphaned tasks.`);
    
    const deletedModules = await prisma.module.deleteMany({
        where: {
            project: {
                companyId: {
                    not: validCompanyId
                }
            }
        }
    });
    console.log(`Deleted ${deletedModules.count} orphaned modules.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
