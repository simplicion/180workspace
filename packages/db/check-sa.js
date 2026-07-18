const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const admins = await prisma.superAdmin.findMany();
  console.log(admins);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
