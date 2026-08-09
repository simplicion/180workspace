const jwt = require('jsonwebtoken');
const { basePrisma } = require('@workspace/db');
require('dotenv').config();

async function run() {
  const user = await basePrisma.user.findFirst({ where: { companyId: { not: null } } });
  if (!user) return console.log('no user');
  const token = jwt.sign({ id: user.id, companyId: user.companyId }, process.env.JWT_SECRET || '195ee7cdf2272463be82f5d065eaf1dc52992c6d5c05241e7cde005eb2cbc71b');
  const r = await fetch('http://localhost:4001/api/meeting', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({title: 'test'})
  });
  console.log(await r.json());
}
run();
