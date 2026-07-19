'use strict';

/**
 * Employee Dashboard Controller
 * Returns only data relevant to the currently logged-in employee.
 */

exports.getDashboardStats = async (req, res) => {
    try {
        const userId = req.user.id; // use id not _id for Prisma

        const Task = req.prisma.task;
        const Project = req.prisma.project;
        const Attendance = req.prisma.attendance;
        const Leave = req.prisma.leave;
        const User = req.prisma.user;
        const Holiday = req.prisma.holiday;

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        
        // Run all queries in parallel for speed
        const [
            myTasks,
            myProjects,
            todayAttendance,
            activeLeaves,
            profileUser,
            upcomingHolidays,
            monthAttendance,
            allMyLeaves,
        ] = await Promise.all([
            // My tasks
            Task.findMany({ 
                where: { 
                    assigneeId: userId,
                    deletedAt: null 
                },
                include: { project: { select: { id: true, name: true } } },
                orderBy: { dueDate: 'asc' },
                take: 20
            }),

            // Projects I have tasks in (no limit for stats)
            Project.findMany({ 
                where: { 
                    OR: [
                        { ownerId: userId },
                        { memberIds: { has: userId } },
                        { tasks: { some: { assigneeId: userId } } }
                    ],
                    status: { not: 'cancelled' },
                    deletedAt: null
                },
                orderBy: { updatedAt: 'desc' }
            }),

            // Today's attendance record
            Attendance.findFirst({ where: {
                employeeId: userId,
                date: todayStr
            } }),

            // Approved/pending leaves in the future
            Leave.findMany({
                where: {
                    employeeId: userId,
                    status: { in: ['approved', 'pending'] },
                    startDate: { gte: todayStr }
                },
                orderBy: { startDate: 'asc' },
                take: 5
            }).catch(() => []),

            // My profile (for leave balance & performance score)
            User.findUnique({ 
                where: { id: userId },
                select: { leaveBalance: true, performanceScore: true, name: true, role: true, department: true, designation: true, apiKeyEnabled: true, position: true }
            }),

            // Upcoming holidays
            Holiday.findMany({
                where: { date: { gte: new Date(todayStr) } },
                orderBy: { date: 'asc' },
                take: 5
            }).catch(() => []),

            // Attendance for current month
            Attendance.findMany({
                where: {
                    employeeId: userId,
                    date: { gte: monthStartStr, lte: todayStr }
                }
            }).catch(() => []),

            // All my leaves for stats
            Leave.findMany({
                where: { employeeId: userId }
            }).catch(() => []),
        ]);

        const mappedTasks = myTasks.map(t => ({
            ...t,
            projectId: t.project ? { id: t.projectId, name: t.project.name } : t.projectId,
            project: undefined // remove the original Prisma populated field to avoid confusion
        }));

        const pendingTasks = mappedTasks.filter(t => t.status !== 'done');
        const completedTasks = mappedTasks.filter(t => t.status === 'done');
        const overdueTasks = pendingTasks.filter(t => t.dueDate && new Date(t.dueDate) < now);

        const activeProjects = myProjects.filter(p => p.status === 'in_progress' || p.status === 'active');

        // Add role to each project
        const projectsWithRoles = myProjects.map(p => ({
            ...p,
            role: 'Member'
        }));

        // Attendance Stats
        const attStats = {
            present: monthAttendance.filter(a => a.status === 'present').length,
            late: monthAttendance.filter(a => a.status === 'late').length,
            absent: monthAttendance.filter(a => a.status === 'absent').length,
            halfDay: monthAttendance.filter(a => a.status === 'half_day').length,
            totalDays: monthAttendance.length
        };

        // Leave Stats
        const leaveStats = {
            used: allMyLeaves.filter(l => l.status === 'approved').reduce((acc, curr) => acc + (curr.days || 1), 0),
            pending: allMyLeaves.filter(l => l.status === 'pending').length,
            balance: profileUser?.leaveBalance || 0,
            upcoming: activeLeaves,
        };

        return res.json({
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
            },
            leaves: leaveStats,
            holidays: upcomingHolidays,
            performanceScore: profileUser?.performanceScore ?? 100,
            profile: {
                name: profileUser?.name,
                role: profileUser?.role,
                department: profileUser?.department,
                position: profileUser?.designation?.name || profileUser?.position,
                apiKeyEnabled: profileUser?.apiKeyEnabled || false,
            }
        });
    } catch (error) {
        console.error('Employee dashboard error:', error);
        res.status(500).json({ error: 'Failed to load employee dashboard', details: String(error) });
    }
};
