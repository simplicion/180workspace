require('dotenv').config({ path: '../../.env' });
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query('SELECT id, name, slug, "isOnboardingComplete" FROM "Company"');
  console.table(res.rows);
  
  const resUsers = await client.query('SELECT id, name, email, "companyId", "isFirstLogin" FROM "User"');
  console.table(resUsers.rows);
  await client.end();
}
main().catch(console.error);
