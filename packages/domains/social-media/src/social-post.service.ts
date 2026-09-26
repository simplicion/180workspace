import { prisma, requestContext } from '@workspace/db';
import { PublishDispatcher, isPostApproved, projectRequiresApproval } from './publishing/publish-dispatcher';
import { getDb } from './publishing/http';
import { SAFE_ACCOUNT_SELECT, SocialDomainError, notFound, pieceScope, requireCompanyId } from './tenant-scope';
import { BrandSafetyAuditor, BrandSafetyAuditResult } from './brand-safety-auditor';
import { SmartTimezoneScheduler, ScheduleCollisionCheckResult } from './smart-timezone-scheduler';
import { PlatformMediaGuard, MediaValidationResult } from './media-platform-guard';
import { getProjectBrandConsciousness } from './brand-consciousness';

export interface PostVariantInput {
    platform: 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube' | 'twitter' | 'x' | 'threads' | 'pinterest' | 'reddit' | string;
    customContent: string;
    customMediaUrls?: string[];
    firstComment?: string;
    platformMeta?: Record<string, any>;
    /** Connected account to publish this variant with (defaults to the post's / project's account of this platform). */
    socialAccountId?: string;
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
        if (!companyId) throw new SocialDomainError('UNAUTHENTICATED', 401, 'Company context required');

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
                        platformMeta: v.platformMeta || {},
                        socialAccountId: v.socialAccountId || undefined
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
            // Scoped: a piece id of another company matches nothing (update by id alone bypasses the tenant filter).
            await (prisma as any).calendarContentPiece.updateMany({
                where: pieceScope(data.calendarPieceId, companyId),
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
                socialAccount: { select: SAFE_ACCOUNT_SELECT },
                calendar: true,
                calendarPiece: true,
                repurposedFrom: { select: { id: true, title: true, versionNumber: true } },
                derivedPosts: { select: { id: true, title: true, status: true, scheduledFor: true } }
            }
        });

        if (!post || (companyId && post.companyId !== companyId)) {
            throw notFound('Post');
        }

        return post;
    }

    static async listPosts(filters?: { projectId?: string; clientId?: string; status?: string; calendarId?: string; isEvergreen?: boolean; limit?: number; offset?: number }) {
        const companyId = requestContext.getStore()?.companyId as string;
        if (!companyId) throw new SocialDomainError('UNAUTHENTICATED', 401, 'Company context required');

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
        if (!existing || existing.companyId !== companyId) throw notFound('Post');

        const updatePayload: any = { ...data };
        delete updatePayload.variants;
        delete updatePayload.id;
        delete updatePayload.companyId; // a post can never be moved to another tenant

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
        if (!existing || existing.companyId !== companyId) throw notFound('Post');

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
            include: { variants: true, socialAccount: { select: SAFE_ACCOUNT_SELECT }, project: true }
        });

        if (!post || (companyId && post.companyId !== companyId)) throw notFound('Post');

        const issues: string[] = [];
        let platformChecks: Array<{ platform: string; publishStatus: string; issues: string[] }> = [];

        // 1. Content validation
        if (!post.content || post.content.trim() === '') {
            issues.push('Primary content / caption cannot be empty.');
        }

        // 2. Media readiness
        if (post.mediaType === 'video' && !post.finalVideoUrl && (!post.mediaUrls || post.mediaUrls.length === 0)) {
            issues.push('Video posts require a rendered deliverable URL.');
        }

        // 3. Approval requirement check
        if (projectRequiresApproval(post.project) && !isPostApproved(post)) {
            issues.push('Project workflow requires client/editorial approval before publishing.');
        }

        // 4. Social account check
        if (!post.socialAccountId && (!post.variants || post.variants.length === 0)) {
            issues.push('No target social account or platform variant selected.');
        }

        if (post.socialAccount?.reauthRequired) {
            issues.push(`Social account "${post.socialAccount.accountName}" requires reauthorization.`);
        }

        // 5. Per-platform checks: app configured, account connected, media/caption limits of each platform.
        if (post.socialAccountId || (post.variants && post.variants.length > 0)) {
            try {
                platformChecks = await PublishDispatcher.preview(postId, post.companyId);
                for (const c of platformChecks) {
                    if (c.publishStatus === 'published' || c.publishStatus === 'processing') continue;
                    for (const i of c.issues) issues.push(`${c.platform}: ${i}`);
                }
            } catch (e: any) {
                issues.push(e.message);
            }
        }

        // 6. Production-Grade Business Planner Violations: Brand Safety & Tone
        let brandSafetyResult: BrandSafetyAuditResult | undefined = undefined;
        if (post.projectId && post.content) {
            try {
                const brandProfile = await getProjectBrandConsciousness(post.projectId, post.companyId);
                const rawMeta = (brandProfile as any)?.metadata?.brand || {};
                const brandConfig = {
                    forbiddenWords: brandProfile?.forbiddenWords || [],
                    competitors: rawMeta.competitors || [],
                    tone: brandProfile?.tone || undefined,
                    preferredVocabulary: rawMeta.preferredVocabulary || [],
                };
                brandSafetyResult = BrandSafetyAuditor.auditContent(post.content, brandConfig);
                for (const v of brandSafetyResult.violations) {
                    if (v.severity === 'high') {
                        issues.push(`Brand Safety: ${v.contextSnippet} (${v.suggestion || 'Resolve before scheduling'})`);
                    }
                }
            } catch {
                // If brand profile does not exist or fails, do not block readiness
            }
        }

        // 7. Production-Grade Business Planner Violations: Schedule Collisions
        let scheduleCollisionResult: ScheduleCollisionCheckResult | undefined = undefined;
        if (post.scheduledFor) {
            try {
                const db = getDb();
                const otherPosts = await db.socialPost.findMany({
                    where: {
                        companyId: post.companyId,
                        id: { not: post.id },
                        status: { in: ['scheduled', 'approved'] },
                        scheduledFor: { not: null },
                    },
                    select: { id: true, scheduledFor: true, socialAccountId: true },
                    take: 200,
                });
                scheduleCollisionResult = SmartTimezoneScheduler.checkScheduleCollision(
                    new Date(post.scheduledFor),
                    otherPosts,
                    post.socialAccountId || undefined,
                    15
                );
                if (scheduleCollisionResult.hasCollision && scheduleCollisionResult.warningMessage) {
                    issues.push(`Schedule Collision: ${scheduleCollisionResult.warningMessage}`);
                }
            } catch {
                // Non-blocking fallback
            }
        }

        // 8. Production-Grade Business Planner Violations: Platform Media Guard
        const mediaGuardResults: MediaValidationResult[] = [];
        const targetPlatforms: string[] = [];
        if (post.variants && post.variants.length > 0) {
            for (const v of post.variants) {
                if (v.platform && !targetPlatforms.includes(v.platform)) targetPlatforms.push(v.platform);
            }
        } else if (post.socialAccount?.platform) {
            targetPlatforms.push(post.socialAccount.platform);
        }

        for (const p of targetPlatforms) {
            const guard = PlatformMediaGuard.validateForPlatform(p, {
                caption: post.content,
                title: post.title || undefined,
                mediaUrls: post.mediaUrls || undefined,
                aspectRatio: (post.metadata as any)?.aspectRatio,
                durationSeconds: (post.metadata as any)?.durationSeconds,
                fileSizeMB: (post.metadata as any)?.fileSizeMB,
            });
            mediaGuardResults.push(guard);
            if (!guard.valid) {
                for (const err of guard.errors) {
                    issues.push(`${p} Media Constraint: ${err}`);
                }
            }
        }

        return {
            isReady: issues.length === 0,
            issues,
            violations: {
                brandSafety: brandSafetyResult,
                scheduleCollision: scheduleCollisionResult,
                mediaGuard: mediaGuardResults,
            },
            platformChecks,
            post
        };
    }

    /**
     * Syncs a rendered video from 180 Media Studio / ReelWorker back to the calendar piece and its linked post.
     * Tenant-scoped: the piece and post must belong to `companyId` (the caller's JWT company); otherwise 404 and
     * nothing is written. Prefer POST /calendar-pieces/:id/final-video for new clients.
     */
    static async syncVideoFromStudio(
        calendarPieceId: string,
        finalVideoUrl: string,
        thumbnailUrl?: string,
        companyId: string | undefined = requestContext.getStore()?.companyId as string | undefined,
    ) {
        const tenant = requireCompanyId(companyId);
        const db = getDb();

        // 1. Update the calendar piece (only if it is ours)
        const { count } = await db.calendarContentPiece.updateMany({
            where: pieceScope(calendarPieceId, tenant),
            data: { finalVideoUrl, thumbnailUrl, status: 'ready' },
        });
        if (!count) throw notFound('Calendar piece');
        const piece = await db.calendarContentPiece.findFirst({ where: pieceScope(calendarPieceId, tenant) });

        // 2. Update the linked SocialPost of the same company, if any
        const linkedPost = await db.socialPost.findFirst({ where: { calendarPieceId, companyId: tenant } });
        if (linkedPost) {
            await db.socialPost.updateMany({
                where: { id: linkedPost.id, companyId: tenant },
                data: { finalVideoUrl, thumbnailUrl, status: 'ready' },
            });
        }

        return { success: true, piece, linkedPost };
    }

    /**
     * Publish every unpublished platform variant now through the platform publishers (see publishing/publish-dispatcher.ts).
     * Idempotent: variants already published are never sent again. Throws PublishError (typed code) for
     * APPROVAL_REQUIRED, PUBLISH_IN_PROGRESS, PUBLISH_NOT_CONFIGURED (every target unconfigured) and NOT_FOUND.
     */
    static async publishPostNow(postId: string, userId?: string) {
        const companyId = requestContext.getStore()?.companyId as string;
        return PublishDispatcher.publishPost(postId, { companyId, trigger: 'manual', userId });
    }

    /**
     * Retry one platform. Only a failed / pending variant is re-sent; an already published one returns success
     * without posting again.
     */
    static async retryFailedVariant(postId: string, platform: string, userId?: string) {
        const companyId = requestContext.getStore()?.companyId as string;
        const result = await PublishDispatcher.publishPost(postId, { companyId, trigger: 'retry', platform, userId });
        const v = result.variants.find((x) => x.platform === platform) || result.variants.find((x) => x.publishStatus === 'failed');
        const ok = Boolean(v && (v.publishStatus === 'published' || v.publishStatus === 'processing'));
        return {
            ...result,
            success: ok,
            message: ok ? `Published to ${platform}.` : `Retry failed for ${platform}: ${v?.error || 'unknown error'}`
        };
    }

    /** Publish history (one row per platform attempt), newest first. */
    static async listPublishAttempts(postId: string, limit = 50) {
        const companyId = requestContext.getStore()?.companyId as string;
        if (!companyId) throw new SocialDomainError('UNAUTHENTICATED', 401, 'Company context required');
        return (prisma as any).socialPublishAttempt.findMany({
            where: { postId, companyId },
            orderBy: { startedAt: 'desc' },
            take: Math.min(Math.max(limit, 1), 200)
        });
    }

    /**
     * Repurpose an existing evergreen post into a new derivative post
     */
    static async repurposePost(postId: string, options?: { newScheduleDate?: Date | string; newProjectId?: string; newContent?: string }) {
        const companyId = requestContext.getStore()?.companyId as string;
        const original = await (prisma as any).socialPost.findUnique({ where: { id: postId }, include: { variants: true } });
        if (!original || original.companyId !== companyId) throw notFound('Original post');

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
