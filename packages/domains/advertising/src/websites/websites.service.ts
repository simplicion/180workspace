import { prisma, basePrisma } from '@workspace/db';
import { buildDefaultWebsiteConfig } from './default-config';

export { buildDefaultWebsiteConfig } from './default-config';

/**
 * Typed service error. `statusCode` is what the controller returns; `code` is stable for the frontend.
 */
export class WebsiteServiceError extends Error {
  readonly code: string;
  readonly statusCode: number;
  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.name = 'WebsiteServiceError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

const notFound = () => new WebsiteServiceError('WEBSITE_NOT_FOUND', 'Website not found', 404);

function requireCompany(companyId: string | undefined | null): string {
  if (!companyId || typeof companyId !== 'string') {
    throw new WebsiteServiceError('COMPANY_REQUIRED', 'A company context is required for websites', 403);
  }
  return companyId;
}

/** Public-safe company fields attached to editor responses (never credentials or admin contact data). */
const SAFE_COMPANY_SELECT = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  tagline: true,
  oneLineDescription: true,
  industry: true,
  website: true,
  headquarters: true,
  socialLinks: true,
  currency: true,
  currencySymbol: true,
};

/**
 * Tenant isolation: every authenticated method takes the caller's `companyId` (from `req.user.companyId`,
 * never from body/query/headers) and filters by `{ id, companyId }`. The Prisma tenant extension does not
 * scope findUnique/update/delete by id, so those are not used for websites here. A website owned by another
 * company (or a legacy row with a null companyId) is reported as "Website not found" (404).
 */
export class WebsitesService {
  static async getWebsites(companyId: string) {
    const cId = requireCompany(companyId);
    const websites = await basePrisma.website.findMany({
      where: { companyId: cId },
      orderBy: { createdAt: 'desc' }
    });
    const company = await basePrisma.company
      .findUnique({ where: { id: cId }, select: SAFE_COMPANY_SELECT })
      .catch(() => null);

    return { websites, company };
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

  static async createWebsite(companyId: string, userId: string, data: any) {
    const cId = requireCompany(companyId);
    const { name, slug, template, config, customDomain } = data || {};

    if (!name || typeof name !== 'string' || !slug || typeof slug !== 'string') {
      throw new WebsiteServiceError('INVALID_INPUT', 'Website name and slug are required.', 400);
    }

    const existing = await basePrisma.domainRegistry.findFirst({ where: { domain: slug } });
    if (existing) {
      throw new WebsiteServiceError('DOMAIN_TAKEN', 'This subdomain is already in use by a company profile or website.', 409);
    }

    if (customDomain) {
      const existingDomain = await basePrisma.domainRegistry.findFirst({ where: { domain: customDomain } });
      if (existingDomain) {
        throw new WebsiteServiceError('DOMAIN_TAKEN', 'This custom domain is already taken.', 409);
      }
    }

    const website = await basePrisma.website.create({
      data: {
        companyId: cId,
        name,
        slug,
        customDomain: customDomain || null,
        template: template || 'default',
        config: config || buildDefaultWebsiteConfig(name),
        owner: userId,
        status: 'active'
      }
    });

    await basePrisma.domainRegistry.create({
      data: {
        domain: slug,
        type: 'ADVERTISING_WEBSITE',
        targetId: website.id,
        companyId: cId
      }
    });

    if (customDomain) {
      await basePrisma.domainRegistry.create({
        data: {
          domain: customDomain,
          type: 'ADVERTISING_WEBSITE',
          targetId: website.id,
          companyId: cId
        }
      });
    }

    return website;
  }

  /** Loads a website owned by the company, or throws WEBSITE_NOT_FOUND (404). */
  static async findOwnedWebsite(companyId: string, id: string) {
    const cId = requireCompany(companyId);
    if (!id || typeof id !== 'string') throw notFound();
    const website = await basePrisma.website.findFirst({ where: { id, companyId: cId } });
    if (!website) throw notFound();
    return website;
  }

  static async getWebsite(companyId: string, id: string) {
    const website = await WebsitesService.findOwnedWebsite(companyId, id);

    // Attach the owner company (safe fields only); never "whichever company comes first".
    const company = await basePrisma.company
      .findUnique({ where: { id: website.companyId }, select: SAFE_COMPANY_SELECT })
      .catch(() => null);
    if (company) {
      (website as any).company = company;
    }

    return website;
  }

  static async updateWebsite(companyId: string, id: string, data: any) {
    const { name, slug, template, config, publishedConfig, isPublished, status, customDomain } = data || {};

    const currentWebsite = await WebsitesService.findOwnedWebsite(companyId, id);
    const cId = currentWebsite.companyId as string;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (template !== undefined) updateData.template = template;
    if (config !== undefined) updateData.config = config;
    if (publishedConfig !== undefined) updateData.publishedConfig = publishedConfig;
    if (isPublished !== undefined) updateData.isPublished = isPublished;
    if (status !== undefined) updateData.status = status;

    const slugChanged = typeof slug === 'string' && slug.length > 0 && slug !== currentWebsite.slug;
    if (slugChanged) {
      const existing = await basePrisma.domainRegistry.findFirst({ where: { domain: slug } });
      if (existing && (existing.type !== 'ADVERTISING_WEBSITE' || existing.targetId !== id)) {
        throw new WebsiteServiceError('DOMAIN_TAKEN', 'This subdomain is already in use by a company profile or website.', 409);
      }
      updateData.slug = slug;
    }

    if (customDomain !== undefined) {
      if (customDomain) {
        const existing = await basePrisma.domainRegistry.findFirst({ where: { domain: customDomain } });
        if (existing && (existing.type !== 'ADVERTISING_WEBSITE' || existing.targetId !== id)) {
          throw new WebsiteServiceError('DOMAIN_TAKEN', 'Custom domain already taken', 409);
        }
      }
      updateData.customDomain = customDomain || null;
    }

    const { count } = await basePrisma.website.updateMany({
      where: { id, companyId: cId },
      data: updateData
    });
    if (!count) throw notFound();
    const website = await basePrisma.website.findFirst({ where: { id, companyId: cId } });

    if (slugChanged) {
      await basePrisma.domainRegistry.deleteMany({
        where: { domain: currentWebsite.slug, type: 'ADVERTISING_WEBSITE', targetId: id }
      });
      const alreadyRegistered = await basePrisma.domainRegistry.findFirst({ where: { domain: slug } });
      if (!alreadyRegistered) {
        await basePrisma.domainRegistry.create({
          data: { domain: slug, type: 'ADVERTISING_WEBSITE', targetId: id, companyId: cId }
        });
      }
    }

    if (customDomain !== undefined) {
      // Remove the old custom domain mapping
      if (currentWebsite.customDomain && currentWebsite.customDomain !== customDomain) {
        await basePrisma.domainRegistry.deleteMany({
          where: { domain: currentWebsite.customDomain, type: 'ADVERTISING_WEBSITE', targetId: id }
        });
      }
      // Register the new custom domain
      if (customDomain && customDomain !== currentWebsite.customDomain) {
        await basePrisma.domainRegistry.create({
          data: {
            domain: customDomain,
            type: 'ADVERTISING_WEBSITE',
            targetId: id,
            companyId: cId
          }
        });
      }
    }

    return website;
  }

  static async deleteWebsite(companyId: string, id: string) {
    const currentWebsite = await WebsitesService.findOwnedWebsite(companyId, id);

    const { count } = await basePrisma.website.deleteMany({ where: { id, companyId: currentWebsite.companyId } });
    if (!count) throw notFound();

    // Clean up domain registry
    await basePrisma.domainRegistry.deleteMany({
      where: { type: 'ADVERTISING_WEBSITE', targetId: id }
    });

    return true;
  }

  static async getWebsitePixels(companyId: string, websiteId: string) {
    await WebsitesService.findOwnedWebsite(companyId, websiteId);
    return basePrisma.pixel.findMany({ where: { websiteId } });
  }

  static async createWebsitePixel(companyId: string, websiteId: string, data: any) {
    const website = await WebsitesService.findOwnedWebsite(companyId, websiteId);
    const { provider, pixelId, status } = data || {};
    if (!provider || typeof provider !== 'string' || !pixelId || typeof pixelId !== 'string') {
      throw new WebsiteServiceError('INVALID_INPUT', 'provider and pixelId are required.', 400);
    }

    // Whitelisted fields only: the body cannot set websiteId/companyId.
    return basePrisma.pixel.create({
      data: {
        provider,
        pixelId,
        ...(typeof status === 'string' ? { status } : {}),
        websiteId,
        companyId: website.companyId
      }
    });
  }

  static async getWebsiteStats(companyId: string, websiteId: string) {
    const website = await WebsitesService.findOwnedWebsite(companyId, websiteId);
    return {
      views: (website.stats as any)?.views || 0,
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
        const stats: any = website.stats || { views: 0 };
        stats.views = (stats.views || 0) + 1;

        const today = new Date().toISOString().slice(0, 10);
        stats.viewsByDate = stats.viewsByDate || {};
        stats.viewsByDate[today] = (stats.viewsByDate[today] || 0) + 1;

        await prisma.website.update({ where: { id: website.id }, data: { stats } });
      } catch(e) {}
    });

    const pixels = await prisma.pixel.findMany({
      where: { websiteId: website.id, status: 'active' }
    });

    if (website.isPublished && website.publishedConfig) {
       website.config = website.publishedConfig;
    }

    return { website, pixels };
  }


}
