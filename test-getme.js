const { PrismaClient } = require('./packages/db/generated/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './apps/backend/.env' });

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) return console.log('No user');
  
  // Create token like backend does
  const secret = process.env.JWT_SECRET || process.env.platform_jwt_secret;
  if (!secret) return console.log('No JWT_SECRET found in backend .env');
  
  const token = jwt.sign({ id: user.id, companyId: user.companyId }, secret, { expiresIn: '1h' });
  
  console.log(`Testing with user ${user.email}`);
  const res = await fetch(`http://localhost:4002/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
main().finally(() => prisma.$disconnect());
