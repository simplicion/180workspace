import { prisma } from '@workspace/db';
import { eventBus } from '@workspace/backend-infra';

export class WebsitesService {
  static async getWebsites(companyId: string) {
    const websites = await prisma.website.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    });

    let companySlug = '';
    let customDomain = null;
    try {
      const company = await prisma.company.findUnique({ where: { id: companyId } });
      if (company) {
        companySlug = company.slug || '';
        customDomain = company.customDomain || null;
      }
    } catch (e) {}

    return { websites, company: { slug: companySlug, customDomain } };
  }

  static async createWebsite(userId: string, companyId: string, data: any) {
    const { name, slug, template, companySlug, config } = data;

    const existing = await prisma.website.findFirst({ where: { slug } });
    if (existing) {
      throw new Error('A website with this slug already exists.');
    }

    const count = await prisma.website.count({ where: { companyId } });
    const isFirstWebsite = count === 0;

    if (isFirstWebsite && companySlug) {
      const existingCompany = await prisma.company.findFirst({
        where: {
          slug: companySlug,
          id: { not: companyId }
        }
      });

      if (existingCompany) {
        throw new Error('This company subdomain is already taken. Please try another one.');
      }

      await prisma.company.update({
        where: { id: companyId },
        data: { slug: companySlug }
      });
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
        template: template || 'default',
        config: config || initialConfig,
        owner: userId,
        companyId,
        status: 'active',
        isPrimary: isFirstWebsite
      }
    });

    return website;
  }

  static async getWebsite(companyId: string, id: string) {
    const website = await prisma.website.findUnique({
      where: { id }
    });
    if (!website || website.companyId !== companyId) {
      throw new Error('Website not found');
    }

    try {
      const company = await prisma.company.findUnique({ where: { id: companyId } });
      if (company) {
        (website as any).company = company;
      }
    } catch (e) {}

    return website;
  }

  static async updateWebsite(companyId: string, id: string, data: any) {
    const { name, slug, template, config, status, isPrimary } = data;

    const currentWebsite = await prisma.website.findUnique({ where: { id } });
    if (!currentWebsite || currentWebsite.companyId !== companyId) {
      throw new Error('Website not found');
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (template !== undefined) updateData.template = template;
    if (config !== undefined) updateData.config = config;
    if (status !== undefined) updateData.status = status;

    if (isPrimary === true) {
      updateData.isPrimary = true;
      await prisma.website.updateMany({
        where: { companyId, id: { not: id } },
        data: { isPrimary: false }
      });
    }

    const website = await prisma.website.update({
      where: { id },
      data: updateData
    });

    return website;
  }

  static async deleteWebsite(companyId: string, id: string) {
    const currentWebsite = await prisma.website.findUnique({ where: { id } });
    if (!currentWebsite || currentWebsite.companyId !== companyId) {
      throw new Error('Website not found');
    }

    await prisma.website.delete({ where: { id } });
    return true;
  }

  static async getWebsiteLeads(companyId: string, websiteId: string) {
    const currentWebsite = await prisma.website.findUnique({ where: { id: websiteId } });
    if (!currentWebsite || currentWebsite.companyId !== companyId) {
      throw new Error('Website not found');
    }

    const leads = await prisma.websiteFormSubmission.findMany({
      where: { websiteId },
      orderBy: { createdAt: 'desc' }
    });

    return leads;
  }

  static async getWebsitePixels(companyId: string, websiteId: string) {
    const currentWebsite = await prisma.website.findUnique({ where: { id: websiteId } });
    if (!currentWebsite || currentWebsite.companyId !== companyId) {
      throw new Error('Website not found');
    }

    const pixels = await prisma.pixel.findMany({ where: { websiteId } });
    return pixels;
  }

  static async createWebsitePixel(companyId: string, websiteId: string, data: any) {
    const currentWebsite = await prisma.website.findUnique({ where: { id: websiteId } });
    if (!currentWebsite || currentWebsite.companyId !== companyId) {
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

  static async getWebsiteStats(companyId: string, websiteId: string) {
    const website = await prisma.website.findUnique({ where: { id: websiteId } });
    if (!website || website.companyId !== companyId) {
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
  static async publicGetWebsite(domain: string, slug?: string) {
    if (!domain) throw new Error('Domain is required');

    let resolvedSlug = slug;
    
    // In actual implementation, process.env.NEXT_PUBLIC_ROOT_DOMAIN could be passed or injected.
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_MAIN_DOMAIN || '';
    const isSubdomain = domain.includes(rootDomain) || domain.includes('localhost');
    const subdomainSlug = isSubdomain ? domain.split('.')[0] : null;

    let company = await prisma.company.findFirst({
      where: {
        OR: [
          { customDomain: domain },
          { slug: subdomainSlug || '' }
        ]
      }
    });

    if (!company && !isSubdomain) {
      const parts = domain.split('.');
      if (parts.length > 2) {
        const baseDomain = parts.slice(1).join('.');
        company = await prisma.company.findFirst({ where: { customDomain: baseDomain }});
        if (company && !resolvedSlug) {
          resolvedSlug = parts[0];
        }
      }
    }

    if (!company) throw new Error('Company not found for this domain');

    let website;
    if (resolvedSlug) {
      website = await prisma.website.findFirst({
        where: { companyId: company.id, slug: resolvedSlug, status: 'active' }
      });
    } else {
      website = await prisma.website.findFirst({
        where: { companyId: company.id, isPrimary: true, status: 'active' }
      });
    }

    if (!website) throw new Error('Website not found');

    // Fire and forget view count update
    Promise.resolve().then(async () => {
      try {
        const w = await prisma.website.findUnique({ where: { id: website.id } });
        if (w) {
          const stats: any = w.stats || { views: 0, leads: 0 };
          stats.views = (stats.views || 0) + 1;
          await prisma.website.update({ where: { id: website.id }, data: { stats } });
        }
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

    const company = await prisma.company.findFirst({
      where: {
        OR: [
          { customDomain: domain },
          { slug: subdomainSlug || '' }
        ]
      }
    });

    if (!company) throw new Error('Company not found for this domain');

    let website;
    if (slug) {
      website = await prisma.website.findFirst({
        where: { companyId: company.id, slug, status: 'active' }
      });
    } else {
      website = await prisma.website.findFirst({
        where: { companyId: company.id, isPrimary: true, status: 'active' }
      });
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

    // Emit global event for CRM Integration
    eventBus.emit('website.lead.captured', { lead, website });

    return { lead, website };
  }

  static async setPrimaryWebsite(companyId: string, websiteId: string) {
    const website = await prisma.website.findUnique({
      where: { id: websiteId }
    });

    if (!website || website.companyId !== companyId) {
      throw new Error('Website not found or unauthorized');
    }

    await prisma.website.updateMany({
      where: { companyId },
      data: { isPrimary: false }
    });

    const updated = await prisma.website.update({
      where: { id: websiteId },
      data: { isPrimary: true }
    });

    return updated;
  }
}

