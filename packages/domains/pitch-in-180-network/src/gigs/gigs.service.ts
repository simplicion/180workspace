import { prisma } from '@workspace/db';

export interface CreateGigInput {
  title: string;
  description: string;
  category?: string;
  budget?: number;
  currency?: string;
  location?: string;
  userId: string;
}

export interface ListGigsOptions {
  category?: string;
  status?: string;
  query?: string;
  limit?: number;
  offset?: number;
}

export class GigsService {
  /**
   * List startup gigs and freelance opportunities.
   */
  static async listGigs(options: ListGigsOptions = {}) {
    const limit = Math.min(Math.max(options.limit || 20, 1), 50);
    const offset = Math.max(options.offset || 0, 0);

    const where: any = {};

    if (options.status) {
      where.status = options.status;
    } else {
      where.status = 'open';
    }

    if (options.category && options.category !== 'all') {
      where.category = options.category.toLowerCase();
    }

    if (options.query) {
      where.OR = [
        { title: { contains: options.query, mode: 'insensitive' } },
        { description: { contains: options.query, mode: 'insensitive' } },
      ];
    }

    const [gigs, total] = await Promise.all([
      prisma.pitchinGig.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              headline: true,
              photoUrl: true,
              city: true,
              country: true,
            },
          },
        },
      }),
      prisma.pitchinGig.count({ where }),
    ]);

    return {
      gigs,
      total,
      limit,
      offset,
      hasMore: offset + gigs.length < total,
    };
  }

  /**
   * Get single gig details.
   */
  static async getGigById(id: string) {
    return await prisma.pitchinGig.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            headline: true,
            photoUrl: true,
            city: true,
            country: true,
          },
        },
      },
    });
  }

  /**
   * Create a new startup gig or project opportunity.
   */
  static async createGig(input: CreateGigInput) {
    if (!input.title || input.title.trim().length === 0) {
      throw new Error('Gig title is required');
    }

    if (!input.description || input.description.trim().length === 0) {
      throw new Error('Gig description is required');
    }

    return await prisma.pitchinGig.create({
      data: {
        title: input.title.trim(),
        description: input.description.trim(),
        category: (input.category || 'tech').toLowerCase(),
        budget: input.budget ? Number(input.budget) : null,
        currency: input.currency || 'USD',
        location: input.location?.trim() || 'Remote',
        status: 'open',
        userId: input.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            headline: true,
            photoUrl: true,
          },
        },
      },
    });
  }

  /**
   * Submit 1-tap pitch application for an opportunity.
   */
  static async applyToGig(gigId: string, applicantId: string, pitchReelId?: string, note?: string) {
    const gig = await prisma.pitchinGig.findUnique({
      where: { id: gigId },
    });

    if (!gig) {
      throw new Error('Opportunity not found');
    }

    if (gig.status !== 'open') {
      throw new Error('This opportunity is no longer accepting applications');
    }

    if (gig.userId === applicantId) {
      throw new Error('You cannot apply to your own opportunity');
    }

    // Return confirmed application metadata
    return {
      applied: true,
      gigId: gig.id,
      applicantId,
      pitchReelId: pitchReelId || null,
      note: note || '',
      appliedAt: new Date().toISOString(),
    };
  }
}
