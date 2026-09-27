import { prisma } from '@workspace/db';

export interface CreatePitchInput {
  title: string;
  description?: string;
  videoUrl: string;
  hlsMasterUrl?: string;
  thumbnailUrl?: string;
  duration: number; // in seconds (must be <= 180)
  category?: string;
  tags?: string[];
  userId: string;
  companyId?: string | null;
}

export interface GetFeedOptions {
  cursor?: string;
  limit?: number;
  category?: string;
  userId?: string;
}

export class PitchesService {
  /**
   * Create a new 180-second pitch reel post.
   * Strictly enforces duration <= 180 seconds.
   */
  static async createPitch(input: CreatePitchInput) {
    if (!input.title || input.title.trim().length === 0) {
      throw new Error('Pitch title is required');
    }

    if (!input.videoUrl) {
      throw new Error('Video URL is required');
    }

    if (typeof input.duration !== 'number' || input.duration <= 0) {
      throw new Error('Valid video duration is required');
    }

    // STRICT 180-SECOND RULE
    if (input.duration > 180) {
      throw new Error(
        `Duration exceeds maximum allowed limit. Pitches must be 180 seconds or less (received: ${input.duration}s)`
      );
    }

    return await prisma.pitchinPost.create({
      data: {
        title: input.title.trim(),
        description: input.description?.trim() || '',
        videoUrl: input.videoUrl,
        hlsMasterUrl: input.hlsMasterUrl || '',
        thumbnailUrl: input.thumbnailUrl || '',
        duration: Math.round(input.duration * 10) / 10,
        category: (input.category || 'startups').toLowerCase(),
        tags: input.tags || [],
        userId: input.userId,
        companyId: input.companyId || null,
        status: input.hlsMasterUrl ? 'ready' : 'processing',
      },
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
   * Cursor-paginated vertical feed of pitches.
   */
  static async getFeed(options: GetFeedOptions = {}) {
    const limit = Math.min(Math.max(options.limit || 10, 1), 50);
    const where: any = {};

    if (options.category && options.category !== 'all') {
      where.category = options.category.toLowerCase();
    }

    if (options.userId) {
      where.userId = options.userId;
    }

    const queryArgs: any = {
      where,
      take: limit + 1,
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
        _count: {
          select: {
            comments: true,
            upvotes: true,
          },
        },
      },
    };

    if (options.cursor) {
      queryArgs.cursor = { id: options.cursor };
      queryArgs.skip = 1;
    }

    const items = await prisma.pitchinPost.findMany(queryArgs);
    let nextCursor: string | null = null;

    if (items.length > limit) {
      const nextItem = items.pop();
      nextCursor = nextItem ? nextItem.id : null;
    }

    return {
      items,
      nextCursor,
      hasMore: !!nextCursor,
    };
  }

  /**
   * Get single pitch by ID.
   */
  static async getPitchById(pitchId: string, currentUserId?: string) {
    const pitch = await prisma.pitchinPost.findUnique({
      where: { id: pitchId },
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
        _count: {
          select: {
            comments: true,
            upvotes: true,
          },
        },
      },
    });

    if (!pitch) {
      return null;
    }

    let isUpvotedByMe = false;
    if (currentUserId) {
      const upvote = await prisma.pitchinUpvote.findUnique({
        where: {
          postId_userId: {
            postId: pitchId,
            userId: currentUserId,
          },
        },
      });
      isUpvotedByMe = !!upvote;
    }

    return {
      ...pitch,
      isUpvotedByMe,
    };
  }

  /**
   * Toggle upvote on a pitch reel.
   */
  static async toggleUpvote(postId: string, userId: string) {
    const existing = await prisma.pitchinUpvote.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existing) {
      await prisma.pitchinUpvote.delete({
        where: { id: existing.id },
      });

      const updated = await prisma.pitchinPost.update({
        where: { id: postId },
        data: { upvotesCount: { decrement: 1 } },
        select: { upvotesCount: true },
      });

      return { upvoted: false, upvotesCount: Math.max(0, updated.upvotesCount) };
    } else {
      await prisma.pitchinUpvote.create({
        data: {
          postId,
          userId,
        },
      });

      const updated = await prisma.pitchinPost.update({
        where: { id: postId },
        data: { upvotesCount: { increment: 1 } },
        select: { upvotesCount: true },
      });

      return { upvoted: true, upvotesCount: updated.upvotesCount };
    }
  }

  /**
   * Get comments on a pitch reel.
   */
  static async getComments(postId: string, limit = 50) {
    return await prisma.pitchinComment.findMany({
      where: { postId },
      take: limit,
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            photoUrl: true,
            headline: true,
          },
        },
      },
    });
  }

  /**
   * Add a comment to a pitch reel.
   */
  static async addComment(postId: string, userId: string, content: string) {
    if (!content || content.trim().length === 0) {
      throw new Error('Comment content cannot be empty');
    }

    return await prisma.pitchinComment.create({
      data: {
        postId,
        userId,
        content: content.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            photoUrl: true,
            headline: true,
          },
        },
      },
    });
  }

  /**
   * Increment view counter.
   */
  static async recordView(postId: string) {
    return await prisma.pitchinPost.update({
      where: { id: postId },
      data: { views: { increment: 1 } },
      select: { id: true, views: true },
    });
  }
}
