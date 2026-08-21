import { prisma } from '@workspace/db';
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';

export class PerformanceService {
    /**
     * Parses period strings like 'Q1 2025', '2025-03', 'Annual 2025' into date ranges.
     */
    static parsePeriod(period: string) {
        const now = new Date();
        let start: Date, end: Date;

        // Quarter: Q1 2025
        const qMatch = period.match(/Q([1-4])\s+(\d{4})/i);
        if (qMatch) {
            const quarter = parseInt(qMatch[1]);
            const year = parseInt(qMatch[2]);
            const firstMonth = (quarter - 1) * 3;
            start = new Date(year, firstMonth, 1);
            end = endOfQuarter(start);
            return { start, end };
        }

        // Annual: Annual 2025
        const aMatch = period.match(/Annual\s+(\d{4})/i);
        if (aMatch) {
            const year = parseInt(aMatch[1]);
            start = startOfYear(new Date(year, 0, 1));
            end = endOfYear(start);
            return { start, end };
        }

        // Month: 2025-03
        const mMatch = period.match(/(\d{4})-(\d{2})/);
        if (mMatch) {
            start = startOfMonth(new Date(parseInt(mMatch[1]), parseInt(mMatch[2]) - 1, 1));
            end = endOfMonth(start);
            return { start, end };
        }

        // Default to current month if unparseable
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }

    async getPerformanceInsights(employeeId: string, period: string) {
        const { start, end } = PerformanceService.parsePeriod(period);
        
        const Task = prisma.task;
        const Goal = prisma.goal;
        const Attendance = prisma.attendance;

        // 1. Task Metrics
        const tasks = await Task.findMany({
            where: {
                assigneeId: employeeId,
                OR: [
                    { createdAt: { gte: start, lte: end } },
                    { updatedAt: { gte: start, lte: end } }
                ]
            }
        });

        const completedTasks = tasks.filter((t: any) => t.status === 'done' || t.status === 'completed');
        const onTimeTasks = completedTasks.filter((t: any) => t.updatedAt <= t.dueDate);
        
        const taskMetrics = {
            total: tasks.length,
            completed: completedTasks.length,
            completionRate: tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
            onTimeRate: completedTasks.length ? Math.round((onTimeTasks.length / completedTasks.length) * 100) : 0,
        };

        // 2. Goal Metrics
        const goals = await Goal.findMany({
            where: {
                ownerId: employeeId,
                createdAt: { lte: end },
                dueDate: { gte: start }
            }
        });

        const avgProgress = goals.length 
            ? Math.round(goals.reduce((acc: number, g: any) => acc + (g.progress || 0), 0) / goals.length) 
            : 0;

        const goalMetrics = {
            count: goals.length,
            averageProgress: avgProgress,
            completed: goals.filter((g: any) => g.status === 'completed').length
        };

        // 3. Attendance Metrics
        const attendanceRecords = await Attendance.findMany({
            where: {
                employeeId: employeeId,
                date: { gte: start.toISOString().split('T')[0], lte: end.toISOString().split('T')[0] }
            }
        });

        const presentDays = attendanceRecords.filter((a: any) => ['present', 'late', 'half_day'].includes(a.status)).length;
        const lateDays = attendanceRecords.filter((a: any) => a.status === 'late').length;

        const attendanceMetrics = {
            recordsFound: attendanceRecords.length,
            presentDays,
            lateDays,
            consistency: attendanceRecords.length ? Math.round((presentDays / attendanceRecords.length) * 100) : 100
        };

        // 4. Final Aggregated Score (Weighted)
        // Task Completion: 40%, Goal Progress: 40%, Attendance: 20%
        const score = (taskMetrics.completionRate * 0.4) + 
                      (goalMetrics.averageProgress * 0.4) + 
                      (attendanceMetrics.consistency * 0.2);

        return {
            periodRange: { start, end },
            taskMetrics,
            goalMetrics,
            attendanceMetrics,
            overallScore: Math.round(score),
            recommendation: PerformanceService.getRecommendation(score)
        };
    }

    static getRecommendation(score: number) {
        if (score >= 90) return 'Exceptional performance. Consider for promotion or leadership roles.';
        if (score >= 75) return 'Strong contributor. Meeting and exceeding most expectations.';
        if (score >= 50) return 'Steady performer. Focus on consistency in task delivery.';
        return 'Performance needs improvement. Recommend targeted training and closer manager support.';
    }
}
