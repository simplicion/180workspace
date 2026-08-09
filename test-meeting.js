const jwt = require('jsonwebtoken');
const { PrismaClient } = require('./node_modules/@prisma/client');

async function test() {
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst();
  if (!user) return console.log('No user found');
  
  const token = jwt.sign({ id: user.id }, '195ee7cdf2272463be82f5d065eaf1dc52992c6d5c05241e7cde005eb2cbc71b', { expiresIn: '30d' });
  
  const res = await fetch('http://localhost:4002/api/meeting', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ title: 'Test Meeting' })
  });
  
  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Response:', data);
  
  await prisma.$disconnect();
}
test().catch(console.error);
