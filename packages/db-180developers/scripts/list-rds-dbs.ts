import { developersPrisma } from '../src';

async function listAllDatabases() {
  try {
    const result: any = await developersPrisma.$queryRawUnsafe(`
      SELECT 
        datname AS "Database Name",
        pg_size_pretty(pg_database_size(datname)) AS "Size",
        CASE 
          WHEN datname = '180developers_db' THEN 'Active (180developers & Identity)'
          WHEN datname = '180workspace_db' THEN 'Active (180workspace)'
          WHEN datname = 'helomi_db' THEN 'Active (Helomi)'
          WHEN datname = 'lokaya_db' THEN 'Active (Lokaya)'
          WHEN datname = 'postgres' THEN 'System DB'
          WHEN datname = 'rdsadmin' THEN 'AWS System DB'
          ELSE 'Active'
        END AS "Status"
      FROM pg_database
      WHERE datistemplate = false
      ORDER BY pg_database_size(datname) DESC;
    `);

    console.log('\n========================================================================');
    console.log('   AWS RDS INSTANCE (pitchin-db.csne8mek4dog.us-east-1.rds.amazonaws.com)');
    console.log('========================================================================\n');
    console.table(result);
    console.log('========================================================================\n');
  } catch (err) {
    console.error('Error querying pg_database:', err);
  } finally {
    await developersPrisma.$disconnect();
  }
}

listAllDatabases();
