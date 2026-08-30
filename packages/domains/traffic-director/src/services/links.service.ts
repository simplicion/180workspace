import { prisma, requestContext } from '@workspace/db';
import { CreateTrafficLinkDTO, UpdateTrafficLinkDTO } from '../types';

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

    return link;
  }

  static async checkSlugAvailability(slug: string, excludeLinkId?: string) {
    const existing = await db.trafficLink.findUnique({
      where: { slug }
    });

    if (existing && existing.id !== excludeLinkId) {
      return { available: false, reason: 'This slug is already in use.' };
    }

    return { available: true };
  }

  static async createLink(companyId: string | undefined, data: CreateTrafficLinkDTO) {
    const effectiveCompanyId = this.resolveCompanyId(companyId) || data.companyId;
    if (!effectiveCompanyId) {
      throw new Error('Company context is required to create a traffic link');
    }

    const { 
      name, slug, description, fallbackUrl, customDomain, tags,
      warmupUntil, rampUpEnabled, rampUpDurationHours, shieldMode, datacenterBlocked
    } = data;

    // Validate slug format
    const cleanedSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const availability = await this.checkSlugAvailability(cleanedSlug);
    if (!availability.available) {
      throw new Error(availability.reason);
    }

    const link = await db.trafficLink.create({
      data: {
        companyId: effectiveCompanyId,
        name,
        slug: cleanedSlug,
        description,
        fallbackUrl,
        customDomain,
        tags: tags || [],
        warmupUntil: warmupUntil ? new Date(warmupUntil) : undefined,
        rampUpEnabled: rampUpEnabled ?? false,
        rampUpDurationHours: rampUpDurationHours !== undefined ? Number(rampUpDurationHours) : 24,
        shieldMode: shieldMode || 'server',
        datacenterBlocked: datacenterBlocked ?? true
      },
      include: {
        rules: true
      }
    });

    return { link };
  }

  static async updateLink(companyId: string | undefined, linkId: string, data: UpdateTrafficLinkDTO) {
    const effectiveCompanyId = this.resolveCompanyId(companyId);
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

    const updated = await db.trafficLink.update({
      where: { id: linkId },
      data: {
        name: data.name !== undefined ? data.name : undefined,
        slug: data.slug !== undefined ? data.slug : undefined,
        description: data.description !== undefined ? data.description : undefined,
        fallbackUrl: data.fallbackUrl !== undefined ? data.fallbackUrl : undefined,
        customDomain: data.customDomain !== undefined ? data.customDomain : undefined,
        tags: data.tags !== undefined ? data.tags : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
        warmupUntil: data.warmupUntil !== undefined ? (data.warmupUntil ? new Date(data.warmupUntil) : null) : undefined,
        rampUpEnabled: data.rampUpEnabled !== undefined ? data.rampUpEnabled : undefined,
        rampUpDurationHours: data.rampUpDurationHours !== undefined ? Number(data.rampUpDurationHours) : undefined,
        shieldMode: data.shieldMode !== undefined ? data.shieldMode : undefined,
        datacenterBlocked: data.datacenterBlocked !== undefined ? data.datacenterBlocked : undefined
      },
      include: {
        rules: {
          orderBy: { priority: 'asc' }
        }
      }
    });

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

  static async checkSlugAvailability(slug: string, excludeLinkId?: string): Promise<{ available: boolean; slug: string }> {
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/^-+|-+$/g, '');
    if (!cleanSlug) {
      return { available: false, slug: cleanSlug };
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

    return { available: false, slug: cleanSlug };
  }
}

