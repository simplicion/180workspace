import { prisma } from '@workspace/db';

export interface CreateResourceInput {
  title: string;
  description: string;
  url: string;
  category?: string;
  tags?: string[];
  userId: string;
}

export interface ListResourcesOptions {
  category?: string;
  query?: string;
  sortBy?: 'upvotes' | 'recent';
  limit?: number;
  offset?: number;
}

export class ResourcesService {
  /**
   * List curated startup resources & tools.
   */
  static async listResources(options: ListResourcesOptions = {}) {
    const limit = Math.min(Math.max(options.limit || 30, 1), 100);
    const offset = Math.max(options.offset || 0, 0);

    const where: any = {};

    if (options.category && options.category !== 'all') {
      where.category = options.category.toLowerCase();
    }

    if (options.query) {
      where.OR = [
        { title: { contains: options.query, mode: 'insensitive' } },
        { description: { contains: options.query, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = options.sortBy === 'recent'
      ? { createdAt: 'desc' }
      : { upvotes: 'desc' };

    const [resources, total] = await Promise.all([
      prisma.pitchinResource.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              photoUrl: true,
            },
          },
        },
      }),
      prisma.pitchinResource.count({ where }),
    ]);

    return {
      resources,
      total,
      limit,
      offset,
      hasMore: offset + resources.length < total,
    };
  }

  /**
   * Submit a new resource / tool to the vault.
   */
  static async createResource(input: CreateResourceInput) {
    if (!input.title || input.title.trim().length === 0) {
      throw new Error('Resource title is required');
    }

    if (!input.url || input.url.trim().length === 0) {
      throw new Error('Resource URL is required');
    }

    return await prisma.pitchinResource.create({
      data: {
        title: input.title.trim(),
        description: input.description?.trim() || '',
        url: input.url.trim(),
        category: (input.category || 'ai').toLowerCase(),
        tags: input.tags || [],
        userId: input.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            photoUrl: true,
          },
        },
      },
    });
  }

  /**
   * Upvote a resource in the vault.
   */
  static async upvoteResource(id: string) {
    const updated = await prisma.pitchinResource.update({
      where: { id },
      data: { upvotes: { increment: 1 } },
      select: { id: true, upvotes: true },
    });

    return { success: true, upvotes: updated.upvotes };
  }
}
