import { prisma, requestContext } from '@workspace/db';
import { CreateTrafficLinkDTO, UpdateTrafficLinkDTO } from '../types';
import { TrafficDirectorBillingService } from './billing.service';

const db = prisma as any;

export class TrafficLinksService {
  private static resolveCompanyId(providedCompanyId?: string): string | undefined {
    return providedCompanyId || requestContext.getStore()?.companyId;
  }

  static async getLinks(companyId?: string, options: { page?: number; limit?: number; search?: string; isActive?: boolean } = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    const effectiveCompanyId = this.resolveCompanyId(companyId);
    if (effectiveCompanyId) {
      where.companyId = effectiveCompanyId;
    }

    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { slug: { contains: options.search, mode: 'insensitive' } }
      ];
    }

    if (options.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    const [links, total] = await Promise.all([
      db.trafficLink.findMany({
        where,
        include: {
          rules: {
            orderBy: { priority: 'asc' }
          },
          _count: {
            select: { logs: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      db.trafficLink.count({ where })
    ]);

    if (links && links.length > 0) {
      try {
        const ids = links.map((l: any) => l.id);
        const rawModes = await db.$queryRawUnsafe(
          `SELECT "id", "safePageProxyMode" FROM "TrafficLink" WHERE "id" = ANY($1::text[])`,
          ids
        );
        const modeMap = new Map((rawModes as any[]).map((r: any) => [r.id, Boolean(r.safePageProxyMode)]));
        for (const l of links) {
          if (modeMap.has(l.id)) {
            l.safePageProxyMode = modeMap.get(l.id);
          }
        }
      } catch (e) {}
    }

    return {
      links,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getLinkById(companyId: string | undefined, linkId: string) {
    const effectiveCompanyId = this.resolveCompanyId(companyId);
    const where: any = { id: linkId };
    if (effectiveCompanyId) {
      where.companyId = effectiveCompanyId;
    }

    const link = await db.trafficLink.findFirst({
      where,
      include: {
        rules: {
          orderBy: { priority: 'asc' }
        },
        _count: {
          select: { logs: true }
        }
      }
    });

    if (!link) {
      throw new Error('Traffic link not found or unauthorized');
    }

    try {
      const raw = await db.$queryRawUnsafe(
        `SELECT "safePageProxyMode" FROM "TrafficLink" WHERE "id" = $1`,
        link.id
      );
      if (raw && raw[0]) {
        link.safePageProxyMode = Boolean(raw[0].safePageProxyMode);
      }
    } catch (e) {}

    const tags = Array.isArray(link.tags) ? link.tags : [];
    (link as any).blockSpyServices = tags.length === 0 ? true : tags.includes('block_spy');
    (link as any).blockVpn = tags.length === 0 ? true : tags.includes('block_vpn');

    return { link };
  }

  static async getLinkBySlug(slug: string) {
    const link = await db.trafficLink.findUnique({
      where: { slug },
      include: {
        rules: {
          where: { isActive: true },
          orderBy: { priority: 'asc' }
        }
      }
    });

    if (link) {
      const tags = Array.isArray(link.tags) ? link.tags : [];
      (link as any).blockSpyServices = tags.length === 0 ? true : tags.includes('block_spy');
      (link as any).blockVpn = tags.length === 0 ? true : tags.includes('block_vpn');
      try {
        const raw = await db.$queryRawUnsafe(
          `SELECT "safePageProxyMode" FROM "TrafficLink" WHERE "id" = $1`,
          link.id
        );
        if (raw && raw[0]) {
          link.safePageProxyMode = Boolean(raw[0].safePageProxyMode);
        }
      } catch (e) {}
    }

    return link;
  }

  static async getLinkByCustomDomain(domain: string) {
    const cleanDomain = domain.toLowerCase().split(':')[0].trim();
    const subdomainPrefix = cleanDomain.includes('.') ? cleanDomain.split('.')[0] : cleanDomain;
    
    // 1. Try finding in DomainRegistry
    const registry = await db.domainRegistry.findFirst({
      where: {
        domain: { in: [cleanDomain, `${cleanDomain}.localhost`, cleanDomain.replace('.localhost', ''), subdomainPrefix] },
        type: 'TRAFFIC_LINK'
      }
    });

    let link = null;
    if (registry?.targetId) {
      link = await db.trafficLink.findUnique({
        where: { id: registry.targetId },
        include: {
          rules: {
            where: { isActive: true },
            orderBy: { priority: 'asc' }
          }
        }
      });
    }

    // 2. Fallback: Search TrafficLink directly by customDomain
    if (!link) {
      link = await db.trafficLink.findFirst({
        where: {
          OR: [
            { customDomain: cleanDomain },
            { customDomain: `${cleanDomain}.localhost` },
            { customDomain: cleanDomain.replace('.localhost', '') },
            { customDomain: subdomainPrefix }
          ]
        },
        include: {
          rules: {
            where: { isActive: true },
            orderBy: { priority: 'asc' }
          }
        }
      });
    }

    if (link) {
      const tags = Array.isArray(link.tags) ? link.tags : [];
      (link as any).blockSpyServices = tags.length === 0 ? true : tags.includes('block_spy');
      (link as any).blockVpn = tags.length === 0 ? true : tags.includes('block_vpn');
      try {
        const raw = await db.$queryRawUnsafe(
          `SELECT "safePageProxyMode" FROM "TrafficLink" WHERE "id" = $1`,
          link.id
        );
        if (raw && raw[0]) {
          link.safePageProxyMode = Boolean(raw[0].safePageProxyMode);
        }
      } catch (e) {}
    }

    return link;
  }

  static async createLink(companyId: string | undefined, data: any) {
    const effectiveCompanyId = this.resolveCompanyId(companyId) || data.companyId;
    if (!effectiveCompanyId) {
      throw new Error('Company context is required to create a traffic link');
    }

    const linkName = data.name || data.title || 'Untitled Link';
    const rawSlug = data.slug || linkName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 7);
    const cleanedSlug = rawSlug.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const finalFallbackUrl = data.fallbackUrl || data.destinationUrl || data.targetUrl || 'https://google.com';

    // Validate slug format
    const availability = await this.checkSlugAvailability(cleanedSlug);
    if (!availability.available) {
      throw new Error(availability.reason);
    }

    // Enforce subscription link quota & active trial status
    const billingStatus = await TrafficDirectorBillingService.getSubscriptionStatus(effectiveCompanyId);
    const sub = billingStatus?.subscription;
    if (sub && !sub.canCreateMoreLinks) {
      if (sub.isTrialExpired) {
        throw new Error('SUBSCRIPTION_REQUIRED: Your 7-day free trial has expired. Please upgrade your subscription in Billing to create new Smart Links.');
      }
      if (!sub.isSubscriptionActive) {
        throw new Error('SUBSCRIPTION_REQUIRED: An active subscription is required to create Smart Links. Please activate a subscription in Billing.');
      }
      throw new Error(
        `SUBSCRIPTION_REQUIRED: Plan link limit reached: Your ${sub.planName || sub.planTier} plan allows a maximum of ${sub.maxLinks} Smart Links (${sub.currentLinksCount}/${sub.maxLinks} used). Please upgrade your subscription in Billing to create more links.`
      );
    }

    const link = await db.trafficLink.create({
      data: {
        companyId: effectiveCompanyId,
        name: linkName,
        slug: cleanedSlug,
        description: data.description,
        fallbackUrl: finalFallbackUrl,
        customDomain: data.customDomain,
        tags: data.tags || [],
        warmupUntil: data.warmupUntil ? new Date(data.warmupUntil) : undefined,
        rampUpEnabled: data.rampUpEnabled !== undefined ? data.rampUpEnabled : true,
        rampUpDurationHours: data.rampUpDurationHours !== undefined ? Number(data.rampUpDurationHours) : 12,
        shieldMode: data.shieldMode || 'server',
        datacenterBlocked: data.datacenterBlocked ?? true
      },
      include: {
        rules: true
      }
    });

    if (data.cloakedUrl || data.safePageUrl) {
      try {
        const rule = await db.trafficRule.create({
          data: {
            linkId: link.id,
            name: 'Default Cloak Rule',
            priority: 0,
            isActive: true,
            destinationUrl: data.cloakedUrl || data.safePageUrl,
            actionType: 'redirect_302',
            conditions: [],
            weight: 100,
          }
        });
        if (rule) {
          link.rules = [rule];
        }
      } catch (e) {}
    }

    if (data.safePageProxyMode !== undefined) {
      try {
        await db.$executeRawUnsafe(
          `UPDATE "TrafficLink" SET "safePageProxyMode" = $1 WHERE "id" = $2`,
          Boolean(data.safePageProxyMode),
          link.id
        );
        link.safePageProxyMode = Boolean(data.safePageProxyMode);
      } catch (e) {}
    }

    return { link };
  }

  static async updateLink(
    companyIdOrLinkId: string | undefined, 
    linkIdOrData: string | UpdateTrafficLinkDTO, 
    maybeData?: UpdateTrafficLinkDTO
  ) {
    let effectiveCompanyId: string | undefined;
    let linkId: string;
    let data: UpdateTrafficLinkDTO;

    if (typeof linkIdOrData === 'object' && linkIdOrData !== null && maybeData === undefined) {
      linkId = companyIdOrLinkId as string;
      data = linkIdOrData as UpdateTrafficLinkDTO;
      effectiveCompanyId = this.resolveCompanyId(undefined);
    } else {
      effectiveCompanyId = this.resolveCompanyId(companyIdOrLinkId);
      linkId = linkIdOrData as string;
      data = maybeData as UpdateTrafficLinkDTO;
    }

    const where: any = { id: linkId };
    if (effectiveCompanyId) {
      where.companyId = effectiveCompanyId;
    }

    const existing = await db.trafficLink.findFirst({ where });

    if (!existing) {
      throw new Error('Traffic link not found or unauthorized');
    }

    if (data.slug && data.slug !== existing.slug) {
      const cleanedSlug = data.slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      const availability = await this.checkSlugAvailability(cleanedSlug, linkId);
      if (!availability.available) {
        throw new Error(availability.reason);
      }
      data.slug = cleanedSlug;
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.fallbackUrl !== undefined) updateData.fallbackUrl = data.fallbackUrl;
    if (data.customDomain !== undefined) updateData.customDomain = data.customDomain;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.isActive !== undefined) {
      if (data.isActive === true) {
        const existingLink = await db.trafficLink.findUnique({ where: { id: linkId }, select: { companyId: true } });
        const targetCompanyId = existingLink?.companyId || effectiveCompanyId;
        if (targetCompanyId) {
          const billingStatus = await TrafficDirectorBillingService.getSubscriptionStatus(targetCompanyId);
          if (!billingStatus?.subscription?.isSubscriptionActive || !billingStatus?.subscription?.cloakingEnabled) {
            throw new Error('Active subscription or 7-day free trial required to activate Smart Link cloaking.');
          }
        }
      }
      updateData.isActive = data.isActive;
    }
    if (data.warmupUntil !== undefined) updateData.warmupUntil = data.warmupUntil ? new Date(data.warmupUntil) : null;
    if (data.rampUpEnabled !== undefined) updateData.rampUpEnabled = data.rampUpEnabled;
    if (data.rampUpDurationHours !== undefined) updateData.rampUpDurationHours = Number(data.rampUpDurationHours);
    if (data.shieldMode !== undefined) updateData.shieldMode = data.shieldMode;
    if (data.datacenterBlocked !== undefined) updateData.datacenterBlocked = data.datacenterBlocked;

    const updated = await db.trafficLink.update({
      where: { id: linkId },
      data: updateData,
      include: {
        rules: {
          orderBy: { priority: 'asc' }
        }
      }
    });

    if (data.safePageProxyMode !== undefined) {
      try {
        await db.$executeRawUnsafe(
          `UPDATE "TrafficLink" SET "safePageProxyMode" = $1 WHERE "id" = $2`,
          Boolean(data.safePageProxyMode),
          linkId
        );
        updated.safePageProxyMode = Boolean(data.safePageProxyMode);
      } catch (e) {}
    }

    return { link: updated };
  }

  static async deleteLink(companyId: string | undefined, linkId: string) {
    const effectiveCompanyId = this.resolveCompanyId(companyId);
    const where: any = { id: linkId };
    if (effectiveCompanyId) {
      where.companyId = effectiveCompanyId;
    }

    const existing = await db.trafficLink.findFirst({ where });

    if (!existing) {
      throw new Error('Traffic link not found or unauthorized');
    }

    await db.trafficLink.delete({
      where: { id: linkId }
    });

    return { success: true };
  }

  static async checkSlugAvailability(slug: string, excludeLinkId?: string): Promise<{ available: boolean; slug: string; reason?: string }> {
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/^-+|-+$/g, '');
    if (!cleanSlug) {
      return { available: false, slug: cleanSlug, reason: 'Slug cannot be empty.' };
    }

    const existing = await db.trafficLink.findUnique({
      where: { slug: cleanSlug }
    });

    if (!existing) {
      return { available: true, slug: cleanSlug };
    }

    if (excludeLinkId && existing.id === excludeLinkId) {
      return { available: true, slug: cleanSlug };
    }

    return { available: false, slug: cleanSlug, reason: 'This slug is already in use.' };
  }
}

