import { prisma, requestContext } from '@workspace/db';
import crypto from 'crypto';

export interface CreateReviewSessionDTO {
    clientId: string;
    projectId?: string;
    name: string;
    startDate: Date | string;
    endDate: Date | string;
    postIds?: string[];
    expiresInDays?: number;
}

export class ClientReviewService {
    /**
     * Agency generates a tokenized review session for their client
     */
    static async createReviewSession(data: CreateReviewSessionDTO) {
        const companyId = requestContext.getStore()?.companyId as string;
        if (!companyId) throw new Error('Company context required');

        const token = crypto.randomBytes(24).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (data.expiresInDays || 14));

        const session = await (prisma as any).clientReviewSession.create({
            data: {
                companyId,
                clientId: data.clientId,
                projectId: data.projectId,
                token,
                name: data.name,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                expiresAt,
                status: 'pending'
            },
            include: {
                client: { select: { id: true, name: true, email: true } },
                project: { select: { id: true, name: true } }
            }
        });

        // If postIds were specified, update their status to in_review
        if (data.postIds && data.postIds.length > 0) {
            await (prisma as any).socialPost.updateMany({
                where: { id: { in: data.postIds } },
                data: { status: 'in_review' }
            });
        }

        return {
            ...session,
            publicReviewUrl: `/review/${token}`
        };
    }

    /**
     * Public endpoint: retrieve review session and its posts by token (NO LOGIN REQUIRED)
     */
    static async getReviewSessionByToken(token: string) {
        const session = await (prisma as any).clientReviewSession.findUnique({
            where: { token },
            include: {
                client: { select: { id: true, name: true } },
                project: { select: { id: true, name: true } },
                company: { select: { id: true, name: true } },
                comments: { orderBy: { createdAt: 'desc' } }
            }
        });

        if (!session) {
            throw new Error('Invalid or expired review session link');
        }

        if (new Date() > new Date(session.expiresAt)) {
            throw new Error('This review link has expired. Please request a new link from your agency team.');
        }

        // Fetch posts for this client/project within the date range
        const posts = await (prisma as any).socialPost.findMany({
            where: {
                companyId: session.companyId,
                clientId: session.clientId,
                scheduledFor: {
                    gte: session.startDate,
                    lte: session.endDate
                }
            },
            include: {
                variants: true,
                reviewComments: { orderBy: { createdAt: 'asc' } }
            },
            orderBy: { scheduledFor: 'asc' }
        });

        return {
            session,
            posts
        };
    }

    /**
     * Submit an inline comment on a specific post
     */
    static async addPostComment(sessionId: string, postId: string, commentText: string, authorName: string = 'Client Reviewer', authorType: string = 'client') {
        const comment = await (prisma as any).postReviewComment.create({
            data: {
                sessionId,
                postId,
                authorName,
                authorType,
                commentText,
                resolved: false
            }
        });

        // Update session status to revisions_requested if commented by client
        if (authorType === 'client') {
            await (prisma as any).clientReviewSession.update({
                where: { id: sessionId },
                data: { status: 'revisions_requested' }
            }).catch(() => null);
        }

        return comment;
    }

    /**
     * Client clicks "Approve Entire Calendar"
     */
    static async batchApproveSession(token: string, clientNotes?: string) {
        const session = await (prisma as any).clientReviewSession.findUnique({
            where: { token }
        });

        if (!session) throw new Error('Review session not found');

        // 1. Lock all posts in this session to 'approved'
        await (prisma as any).socialPost.updateMany({
            where: {
                companyId: session.companyId,
                clientId: session.clientId,
                scheduledFor: {
                    gte: session.startDate,
                    lte: session.endDate
                }
            },
            data: {
                status: 'approved'
            }
        });

        // 2. Update session status
        const updatedSession = await (prisma as any).clientReviewSession.update({
            where: { id: session.id },
            data: {
                status: 'approved',
                clientNotes: clientNotes || 'Approved by client'
            }
        });

        return {
            success: true,
            message: 'All posts approved successfully! Scheduled for publishing.',
            session: updatedSession
        };
    }
}
