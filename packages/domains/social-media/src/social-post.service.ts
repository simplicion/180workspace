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
    externalStorageLinks?: Array<{ url: string; provider: string; label?: string }>;
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
    isEvergreen?: boolean;
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
                externalStorageLinks: data.externalStorageLinks || [],
                finalVideoUrl: data.finalVideoUrl,
                thumbnailUrl: data.thumbnailUrl,
                mediaType: data.mediaType || 'video',
                status: data.scheduledFor ? 'scheduled' : 'draft',
                scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
                isEvergreen: data.isEvergreen || false,
                versionNumber: 1,
                metadata: data.metadata || {},
                history: [
                    {
                        version: 1,
                        action: 'created',
                        userId,
                        timestamp: new Date().toISOString()
                    }
                ],
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
                calendarPiece: true,
                repurposedFrom: { select: { id: true, title: true, versionNumber: true } },
                derivedPosts: { select: { id: true, title: true, status: true, scheduledFor: true } }
            }
        });

        if (!post || (companyId && post.companyId !== companyId)) {
            throw new Error('Post not found');
        }

        return post;
    }

    static async listPosts(filters?: { projectId?: string; clientId?: string; status?: string; calendarId?: string; isEvergreen?: boolean; limit?: number; offset?: number }) {
        const companyId = requestContext.getStore()?.companyId as string;
        if (!companyId) throw new Error('Company context required');

        const whereClause: any = { companyId };
        if (filters?.projectId) whereClause.projectId = filters.projectId;
        if (filters?.clientId) whereClause.clientId = filters.clientId;
        if (filters?.status) whereClause.status = filters.status;
        if (filters?.calendarId) whereClause.calendarId = filters.calendarId;
        if (filters?.isEvergreen !== undefined) whereClause.isEvergreen = filters.isEvergreen;

        const posts = await (prisma as any).socialPost.findMany({
            where: whereClause,
            orderBy: { scheduledFor: 'asc' },
            take: filters?.limit || 50,
            skip: filters?.offset || 0,
            include: {
                variants: true,
                project: { select: { id: true, name: true } },
                client: { select: { id: true, name: true } },
                socialAccount: { select: { id: true, platform: true, accountName: true, username: true } },
                reviewComments: { select: { id: true, resolved: true, authorType: true } }
            }
        });

        return posts;
    }

    static async updatePost(id: string, data: Partial<CreateSocialPostDTO> & { status?: string }, userId?: string) {
        const companyId = requestContext.getStore()?.companyId as string;
        const existing = await (prisma as any).socialPost.findUnique({ where: { id } });
        if (!existing || existing.companyId !== companyId) throw new Error('Post not found');

        const updatePayload: any = { ...data };
        delete updatePayload.variants;
        delete updatePayload.id;

        if (data.scheduledFor) {
            updatePayload.scheduledFor = new Date(data.scheduledFor);
        }

        // Versioning check: if post was approved and substantive copy or video changed, bump version
        let versionBumped = false;
        let newVersion = existing.versionNumber || 1;
        if (existing.status === 'approved' && (data.content !== undefined || data.finalVideoUrl !== undefined)) {
            if ((data.content && data.content !== existing.content) || (data.finalVideoUrl && data.finalVideoUrl !== existing.finalVideoUrl)) {
                newVersion += 1;
                updatePayload.versionNumber = newVersion;
                updatePayload.status = 'in_review'; // Reset status for re-review
                versionBumped = true;
            }
        }

        // Append to history
        const currentHistory = Array.isArray(existing.history) ? existing.history : [];
        const newHistoryEntry = {
            version: newVersion,
            action: versionBumped ? 'version_bumped' : 'updated',
            userId,
            status: updatePayload.status || existing.status,
            timestamp: new Date().toISOString()
        };
        updatePayload.history = [...currentHistory, newHistoryEntry];

        const updated = await (prisma as any).socialPost.update({
            where: { id },
            data: updatePayload,
            include: { variants: true }
        });

        return updated;
    }

    /**
     * Submit raw source footage or external storage links (e.g. Google Drive)
     */
    static async submitFootage(postId: string, footage: { rawMediaUrls?: string[]; externalStorageLinks?: Array<{ url: string; provider: string; label?: string }> }) {
        const companyId = requestContext.getStore()?.companyId as string;
        const existing = await (prisma as any).socialPost.findUnique({ where: { id: postId } });
        if (!existing || existing.companyId !== companyId) throw new Error('Post not found');

        const updated = await (prisma as any).socialPost.update({
            where: { id: postId },
            data: {
                rawMediaUrls: footage.rawMediaUrls || existing.rawMediaUrls,
                externalStorageLinks: footage.externalStorageLinks || existing.externalStorageLinks
            }
        });

        return { success: true, post: updated, message: 'Footage submitted successfully' };
    }

    /**
     * Validates if a post is completely ready for live or scheduled publishing
     */
    static async validatePublishingReadiness(postId: string) {
        const companyId = requestContext.getStore()?.companyId as string;
        const post = await (prisma as any).socialPost.findUnique({
            where: { id: postId },
            include: { variants: true, socialAccount: true, project: true }
        });

        if (!post || (companyId && post.companyId !== companyId)) throw new Error('Post not found');

        const issues: string[] = [];

        // 1. Content validation
        if (!post.content || post.content.trim() === '') {
            issues.push('Primary content / caption cannot be empty.');
        }

        // 2. Media readiness
        if (post.mediaType === 'video' && !post.finalVideoUrl && (!post.mediaUrls || post.mediaUrls.length === 0)) {
            issues.push('Video posts require a rendered deliverable URL.');
        }

        // 3. Approval requirement check
        const projectSettings = post.project?.socialSettings || {};
        if (projectSettings.approvalRequired && post.status !== 'approved') {
            issues.push('Project workflow requires client/editorial approval before publishing.');
        }

        // 4. Social account check
        if (!post.socialAccountId && (!post.variants || post.variants.length === 0)) {
            issues.push('No target social account or platform variant selected.');
        }

        if (post.socialAccount?.reauthRequired) {
            issues.push(`Social account "${post.socialAccount.accountName}" requires reauthorization.`);
        }

        return {
            isReady: issues.length === 0,
            issues,
            post
        };
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
            include: { variants: true, socialAccount: true, project: true }
        });

        if (!post || (companyId && post.companyId !== companyId)) {
            throw new Error('Post not found');
        }

        // Mark status as publishing
        await (prisma as any).socialPost.update({
            where: { id: postId },
            data: { status: 'publishing' }
        });

        const publishedLinks: Record<string, string> = {
            ...(typeof post.publishedLinks === 'object' && post.publishedLinks ? post.publishedLinks : {})
        };
        const errors: Record<string, string> = {};

        // Targets: either explicit variants or fallback
        const targets = post.variants && post.variants.length > 0
            ? post.variants.map((v: any) => v.platform)
            : [post.socialAccount?.platform || 'instagram'];

        for (const platform of targets) {
            // If already published to this platform, skip to prevent duplicate post
            if (publishedLinks[platform]) continue;

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
                errors[platform] = err.message || 'Publishing adapter execution failed';
            }
        }

        const isFullyPublished = Object.keys(errors).length === 0 && Object.keys(publishedLinks).length > 0;
        const isPartiallyPublished = Object.keys(publishedLinks).length > 0 && Object.keys(errors).length > 0;

        const newStatus = isFullyPublished ? 'published' : isPartiallyPublished ? 'partially_published' : 'failed';

        const completedPost = await (prisma as any).socialPost.update({
            where: { id: postId },
            data: {
                status: newStatus,
                publishedAt: isFullyPublished || isPartiallyPublished ? new Date() : null,
                publishedLinks: publishedLinks,
                errorMessage: Object.keys(errors).length > 0 ? JSON.stringify(errors) : null
            },
            include: { variants: true, socialAccount: true }
        });

        return {
            success: isFullyPublished || isPartiallyPublished,
            status: newStatus,
            message: isFullyPublished 
                ? 'Post published successfully across all platforms' 
                : isPartiallyPublished 
                ? 'Post partially published; some platforms failed and can be retried' 
                : 'Publishing failed on all platforms',
            publishedLinks,
            errors: Object.keys(errors).length > 0 ? errors : undefined,
            post: completedPost
        };
    }

    /**
     * Retry publishing only the specified failed platform variant without duplicating successes
     */
    static async retryFailedVariant(postId: string, platform: 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube') {
        const companyId = requestContext.getStore()?.companyId as string;
        const post = await (prisma as any).socialPost.findUnique({
            where: { id: postId },
            include: { variants: true, socialAccount: true }
        });

        if (!post || (companyId && post.companyId !== companyId)) throw new Error('Post not found');

        const publishedLinks: Record<string, string> = {
            ...(typeof post.publishedLinks === 'object' && post.publishedLinks ? post.publishedLinks : {})
        };

        const variant = post.variants?.find((v: any) => v.platform === platform);
        const content = variant?.customContent || post.content;
        const mediaUrl = post.finalVideoUrl || post.mediaUrls?.[0];

        try {
            if (platform === 'instagram') {
                const result = await MetaAdapter.publishInstagramMedia({
                    accessToken: post.socialAccount?.accessToken || 'mock_meta_token',
                    igUserId: post.socialAccount?.platformAccountId || 'mock_ig_user',
                    caption: content,
                    videoUrl: mediaUrl,
                    shareToFeed: true
                });
                publishedLinks.instagram = result.liveUrl;
            } else if (platform === 'facebook') {
                const result = await MetaAdapter.publishFacebookPost({
                    accessToken: post.socialAccount?.accessToken || 'mock_meta_token',
                    pageId: post.socialAccount?.platformAccountId || 'mock_fb_page',
                    message: content,
                    videoUrl: mediaUrl
                });
                publishedLinks.facebook = result.liveUrl;
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

            const updated = await (prisma as any).socialPost.update({
                where: { id: postId },
                data: {
                    status: 'published',
                    publishedLinks,
                    errorMessage: null
                },
                include: { variants: true }
            });

            return { success: true, message: `Successfully published to ${platform}`, post: updated };
        } catch (err: any) {
            throw new Error(`Retry failed for ${platform}: ${err.message}`);
        }
    }

    /**
     * Repurpose an existing evergreen post into a new derivative post
     */
    static async repurposePost(postId: string, options?: { newScheduleDate?: Date | string; newProjectId?: string; newContent?: string }) {
        const companyId = requestContext.getStore()?.companyId as string;
        const original = await (prisma as any).socialPost.findUnique({ where: { id: postId }, include: { variants: true } });
        if (!original || original.companyId !== companyId) throw new Error('Original post not found');

        // Increment reuse count on original
        await (prisma as any).socialPost.update({
            where: { id: postId },
            data: {
                reuseCount: (original.reuseCount || 0) + 1,
                lastReusedAt: new Date()
            }
        });

        // Create derivative post
        const derivative = await this.createPost({
            title: `Repurposed: ${original.title || 'Post'}`,
            content: options?.newContent || original.content,
            mediaUrls: original.mediaUrls,
            finalVideoUrl: original.finalVideoUrl,
            thumbnailUrl: original.thumbnailUrl,
            mediaType: original.mediaType,
            projectId: options?.newProjectId || original.projectId,
            clientId: original.clientId,
            scheduledFor: options?.newScheduleDate ? new Date(options.newScheduleDate) : undefined,
            isEvergreen: true
        });

        // Link parent relationship
        await (prisma as any).socialPost.update({
            where: { id: derivative.id },
            data: { repurposedFromId: original.id }
        });

        return derivative;
    }
}
