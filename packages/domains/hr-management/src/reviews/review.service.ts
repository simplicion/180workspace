import { prisma } from '@workspace/db';
import { PerformanceService } from '../performance/performance.service';

export class ReviewService {
    static async getReviews(user: any, queryParams: { employeeId?: string; managerId?: string; status?: string }) {
        const { employeeId, managerId, status } = queryParams;
        let query: any = {};

        if (user.role === 'employee' && (!user.permissions || !user.permissions.includes('can_manage_team'))) {
            query.employeeId = user.id;
        } else if (user.permissions && user.permissions.includes('can_manage_team')) {
            query.OR = [{ managerId: user.id }, { employeeId: user.id }];
        } else {
            if (employeeId) query.employeeId = employeeId;
            if (managerId) query.managerId = managerId;
        }

        if (status) query.status = status;

        return await prisma.review.findMany({
            where: query,
            include: {
                employee: { select: { name: true, email: true, department: true, role: true } },
                manager: { select: { name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    static async getReviewById(reviewId: string, user: any) {
        const review = await prisma.review.findFirst({ 
            where: { id: reviewId },
            include: {
                employee: { select: { id: true, name: true, department: true } },
                manager: { select: { name: true } }
            }
        });

        if (!review) throw new Error('Review not found');

        if (user.role === 'employee' && (review as any).employee.id !== user.id) {
            throw new Error('Not authorized to view this review');
        }
        return review;
    }

    static async createReview(data: { employeeId: string; period: string; dueDate?: string; managerId?: string }, userId: string) {
        const exists = await prisma.review.findFirst({ where: { employeeId: data.employeeId, period: data.period } });
        if (exists) throw new Error(`Review for period ${data.period} already exists for this employee`);

        const performanceService = new PerformanceService();
        const performanceSnapshot = await performanceService.getPerformanceInsights(data.employeeId, data.period);

        return await prisma.review.create({ data: {
            employeeId: data.employeeId,
            period: data.period,
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            managerId: data.managerId || userId,
            performanceSnapshot: performanceSnapshot as any
        } });
    }

    static async submitSelfEvaluation(reviewId: string, userId: string, data: { selfRatings?: any; selfSummary?: string }) {
        const review = await prisma.review.findFirst({ where: { id: reviewId } });
        
        if (!review) throw new Error('Review not found');
        if (review.employeeId !== userId) {
            throw new Error('Not authorized');
        }

        return await prisma.review.update({
            where: { id: reviewId },
            data: {
                selfRatings: data.selfRatings || (review as any).selfRatings,
                selfSummary: data.selfSummary || review.selfSummary,
                status: 'manager_eval_pending',
                selfSubmittedAt: new Date()
            }
        });
    }

    static async submitManagerEvaluation(reviewId: string, user: any, data: { managerRatings?: any; managerSummary?: string; overallRating?: number; nextPeriodGoals?: any }) {
        const review = await prisma.review.findFirst({ where: { id: reviewId } });
        
        if (!review) throw new Error('Review not found');

        if (review.managerId !== user.id && !['admin', 'hr'].includes(user.role)) {
            throw new Error('Not authorized');
        }

        return await prisma.review.update({
            where: { id: reviewId },
            data: {
                managerRatings: data.managerRatings || (review as any).managerRatings,
                managerSummary: data.managerSummary || review.managerSummary,
                overallRating: data.overallRating || review.overallRating,
                nextPeriodGoals: data.nextPeriodGoals || (review as any).nextPeriodGoals,
                status: 'complete',
                managerSubmittedAt: new Date()
            }
        });
    }

    static async deleteReview(reviewId: string) {
        const review = await prisma.review.findFirst({ where: { id: reviewId } });
        if (!review) throw new Error('Review not found');
        
        await prisma.review.delete({ where: { id: reviewId } });
        return { success: true };
    }
}
