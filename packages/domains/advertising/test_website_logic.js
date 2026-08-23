const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const domain = 'prinp7.localhost:3002';
  const slug = 'ioj';
  let resolvedSlug = slug;
  
  const rootDomain = 'localhost'; // from NEXT_PUBLIC_MAIN_DOMAIN
  const isSubdomain = domain.includes(rootDomain) || domain.includes('localhost');
  const subdomainSlug = isSubdomain ? domain.split('.')[0] : null;

  console.log('isSubdomain:', isSubdomain);
  console.log('subdomainSlug:', subdomainSlug);

  let company = await prisma.company.findFirst({
    where: {
      OR: [
        { customDomain: domain },
        { slug: subdomainSlug || '' }
      ]
    }
  });
  console.log('company:', company?.id, company?.slug);

  let website;
  if (resolvedSlug) {
    console.log('Looking for website by slug:', resolvedSlug);
    website = await prisma.website.findFirst({
      where: { companyId: company.id, slug: resolvedSlug, status: 'active' }
    });
    console.log('website by slug:', website?.id, website?.slug);
    
    if (!website) {
      console.log('Website with slug not found, falling back to primary website');
      website = await prisma.website.findFirst({
        where: { companyId: company.id, isPrimary: true, status: 'active' }
      });
      console.log('website fallback:', website?.id, website?.slug);
    }
  }

  if (!website) {
    console.log('Website NOT FOUND!');
    const allWebsites = await prisma.website.findMany({ where: { companyId: company.id } });
    console.log('All websites:', allWebsites.map(w => ({ id: w.id, slug: w.slug, isPrimary: w.isPrimary, status: w.status })));
  } else {
    console.log('Website FOUND!');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
