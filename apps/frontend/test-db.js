const { prisma } = require('@workspace/db');

async function main() {
  console.log("Starting DB query...");
  const company = await prisma.company.findFirst();
  console.log("Result:", company);
}

main().catch(console.error).finally(() => process.exit(0));
