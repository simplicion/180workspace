import { PrismaClient } from '../../generated/client/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting domain registry migration...');

  // 1. Migrate Companies
  const companies = await prisma.company.findMany({
    where: {
      customDomain: { not: null }
    }
  });

  console.log(`Found ${companies.length} companies with a domain.`);
  
  let companySuccessCount = 0;
  for (const company of companies) {
    if (!company.customDomain) continue;
    
    try {
      await prisma.domainRegistry.upsert({
        where: { domain: company.customDomain },
        update: {
          type: 'COMPANY_PROFILE',
          targetId: company.id,
        },
        create: {
          domain: company.customDomain,
          type: 'COMPANY_PROFILE',
          targetId: company.id,
        },
      });
      companySuccessCount++;
    } catch (err: any) {
      console.error(`Failed to migrate company domain ${company.customDomain}: ${err.message}`);
    }
  }

  // 2. Migrate Websites
  const websites = await prisma.website.findMany({
    where: {
      OR: [
        { slug: { not: '' } },
        { customDomain: { not: null } }
      ]
    }
  });

  console.log(`Found ${websites.length} websites.`);
  
  let websiteSuccessCount = 0;
  for (const website of websites) {
    if (website.slug) {
      try {
        await prisma.domainRegistry.upsert({
          where: { domain: website.slug },
          update: {
            type: 'ADVERTISING_WEBSITE',
            targetId: website.id,
          },
          create: {
            domain: website.slug,
            type: 'ADVERTISING_WEBSITE',
            targetId: website.id,
          },
        });
        websiteSuccessCount++;
      } catch (err: any) {
         console.error(`Failed to migrate website slug ${website.slug}: ${err.message}`);
      }
    }
    
    if (website.customDomain) {
      try {
        await prisma.domainRegistry.upsert({
          where: { domain: website.customDomain },
          update: {
            type: 'ADVERTISING_WEBSITE',
            targetId: website.id,
          },
          create: {
            domain: website.customDomain,
            type: 'ADVERTISING_WEBSITE',
            targetId: website.id,
          },
        });
        websiteSuccessCount++;
      } catch (err: any) {
         console.error(`Failed to migrate website custom domain ${website.customDomain}: ${err.message}`);
      }
    }
  }

  console.log('Migration complete.');
  console.log(`Successfully migrated ${companySuccessCount} company domains.`);
  console.log(`Successfully migrated ${websiteSuccessCount} website domains.`);
}

main()
  .catch((e) => {
    console.error('Fatal Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
