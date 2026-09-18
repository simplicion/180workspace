const { Client } = require('pg');
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set in the environment — no hardcoded fallback is used.');
}
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
client.connect().then(() => client.query('SELECT datname FROM pg_database WHERE datistemplate = false;')).then(res => { console.log(res.rows); client.end(); }).catch(console.error);
