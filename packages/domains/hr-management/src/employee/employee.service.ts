import { prisma } from '@workspace/db';
import { PrismaClient } from '@workspace/db';

export class EmployeeService {

  constructor() {
  }

  async getDashboardStats(userId: string) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const [
      myTasks,
      myProjects,
      todayAttendance,
      activeLeaves,
      profileUser,
      upcomingHolidays,
      monthAttendance,
      allMyLeaves,
      completedPointTasksData,
    ] = await Promise.all([
      prisma.task.findMany({
        where: {
          assigneeId: userId,
          deletedAt: null,
        },
        include: {
          project: { select: { id: true, name: true } },
          workLogs_TaskWorkLogs: {
            where: { status: 'rejected' },
            select: { id: true },
          },
        },
        orderBy: { dueDate: 'asc' },
        take: 20,
      }),

      prisma.project.findMany({
        where: {
          OR: [
            { ownerId: userId },
            { memberIds: { has: userId } },
            { tasks: { some: { assigneeId: userId } } },
          ],
          status: { not: 'cancelled' },
          deletedAt: null,
        },
        orderBy: { updatedAt: 'desc' },
      }),

      prisma.attendance.findFirst({
        where: {
          employeeId: userId,
          date: todayStr,
        },
      }),

      prisma.leave.findMany({
        where: {
          employeeId: userId,
          status: { in: ['approved', 'pending'] },
          startDate: { gte: todayStr },
        },
        orderBy: { startDate: 'asc' },
        take: 5,
      }).catch(() => []),

      prisma.user.findUnique({
        where: { id: userId },
        select: {
          leaveBalance: true,
          performanceScore: true,
          name: true,
          role: true,
          department: true,
          designation: true,
          apiKeyEnabled: true,
          position: true,
        },
      }),

      prisma.holiday.findMany({
        where: { date: { gte: new Date(todayStr) } },
        orderBy: { date: 'asc' },
        take: 5,
      }).catch(() => []),

      prisma.attendance.findMany({
        where: {
          employeeId: userId,
          date: { gte: monthStartStr, lte: todayStr },
        },
      }).catch(() => []),

      prisma.leave.findMany({
        where: { employeeId: userId },
      }).catch(() => []),

      prisma.task.findMany({
        where: {
          assigneeId: userId,
          status: 'done',
          deletedAt: null,
        },
        select: { updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }).catch(() => []),
    ]);

    const mappedTasks = myTasks.map((t: any) => ({
      ...t,
      projectId: t.project ? { id: t.projectId, name: t.project.name } : t.projectId,
      project: undefined,
    }));

    const pendingTasks = mappedTasks.filter((t: any) => t.status !== 'done');
    const completedTasks = mappedTasks.filter((t: any) => t.status === 'done');
    const overdueTasks = pendingTasks.filter(
      (t: any) => t.dueDate && new Date(t.dueDate) < now
    );

    const activeProjects = myProjects.filter(
      (p: any) => p.status === 'in_progress' || p.status === 'active'
    );

    const projectsWithRoles = myProjects.map((p: any) => ({
      ...p,
      role: 'Member',
    }));

    const attStats = {
      present: monthAttendance.filter((a: any) => a.status === 'present').length,
      late: monthAttendance.filter((a: any) => a.status === 'late').length,
      absent: monthAttendance.filter((a: any) => a.status === 'absent').length,
      halfDay: monthAttendance.filter((a: any) => a.status === 'half_day').length,
      totalDays: monthAttendance.length,
    };

    const leaveStats = {
      used: allMyLeaves
        .filter((l: any) => l.status === 'approved')
        .reduce((acc: number, curr: any) => acc + (curr.days || 1), 0),
      pending: allMyLeaves.filter((l: any) => l.status === 'pending').length,
      balance: profileUser?.leaveBalance || 0,
      upcoming: activeLeaves,
    };

    const score = profileUser?.performanceScore ?? 100;
    const nowMs = now.getTime();
    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
    const completedPointTasks = (completedPointTasksData as any[] || []).map(
      (t) => new Date(t.completedAt).getTime()
    );
    const pointsHistory = [];
    for (let i = 7; i >= 0; i--) {
      const periodEnd = nowMs - i * ONE_WEEK;
      const pointsEarnedSince = completedPointTasks.filter(
        (t) => t > periodEnd
      ).length;
      pointsHistory.push({
        period: new Date(periodEnd).toISOString(),
        Points: Math.max(100, score - pointsEarnedSince),
      });
    }

    return {
      tasks: {
        total: myTasks.length,
        pending: pendingTasks.length,
        completed: completedTasks.length,
        overdue: overdueTasks.length,
        list: pendingTasks.slice(0, 8),
      },
      projects: {
        total: myProjects.length,
        active: activeProjects.length,
        list: projectsWithRoles.slice(0, 6),
      },
      attendance: {
        today: todayAttendance || null,
        status: todayAttendance?.status || 'not_checked_in',
        stats: attStats,
        monthly: monthAttendance,
      },
      leaves: leaveStats,
      holidays: upcomingHolidays,
      performanceScore: score,
      pointsHistory: pointsHistory,
      profile: {
        name: profileUser?.name,
        role: profileUser?.role,
        department: profileUser?.department,
        position: (profileUser?.designation as any)?.name || profileUser?.position,
        apiKeyEnabled: profileUser?.apiKeyEnabled || false,
      },
    };
  }

  async getDesignations(search?: string) {
    const whereClause: any = {
      // NOTE: Proxy injects { companyId: current } implicitly.
      // If global designations are needed, they should be queried via a non-proxied client or Prisma raw.
      // But we leave the base structure here without breaking the signature.
    };

    if (search) {
      whereClause.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    return prisma.designation.findMany({
      where: whereClause,
      orderBy: [{ usageCount: 'desc' }, { name: 'asc' }],
    });
  }

  async createDesignation(name: string, category: string = 'general') {
    if (!name || name.trim().length === 0) throw new Error('Designation name is required');

    const existing = await prisma.designation.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: 'insensitive',
        }
      },
    });

    if (existing) {
      const err: any = new Error('A designation with this name already exists');
      err.data = existing;
      throw err;
    }

    return prisma.designation.create({
      data: {
        name: name.trim(),
        category,
        isCustom: true,
      },
    });
  }
}
