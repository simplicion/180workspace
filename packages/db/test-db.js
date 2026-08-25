const { Client } = require('pg');
const client = new Client({ 
  connectionString: 'postgresql://pitchin_admin:Pitchin180Admin!23@pitchin-db.csne8mek4dog.us-east-1.rds.amazonaws.com:5432/180workspace_db',
  ssl: { rejectUnauthorized: false }
});
client.connect().then(() => client.query('SELECT datname FROM pg_database WHERE datistemplate = false;')).then(res => { console.log(res.rows); client.end(); }).catch(console.error);
