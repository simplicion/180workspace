import { developersPrisma } from '../src';

async function verifyTablesAndRecords() {
  try {
    const tables: any = await developersPrisma.$queryRawUnsafe(`
      SELECT 
        table_name AS "Table Name",
        pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) AS "Total Size"
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('\n========================================================================');
    console.log('   TABLES IN AWS RDS "180developers_db":');
    console.log('========================================================================\n');
    console.table(tables);

    const apps = await developersPrisma.oAuthApp.findMany({
      select: {
        id: true,
        name: true,
        clientId: true,
        clientSecretHint: true,
        allowedScopes: true,
        redirectUris: true
      }
    });

    console.log('\n========================================================================');
    console.log('   SEEDED FIRST-PARTY OAUTH APPLICATIONS:');
    console.log('========================================================================\n');
    console.table(apps);

  } catch (err) {
    console.error('Error verifying tables:', err);
  } finally {
    await developersPrisma.$disconnect();
  }
}

verifyTablesAndRecords();
