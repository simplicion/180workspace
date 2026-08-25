import { prisma, basePrisma } from '@workspace/db';
import { eventBus } from '@workspace/backend-infra';

export class WebsitesService {
  static async getWebsites() {
    const websites = await prisma.website.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return { websites };
  }

  static async checkAvailability(slug?: string, customDomain?: string) {
    if (slug) {
      const existing = await basePrisma.domainRegistry.findFirst({ where: { domain: slug } });
      if (existing) {
        return { available: false, reason: 'This subdomain is already in use by a company profile or website.' };
      }
    }

    if (customDomain) {
      const existing = await basePrisma.domainRegistry.findFirst({ where: { domain: customDomain } });
      if (existing) {
        return { available: false, reason: 'This custom domain is already taken.' };
      }
    }

    return { available: true };
  }

  static async createWebsite(userId: string, data: any) {
    const { name, slug, template, config, customDomain } = data;

    const existing = await basePrisma.domainRegistry.findFirst({ where: { domain: slug } });
    if (existing) {
      throw new Error('This subdomain is already in use by a company profile or website.');
    }

    if (customDomain) {
      const existingDomain = await basePrisma.domainRegistry.findFirst({ where: { domain: customDomain } });
      if (existingDomain) {
        throw new Error('This custom domain is already taken.');
      }
    }

    const initialConfig = {
      brand: { primaryColor: '#4f46e5', font: 'inter' },
      sections: [
        { id: 'sec-' + Date.now() + '-1', type: 'hero', data: { title: name, subtitle: 'Welcome to our business.', buttonText: 'Contact Us' } },
        { id: 'sec-' + Date.now() + '-2', type: 'services', data: { items: [{ title: 'Our Core Service', description: 'Description of what we do best.' }] } },
        { id: 'sec-' + Date.now() + '-3', type: 'about', data: { content: 'We are a dedicated team providing top-notch services.' } },
        { id: 'sec-' + Date.now() + '-4', type: 'contact', data: { email: 'hello@example.com', phone: '1-800-000-0000' } }
      ]
    };

    const website = await prisma.website.create({
      data: {
        name,
        slug,
        customDomain: customDomain || null,
        template: template || 'default',
        config: config || initialConfig,
        owner: userId,
        status: 'active'
      }
    });

    // Add to DomainRegistry
    await basePrisma.domainRegistry.create({
      data: {
        domain: slug,
        type: 'ADVERTISING_WEBSITE',
        targetId: website.id,
        // companyId is omitted unless we have it in context, but Website owner could be mapped later
      }
    });
    
    if (customDomain) {
        await basePrisma.domainRegistry.create({
            data: {
                domain: customDomain,
                type: 'ADVERTISING_WEBSITE',
                targetId: website.id
            }
        });
    }

    return website;
  }

  static async getWebsite(id: string) {
    const website = await prisma.website.findUnique({
      where: { id }
    });
    if (!website) {
      throw new Error('Website not found');
    }

    try {
      const company = await prisma.company.findFirst();
      if (company) {
        (website as any).company = company;
      }
    } catch (e) {}

    return website;
  }

  static async updateWebsite(id: string, data: any) {
    const { name, slug, template, config, status, customDomain } = data;

    const currentWebsite = await prisma.website.findUnique({ where: { id } });
    if (!currentWebsite) {
      throw new Error('Website not found');
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (template !== undefined) updateData.template = template;
    if (config !== undefined) updateData.config = config;
    if (status !== undefined) updateData.status = status;
    
    if (customDomain !== undefined) {
      if (customDomain) {
        const existing = await basePrisma.domainRegistry.findFirst({ where: { domain: customDomain } });
        if (existing && (existing.type !== 'ADVERTISING_WEBSITE' || existing.targetId !== id)) {
           throw new Error('Custom domain already taken');
        }
      }
      updateData.customDomain = customDomain || null;
    }

    const website = await prisma.website.update({
      where: { id },
      data: updateData
    });

    if (customDomain !== undefined) {
       // Check if there was an old custom domain and remove it
       if (currentWebsite.customDomain && currentWebsite.customDomain !== customDomain) {
           await basePrisma.domainRegistry.deleteMany({
               where: { domain: currentWebsite.customDomain, type: 'ADVERTISING_WEBSITE', targetId: id }
           });
       }
       // Add new custom domain
       if (customDomain && customDomain !== currentWebsite.customDomain) {
           await basePrisma.domainRegistry.create({
               data: {
                   domain: customDomain,
                   type: 'ADVERTISING_WEBSITE',
                   targetId: id
               }
           });
       }
    }

    return website;
  }

  static async deleteWebsite(id: string) {
    const currentWebsite = await prisma.website.findUnique({ where: { id } });
    if (!currentWebsite) {
      throw new Error('Website not found');
    }

    await prisma.website.delete({ where: { id } });

    // Clean up domain registry
    await basePrisma.domainRegistry.deleteMany({
      where: { type: 'ADVERTISING_WEBSITE', targetId: id }
    });

    return true;
  }

  static async getWebsiteLeads(websiteId: string) {
    const currentWebsite = await prisma.website.findUnique({ where: { id: websiteId } });
    if (!currentWebsite) {
      throw new Error('Website not found');
    }

    const leads = await prisma.websiteFormSubmission.findMany({
      where: { websiteId },
      orderBy: { createdAt: 'desc' }
    });

    return leads;
  }

  static async getWebsitePixels(websiteId: string) {
    const currentWebsite = await prisma.website.findUnique({ where: { id: websiteId } });
    if (!currentWebsite) {
      throw new Error('Website not found');
    }

    const pixels = await prisma.pixel.findMany({ where: { websiteId } });
    return pixels;
  }

  static async createWebsitePixel(websiteId: string, data: any) {
    const currentWebsite = await prisma.website.findUnique({ where: { id: websiteId } });
    if (!currentWebsite) {
      throw new Error('Website not found');
    }

    const pixel = await prisma.pixel.create({
      data: {
        ...data,
        websiteId
      }
    });

    return pixel;
  }

  static async getWebsiteStats(websiteId: string) {
    const website = await prisma.website.findUnique({ where: { id: websiteId } });
    if (!website) {
      throw new Error('Website not found');
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentLeads = await prisma.websiteFormSubmission.findMany({
      where: { websiteId: website.id, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' }
    });

    const leadsMap: Record<string, number> = {};
    for (const lead of recentLeads) {
      const dateStr = lead.createdAt.toISOString().slice(0, 10);
      leadsMap[dateStr] = (leadsMap[dateStr] || 0) + 1;
    }

    const leadsOverTime = Object.keys(leadsMap).sort().map(date => ({
      _id: date,
      count: leadsMap[date]
    }));

    const groupedStatus = await prisma.websiteFormSubmission.groupBy({
      by: ['status'],
      where: { websiteId: website.id },
      _count: { _all: true }
    });

    const statusBreakdown = groupedStatus.map(item => ({
      _id: item.status,
      count: item._count._all
    }));

    return {
      views: (website.stats as any)?.views || 0,
      leads: (website.stats as any)?.leads || 0,
      leadsOverTime,
      statusBreakdown
    };
  }

  // --- Public Endpoints ---
  static async publicGetWebsite(domain: string) {
    if (!domain) throw new Error('Domain is required');
    
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_MAIN_DOMAIN || '';
    const isSubdomain = domain.includes(rootDomain) || domain.includes('localhost');
    const subdomainSlug = isSubdomain ? domain.split('.')[0] : null;

    console.log('Resolving website domain:', domain, 'subdomainSlug:', subdomainSlug);

    let website = await prisma.website.findFirst({
      where: {
        OR: [
          { customDomain: domain },
          ...(subdomainSlug ? [{ slug: subdomainSlug }] : [])
        ],
        status: 'active'
      }
    });

    if (!website && !isSubdomain) {
      const parts = domain.split('.');
      if (parts.length > 2 && parts[0] === 'www') {
        const baseDomain = parts.slice(1).join('.');
        website = await prisma.website.findFirst({ where: { customDomain: baseDomain, status: 'active' }});
      }
    }

    if (!website) {
        console.error('Website not found for domain:', domain, 'subdomainSlug:', subdomainSlug);
        throw new Error('Website not found');
    }

    // Fire and forget view count update
    Promise.resolve().then(async () => {
      try {
        const stats: any = website.stats || { views: 0, leads: 0 };
        stats.views = (stats.views || 0) + 1;
        await prisma.website.update({ where: { id: website.id }, data: { stats } });
      } catch(e) {}
    });

    const pixels = await prisma.pixel.findMany({
      where: { websiteId: website.id, status: 'active' }
    });

    return { website, pixels };
  }

  static async publicSubmitLead(domain: string, slug: string | undefined, data: any, ip: string, userAgent: string) {
    if (!domain) throw new Error('Domain is required');

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_MAIN_DOMAIN || '';
    const isSubdomain = domain.includes(rootDomain) || domain.includes('localhost');
    const subdomainSlug = isSubdomain ? domain.split('.')[0] : null;

    let website = await prisma.website.findFirst({
      where: {
        OR: [
          { customDomain: domain },
          ...(subdomainSlug ? [{ slug: subdomainSlug }] : [])
        ],
        status: 'active'
      }
    });

    if (!website && !isSubdomain) {
      const parts = domain.split('.');
      if (parts.length > 2 && parts[0] === 'www') {
        const baseDomain = parts.slice(1).join('.');
        website = await prisma.website.findFirst({ where: { customDomain: baseDomain, status: 'active' }});
      }
    }

    if (!website) throw new Error('Website not found');

    const lead = await prisma.websiteFormSubmission.create({
      data: {
        ...data,
        websiteId: website.id,
        ipAddress: ip,
        userAgent: userAgent
      }
    });

    const stats: any = website.stats || { views: 0, leads: 0 };
    stats.leads = (stats.leads || 0) + 1;
    await prisma.website.update({ where: { id: website.id }, data: { stats } });

    eventBus.emit('website.lead.captured', { lead, website });

    return { lead, website };
  }
}

