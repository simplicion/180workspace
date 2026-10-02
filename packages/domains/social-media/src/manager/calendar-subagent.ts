import { getDb } from '../publishing/http';
import { CalendarPivotProposal } from './types';
import { requireCompanyId, SocialDomainError } from '../tenant-scope';

export class CalendarSubagent {
    /**
     * Inspects current month's calendar status, separating past completed posts from upcoming slots.
     */
    static async getCalendarStatus(companyId: string, projectId: string, referenceDate: Date = new Date()) {
        requireCompanyId(companyId);
        const startOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
        const endOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0, 23, 59, 59);
        const currentDay = referenceDate.getDate();

        const posts = await (getDb() as any).socialPost.findMany({
            where: {
                companyId,
                projectId,
                scheduledFor: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
            },
            orderBy: { scheduledFor: 'asc' },
            include: {
                socialAccount: { select: { platform: true, username: true } },
            },
        });

        const pastPosts: any[] = [];
        const upcomingPosts: any[] = [];

        for (const post of posts) {
            const postDate = new Date(post.scheduledFor);
            if (postDate.getDate() < currentDay || post.status === 'published') {
                pastPosts.push(post);
            } else {
                upcomingPosts.push(post);
            }
        }

        return {
            currentDay,
            totalPostsThisMonth: posts.length,
            pastCount: pastPosts.length,
            upcomingCount: upcomingPosts.length,
            pastPosts: pastPosts.map((p) => ({
                id: p.id,
                title: p.title,
                scheduledFor: p.scheduledFor,
                status: p.status,
                platform: p.socialAccount?.platform || 'instagram',
            })),
            upcomingPosts: upcomingPosts.map((p) => ({
                id: p.id,
                title: p.title,
                scheduledFor: p.scheduledFor,
                status: p.status,
                platform: p.socialAccount?.platform || 'instagram',
            })),
        };
    }

    /**
     * Date range a pivot would cover: from `fromDay` (never before today) to the end of the month. Days before it
     * are never touched. Slot content is written by the calendar agents, not here.
     */
    static planCalendarPivot(
        companyId: string,
        projectId: string,
        options: { fromDay?: number; newWinningFormat: string; pivotReason: string },
        now: Date = new Date(),
    ): CalendarPivotProposal {
        requireCompanyId(companyId);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const requested = Math.floor(Number(options.fromDay) || now.getDate());
        const fromDay = Math.min(lastDayOfMonth, Math.max(now.getDate(), requested));
        return {
            projectId,
            pivotReason: options.pivotReason,
            fromDay,
            toDay: lastDayOfMonth,
            targetMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
            newWinningFormat: options.newWinningFormat,
            proposedSlots: [],
        };
    }

    /**
     * Applying a pivot regenerates the remaining calendar pieces with the four-agent calendar engine
     * (PRODUCTION_READINESS_PLAN P3/P4). Until that lands this refuses honestly instead of writing placeholder posts.
     */
    static async executeCalendarPivot(companyId: string, _projectId: string, proposal: CalendarPivotProposal): Promise<never> {
        requireCompanyId(companyId);
        throw new SocialDomainError(
            'CALENDAR_PIVOT_UNAVAILABLE',
            501,
            `Automatic calendar pivots are not available yet. Open the calendar and use "AI Autopilot Rewrite" on pieces from day ${proposal.fromDay}.`,
        );
    }
}
