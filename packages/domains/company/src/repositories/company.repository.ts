import { prisma } from '@workspace/db';

export class CompanyRepository {
    static async findById(id: string, includeUsersCount: boolean = false) {
        return prisma.company.findUnique({
            where: { id },
            include: includeUsersCount ? {
                _count: {
                    select: { users: true }
                }
            } : undefined
        });
    }

    static async findByIdOrSlug(idOrSlug: string, includeUsersCount: boolean = false) {
        return prisma.company.findFirst({
            where: {
                OR: [
                    { id: idOrSlug },
                    { slug: idOrSlug }
                ]
            },
            include: includeUsersCount ? {
                _count: {
                    select: { users: true }
                }
            } : undefined
        });
    }

    static async update(id: string, data: any) {
        return prisma.company.update({
            where: { id },
            data
        });
    }

    static async getFollowStatus(userId: string, companyId: string) {
        return prisma.companyFollower.findUnique({
            where: {
                userId_companyId: {
                    userId,
                    companyId
                }
            }
        });
    }

    static async follow(userId: string, companyId: string) {
        return prisma.$transaction([
            prisma.companyFollower.create({
                data: {
                    userId,
                    companyId
                }
            }),
            prisma.company.update({
                where: { id: companyId },
                data: {
                    followersCount: { increment: 1 }
                }
            })
        ]);
    }

    static async unfollow(userId: string, companyId: string, followId: string) {
        return prisma.$transaction([
            prisma.companyFollower.delete({
                where: { id: followId }
            }),
            prisma.company.update({
                where: { id: companyId },
                data: {
                    followersCount: { decrement: 1 }
                }
            })
        ]);
    }

    static async getReviews(companyId: string) {
        return prisma.companyPublicReview.findMany({
            where: { companyId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        photoUrl: true,
                        title: true,
                        role: true,
                        position: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }

    static async addReview(params: {
        companyId: string;
        userId?: string | null;
        reviewerName?: string | null;
        reviewerEmail?: string | null;
        isVerified: boolean;
        rating: number;
        title: string;
        description: string;
    }) {
        return prisma.companyPublicReview.create({
            data: {
                companyId: params.companyId,
                userId: params.userId || null,
                reviewerName: params.reviewerName || null,
                reviewerEmail: params.reviewerEmail || null,
                isVerified: params.isVerified,
                rating: Number(params.rating),
                title: params.title,
                description: params.description
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        photoUrl: true,
                        title: true,
                        role: true,
                        position: true
                    }
                }
            }
        });
    }
}
