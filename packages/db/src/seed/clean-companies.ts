import { prisma } from '../index';

async function main() {
    const validCompanyId = 'cd8bc9d7-86f7-4bbf-a83d-3df7dd42125f';

    console.log("Deleting user princegupta3641@gmail.com...");
    try {
        await prisma.user.deleteMany({
            where: { email: 'princegupta3641@gmail.com' }
        });
    } catch(e) {
        console.error("Could not delete user via prisma, might have foreign keys");
    }

    // Find all tables that have a companyId column
    const tablesWithCompanyId: any[] = await prisma.$queryRaw`
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'companyId' AND table_schema = 'public';
    `;

    console.log(`Found ${tablesWithCompanyId.length} tables with companyId column.`);

    let tablesToDelete = tablesWithCompanyId.map(t => t.table_name).filter(t => t !== 'Company');
    let madeProgress = true;
    let iterations = 0;

    while (tablesToDelete.length > 0 && madeProgress && iterations < 10) {
        madeProgress = false;
        iterations++;
        const nextFailed = [];

        for (const tableName of tablesToDelete) {
            try {
                await prisma.$executeRawUnsafe(`DELETE FROM "${tableName}" WHERE "companyId" != $1 OR "companyId" IS NULL`, validCompanyId);
                console.log(`Successfully deleted orphaned data from ${tableName}`);
                madeProgress = true;
            } catch (e: any) {
                // If it fails due to foreign key constraint, we'll try again next loop
                nextFailed.push(tableName);
            }
        }
        tablesToDelete = nextFailed;
    }

    if (tablesToDelete.length > 0) {
        console.error("Could not delete data from some tables due to foreign keys:", tablesToDelete);
    }

    // Now try to delete the companies again
    try {
        await prisma.$executeRawUnsafe(`DELETE FROM "Company" WHERE "id" != $1`, validCompanyId);
        console.log(`Successfully deleted other companies.`);
    } catch (e: any) {
        console.error(`Error deleting companies: ${e.message}`);
    }

    console.log("Finished cleanup.");
}

main().catch(e => {
    console.error(e);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});

main().catch(e => {
    console.error(e);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});
