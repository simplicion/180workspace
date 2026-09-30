import { prisma } from '@workspace/db';
import { CalendarPivotProposal } from './types';
import { requireCompanyId } from '../tenant-scope';

export class CalendarSubagent {
    /**
     * Inspects current month's calendar status, separating past completed posts from upcoming slots.
     */
    static async getCalendarStatus(companyId: string, projectId: string, referenceDate: Date = new Date()) {
        requireCompanyId(companyId);
        const startOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
        const endOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0, 23, 59, 59);
        const currentDay = referenceDate.getDate();

        const posts = await (prisma as any).socialPost.findMany({
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
     * Prepares a date-aware calendar pivot from a specific day (e.g. day 15) to end of month.
     * Leaves all days before `fromDay` completely untouched.
     */
    static async planCalendarPivot(
        companyId: string,
        projectId: string,
        options: {
            fromDay?: number;
            newWinningFormat: string;
            pivotReason: string;
            frequencyPerWeek?: number;
        }
    ): Promise<CalendarPivotProposal> {
        requireCompanyId(companyId);
        const now = new Date();
        const currentDay = now.getDate();
        const fromDay = options.fromDay ?? currentDay;
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const proposedSlots: CalendarPivotProposal['proposedSlots'] = [];
        const step = Math.max(1, Math.floor(7 / (options.frequencyPerWeek || 3)));

        for (let day = fromDay; day <= lastDayOfMonth; day += step) {
            const slotDate = new Date(now.getFullYear(), now.getMonth(), day, 14, 0, 0);
            proposedSlots.push({
                date: slotDate.toISOString(),
                title: `${options.newWinningFormat} Breakdown #${proposedSlots.length + 1}`,
                format: options.newWinningFormat,
                platform: 'instagram',
                contentPillar: 'Growth & Authority',
            });
        }

        return {
            projectId,
            pivotReason: options.pivotReason,
            fromDay,
            toDay: lastDayOfMonth,
            targetMonth: monthKey,
            newWinningFormat: options.newWinningFormat,
            proposedSlots,
        };
    }

    /**
     * Executes the calendar pivot by inserting or updating planned content pieces for the upcoming days.
     */
    static async executeCalendarPivot(companyId: string, projectId: string, proposal: CalendarPivotProposal): Promise<{ count: number; createdPosts: any[] }> {
        requireCompanyId(companyId);
        const createdPosts: any[] = [];

        for (const slot of proposal.proposedSlots) {
            const post = await (prisma as any).socialPost.create({
                data: {
                    companyId,
                    projectId,
                    title: slot.title,
                    content: `[Planned: ${slot.format}] In-depth viral breakdown based on latest performance data.`,
                    status: 'draft',
                    scheduledFor: new Date(slot.date),
                    metadata: {
                        plannedByAgent: '180_manager',
                        format: slot.format,
                        contentPillar: slot.contentPillar,
                    },
                },
            });
            createdPosts.push(post);
        }

        return {
            count: createdPosts.length,
            createdPosts,
        };
    }
}
