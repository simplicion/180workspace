import { prisma, requestContext } from '@workspace/db';
import { MetaAdapter } from './adapters/meta.adapter';
import { LinkedInAdapter } from './adapters/linkedin.adapter';
import { TikTokAdapter } from './adapters/tiktok.adapter';
import { YouTubeAdapter } from './adapters/youtube.adapter';

export interface PostVariantInput {
    platform: 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube';
    customContent: string;
    customMediaUrls?: string[];
    firstComment?: string;
    platformMeta?: Record<string, any>;
}

export interface CreateSocialPostDTO {
    title?: string;
    content: string;
    mediaUrls?: string[];
    rawMediaUrls?: string[];
    finalVideoUrl?: string;
    thumbnailUrl?: string;
    mediaType?: 'video' | 'image' | 'carousel' | 'document';
    scheduledFor?: Date | string;
    projectId?: string;
    clientId?: string;
    calendarId?: string;
    calendarPieceId?: string;
    socialAccountId?: string;
    variants?: PostVariantInput[];
    metadata?: Record<string, any>;
}

export class SocialPostService {
    static async createPost(data: CreateSocialPostDTO, userId?: string) {
        const companyId = requestContext.getStore()?.companyId as string;
        if (!companyId) throw new Error('Company context required');

        const post = await (prisma as any).socialPost.create({
            data: {
                companyId,
                clientId: data.clientId,
                projectId: data.projectId,
                calendarId: data.calendarId,
                calendarPieceId: data.calendarPieceId,
                socialAccountId: data.socialAccountId,
                createdById: userId,
                title: data.title,
                content: data.content,
                mediaUrls: data.mediaUrls || [],
                rawMediaUrls: data.rawMediaUrls || [],
                finalVideoUrl: data.finalVideoUrl,
                thumbnailUrl: data.thumbnailUrl,
                mediaType: data.mediaType || 'video',
                status: data.scheduledFor ? 'scheduled' : 'draft',
                scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
                metadata: data.metadata || {},
                variants: data.variants && data.variants.length > 0 ? {
                    create: data.variants.map(v => ({
                        platform: v.platform,
                        customContent: v.customContent || data.content,
                        customMediaUrls: v.customMediaUrls || data.mediaUrls || [],
                        firstComment: v.firstComment,
                        platformMeta: v.platformMeta || {}
                    }))
                } : undefined
            },
            include: {
                variants: true,
                project: { select: { id: true, name: true } },
                client: { select: { id: true, name: true } },
                socialAccount: { select: { id: true, platform: true, accountName: true, username: true } }
            }
        });

        // If linked to a calendarPiece, sync the status & media
        if (data.calendarPieceId) {
            await (prisma as any).calendarContentPiece.update({
                where: { id: data.calendarPieceId },
                data: {
                    rawMediaUrls: data.rawMediaUrls || [],
                    finalVideoUrl: data.finalVideoUrl,
                    thumbnailUrl: data.thumbnailUrl,
                    status: data.finalVideoUrl ? 'ready' : 'in_progress'
                }
            }).catch(() => null);
        }

        return post;
    }

    static async getPost(id: string) {
        const companyId = requestContext.getStore()?.companyId as string;
        const post = await (prisma as any).socialPost.findUnique({
            where: { id },
            include: {
                variants: true,
                reviewComments: { orderBy: { createdAt: 'asc' } },
                project: true,
                client: true,
                socialAccount: true,
                calendar: true,
                calendarPiece: true
            }
        });

        if (!post || post.companyId !== companyId) {
            throw new Error('Post not found');
        }

        return post;
    }

    static async listPosts(filters?: { projectId?: string; clientId?: string; status?: string; calendarId?: string; limit?: number; offset?: number }) {
        const companyId = requestContext.getStore()?.companyId as string;
        if (!companyId) throw new Error('Company context required');

        const whereClause: any = { companyId };
        if (filters?.projectId) whereClause.projectId = filters.projectId;
        if (filters?.clientId) whereClause.clientId = filters.clientId;
        if (filters?.status) whereClause.status = filters.status;
        if (filters?.calendarId) whereClause.calendarId = filters.calendarId;

        const posts = await (prisma as any).socialPost.findMany({
            where: whereClause,
            orderBy: { scheduledFor: 'asc' },
            take: filters?.limit || 50,
            skip: filters?.offset || 0,
            include: {
                variants: true,
                project: { select: { id: true, name: true } },
                client: { select: { id: true, name: true } },
                socialAccount: { select: { id: true, platform: true, accountName: true, username: true } }
            }
        });

        return posts;
    }

    static async updatePost(id: string, data: Partial<CreateSocialPostDTO> & { status?: string }) {
        const companyId = requestContext.getStore()?.companyId as string;
        const existing = await (prisma as any).socialPost.findUnique({ where: { id } });
        if (!existing || existing.companyId !== companyId) throw new Error('Post not found');

        const updatePayload: any = { ...data };
        delete updatePayload.variants;
        delete updatePayload.id;

        if (data.scheduledFor) {
            updatePayload.scheduledFor = new Date(data.scheduledFor);
        }

        const updated = await (prisma as any).socialPost.update({
            where: { id },
            data: updatePayload,
            include: { variants: true }
        });

        return updated;
    }

    /**
     * Syncs a rendered video from 180 Media Studio / ReelWorker back to the calendar and post
     */
    static async syncVideoFromStudio(calendarPieceId: string, finalVideoUrl: string, thumbnailUrl?: string) {
        const companyId = requestContext.getStore()?.companyId as string;

        // 1. Update Calendar Piece
        const piece = await (prisma as any).calendarContentPiece.update({
            where: { id: calendarPieceId },
            data: {
                finalVideoUrl,
                thumbnailUrl,
                status: 'ready'
            }
        });

        // 2. Update linked SocialPost if exists
        const linkedPost = await (prisma as any).socialPost.findFirst({
            where: { calendarPieceId }
        });

        if (linkedPost) {
            await (prisma as any).socialPost.update({
                where: { id: linkedPost.id },
                data: {
                    finalVideoUrl,
                    thumbnailUrl,
                    status: 'ready'
                }
            });
        }

        return { success: true, piece, linkedPost };
    }

    /**
     * Execute direct publishing across selected platform variants using zero-cost API adapters
     */
    static async publishPostNow(postId: string) {
        const companyId = requestContext.getStore()?.companyId as string;
        const post = await (prisma as any).socialPost.findUnique({
            where: { id: postId },
            include: { variants: true, socialAccount: true }
        });

        if (!post || (companyId && post.companyId !== companyId)) {
            throw new Error('Post not found');
        }

        // Mark status as publishing
        await (prisma as any).socialPost.update({
            where: { id: postId },
            data: { status: 'publishing' }
        });

        const publishedLinks: Record<string, string> = {};
        const errors: Record<string, string> = {};

        // Determine targets: either explicit variants or fallback to connected account platform
        const targets = post.variants && post.variants.length > 0
            ? post.variants.map((v: any) => v.platform)
            : ['instagram', 'linkedin', 'tiktok', 'youtube'];

        for (const platform of targets) {
            const variant = post.variants?.find((v: any) => v.platform === platform);
            const content = variant?.customContent || post.content;
            const mediaUrl = post.finalVideoUrl || post.mediaUrls?.[0];

            try {
                if (platform === 'instagram' || platform === 'facebook') {
                    if (platform === 'instagram') {
                        const result = await MetaAdapter.publishInstagramMedia({
                            accessToken: post.socialAccount?.accessToken || 'mock_meta_token',
                            igUserId: post.socialAccount?.platformAccountId || 'mock_ig_user',
                            caption: content,
                            videoUrl: mediaUrl,
                            imageUrl: !mediaUrl?.endsWith('.mp4') ? mediaUrl : undefined,
                            mediaType: post.mediaType === 'video' ? 'REELS' : 'IMAGE',
                            shareToFeed: true
                        });
                        publishedLinks.instagram = result.liveUrl;
                    } else {
                        const result = await MetaAdapter.publishFacebookPost({
                            accessToken: post.socialAccount?.accessToken || 'mock_meta_token',
                            pageId: post.socialAccount?.platformAccountId || 'mock_fb_page',
                            message: content,
                            videoUrl: mediaUrl
                        });
                        publishedLinks.facebook = result.liveUrl;
                    }
                } else if (platform === 'linkedin') {
                    const result = await LinkedInAdapter.publishPost({
                        accessToken: post.socialAccount?.accessToken || 'mock_li_token',
                        authorUrn: post.socialAccount?.platformAccountId || 'urn:li:organization:mock',
                        commentary: content,
                        videoUrl: mediaUrl,
                        title: post.title
                    });
                    publishedLinks.linkedin = result.liveUrl;
                } else if (platform === 'tiktok') {
                    const result = await TikTokAdapter.publishVideo({
                        accessToken: post.socialAccount?.accessToken || 'mock_tt_token',
                        videoUrl: mediaUrl || 'https://r2.180.app/sample.mp4',
                        title: content
                    });
                    publishedLinks.tiktok = result.liveUrl;
                } else if (platform === 'youtube') {
                    const result = await YouTubeAdapter.publishVideo({
                        accessToken: post.socialAccount?.accessToken || 'mock_yt_token',
                        videoUrl: mediaUrl,
                        title: post.title || content.substring(0, 50),
                        description: content,
                        isShort: post.mediaType === 'video'
                    });
                    publishedLinks.youtube = result.liveUrl;
                }
            } catch (err: any) {
                console.error(`[Publish Error: ${platform}]`, err);
                errors[platform] = err.message;
            }
        }

        const isFullyPublished = Object.keys(publishedLinks).length > 0;
        const completedPost = await (prisma as any).socialPost.update({
            where: { id: postId },
            data: {
                status: isFullyPublished ? 'published' : 'failed',
                publishedAt: isFullyPublished ? new Date() : null,
                publishedLinks: publishedLinks,
                errorMessage: Object.keys(errors).length > 0 ? JSON.stringify(errors) : null
            },
            include: { variants: true, socialAccount: true }
        });

        return {
            success: isFullyPublished,
            message: isFullyPublished ? 'Post published successfully across platforms' : 'Publishing failed',
            publishedLinks,
            errors: Object.keys(errors).length > 0 ? errors : undefined,
            post: completedPost
        };
    }
}
