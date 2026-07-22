const { prisma } = require('@workspace/db');

async function run() {
  const c = await prisma.company.findFirst();
  if (!c) return console.log("No company");
  console.log("Before meta:", c.metadata);
  
  let metadata = c.metadata || {};
  if (typeof metadata === 'string') {
      try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
  }
  
  const updated = await prisma.company.update({
      where: { id: c.id },
      data: {
          metadata: { ...metadata, testField: "hello_world_123" }
      }
  });
  console.log("Updated meta:", updated.metadata);
  
  const fetched = await prisma.company.findUnique({ where: { id: c.id } });
  console.log("Fetched meta:", fetched.metadata);
}
run().then(() => process.exit(0));
