const { PrismaClient } = require('./packages/db/generated/client');
const prisma = new PrismaClient();

async function run() {
  const companyId = '5a9c31a9-119e-41e5-88e9-9c05ce7a1c9f';
  // Try to find the company directly, but maybe we just get all companies and enable for all
  const companies = await prisma.company.findMany();
  
  for (const company of companies) {
    let metadata = company.metadata || {};
    if (typeof metadata === 'string') {
       try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
    }
    
    if (!metadata.enabledApps) metadata.enabledApps = [];
    if (!metadata.enabledApps.includes('tools')) {
        metadata.enabledApps.push('tools');
    }
    if (!metadata.enabledApps.includes('ai')) { // Just in case there is an 'ai' app
        metadata.enabledApps.push('ai');
    }
    
    await prisma.company.update({
      where: { id: company.id },
      data: { metadata } 
    });
    console.log(`Enabled tools for company ${company.id}`);
  }
  
  prisma.$disconnect();
}
run().catch(console.error);
