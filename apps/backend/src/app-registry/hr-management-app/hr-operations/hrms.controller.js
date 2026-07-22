const { format, startOfMonth, endOfMonth, getWeekNumber, getMonthName } = require('../../../system-configs/utils/dateHelpers.js');

exports.getDashboard = async (req, res, next) => {
    try {
        const User = req.prisma.user;
        const Project = req.prisma.project;
        const Task = req.prisma.task;
        const Attendance = req.prisma.attendance;
        const Salary = req.prisma.salary;
        const Client = req.prisma.client;
        const Expense = req.prisma.expense;

        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

        // Last month date range for project comparison
        const lastMonthStart = new Date();
        lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
        lastMonthStart.setDate(1);
        lastMonthStart.setHours(0, 0, 0, 0);
        const lastMonthEnd = new Date(lastMonthStart);
        lastMonthEnd.setMonth(lastMonthEnd.getMonth() + 1);
        lastMonthEnd.setDate(0);
        lastMonthEnd.setHours(23, 59, 59, 999);

        const companyWhere = req.user?.companyId ? { companyId: req.user.companyId } : {};

        const [
            totalEmployees, activeEmployees,
            totalProjects, activeProjects,
            totalTasks, pendingTasks,
            todayAttendance, totalClients,
            prevMonthActive, pendingExpenses,
        ] = await Promise.all([
            User.count({ where: { ...companyWhere, role: 'employee' } }),
            User.count({ where: { ...companyWhere, role: 'employee', isActive: true } }),
            Project.count({ where: companyWhere }),
            Project.count({ where: { ...companyWhere, status: 'in_progress' } }),
            Task.count({ where: companyWhere }),
            Task.count({ where: { ...companyWhere, status: { in: ['todo', 'in_progress'] } } }),
            Attendance.count({ where: { ...companyWhere, date: today, 
                status: { in: ['present', 'late', 'work_from_home', 'half_day'] } } }),
            Client.count({ where: companyWhere }),
            Project.count({ where: { ...companyWhere, status: 'in_progress', updatedAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
            Expense.count({ where: { ...companyWhere, status: 'pending' } })
        ]);

        const pendingSalaries = 0; // Salary tracking for monthly payouts is not fully migrated

        // Attendance rate for today
        const attendanceRate = totalEmployees > 0
            ? Math.round((todayAttendance / activeEmployees) * 100)
            : 0;

        res.json({
            employees: { total: totalEmployees, active: activeEmployees },
            projects: { total: totalProjects, active: activeProjects, prevMonthActive },
            tasks: { total: totalTasks, pending: pendingTasks },
            attendance: { today: todayAttendance, rate: attendanceRate },
            clients: { total: totalClients },
            salary: { pendingThisMonth: pendingSalaries },
            expenses: { pending: pendingExpenses },
        });
    } catch (err) { next(err); }
};

exports.getAttendanceReport = async (req, res, next) => {
    try {
        const Attendance = req.prisma.attendance;
        const { month } = req.query;
        if (!month) return res.status(400).json({ error: 'month param required (YYYY-MM)' });

        const companyWhere = req.user?.companyId ? { companyId: req.user.companyId } : {};

        const stats = await Attendance.groupBy({
            by: ['status'],
            where: { ...companyWhere, date: { startsWith: month } },
            _count: { status: true }
        });
        const summary = stats.reduce((acc, s) => { acc[s.status] = s._count.status; return acc; }, {});
        res.json({ month, summary });
    } catch (err) { next(err); }
};

exports.getSalaryReport = async (req, res, next) => {
    try {
        const Salary = req.prisma.salary;
        const { month } = req.query;
        if (!month) return res.status(400).json({ error: 'month param required (YYYY-MM)' });

        const companyWhere = req.user?.companyId ? { companyId: req.user.companyId } : {};

        const salaries = await Salary.findMany({
            where: companyWhere,
            include: {
                employee: {
                    select: { name: true, id: true }
                }
            }
        });

        const totalNet = salaries.reduce((sum, s) => sum + (s.amount || 0), 0);
        const paid = 0;

        res.json({ month, salaries: [], totalNet, totalCount: salaries.length, paid });
    } catch (err) { next(err); }
};

exports.getWeeklyTrends = async (req, res, next) => {
    try {
        const range = req.query.range || '7';
        const grouping = (req.query.grouping || 'weekly').toLowerCase();
        
        console.log(`[Trends] Fetching with range: ${range}, grouping: ${grouping}`);
        
        let limitDays = range === 'all' ? 3650 : (parseInt(range) || 7);
        
        // If grouping is monthly/weekly but range is too small, expand it to provide context
        if (grouping === 'monthly' && limitDays < 180) limitDays = 180;
        if (grouping === 'weekly' && limitDays < 30) limitDays = 30;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - limitDays);
        startDate.setHours(0, 0, 0, 0);

        const Project = req.prisma.project;
        const Task = req.prisma.task;

        const companyWhere = req.user?.companyId ? { companyId: req.user.companyId } : {};

        const [projects, tasks] = await Promise.all([
            Project.findMany({
                where: { ...companyWhere, createdAt: { gte: startDate } },
                select: { createdAt: true }
            }),
            Task.findMany({
                where: { ...companyWhere, createdAt: { gte: startDate } },
                select: { createdAt: true }
            })
        ]);

        const projectMap = {};
        const taskMap = {};
        
        const formatDate = (date, grp) => {
            if (grp === 'weekly') {
                const weekNum = getWeekNumber(date);
                return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
            }
            if (grp === 'monthly') return date.toISOString().slice(0, 7);
            return date.toISOString().slice(0, 10);
        };

        for (const p of projects) {
            const key = formatDate(p.createdAt, grouping);
            projectMap[key] = (projectMap[key] || 0) + 1;
        }
        for (const t of tasks) {
            const key = formatDate(t.createdAt, grouping);
            taskMap[key] = (taskMap[key] || 0) + 1;
        }

        const chartData = [];
        const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        if (grouping === 'weekly') {
            const limitWeeks = Math.ceil(limitDays / 7);
            for (let i = limitWeeks; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - (i * 7));
                const weekNum = getWeekNumber(date);
                const weekKey = `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
                
                chartData.push({
                    name: limitWeeks <= 1 ? `Week ${weekNum}` : `W${weekNum}`,
                    projects: projectMap[weekKey] || 0,
                    tasks: taskMap[weekKey] || 0,
                    key: weekKey
                });
            }
        } else if (grouping === 'monthly') {
            const limitMonths = Math.min(Math.ceil(limitDays / 30), 24); // Cap for sanity
            for (let i = limitMonths; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                
                chartData.push({
                    name: getMonthName(date),
                    projects: projectMap[monthKey] || 0,
                    tasks: taskMap[monthKey] || 0,
                    key: monthKey
                });
            }
        } else {
            for (let i = limitDays - 1; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];

                chartData.push({
                    name: limitDays <= 7 ? daysShort[date.getDay()] : format(date, 'MMM dd'),
                    projects: projectMap[dateStr] || 0,
                    tasks: taskMap[dateStr] || 0,
                    key: dateStr
                });
            }
        }

        res.json(chartData);
    } catch (err) { next(err); }
};


exports.getCEOInsights = async (req, res, next) => {
    try {
        const Invoice = req.prisma.invoice;
        const Expense = req.prisma.expense;
        const Salary = req.prisma.salary;
        const Task = req.prisma.task;
        const User = req.prisma.user;
        const Review = req.prisma.review;
        const Asset = req.prisma.asset;

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // 1. Optimized Financial Trajectory (Bulk queries instead of loop)
        const startOfTrajectory = new Date();
        startOfTrajectory.setMonth(startOfTrajectory.getMonth() - 6);
        startOfTrajectory.setDate(1);
        startOfTrajectory.setHours(0, 0, 0, 0);
        const monthStrLimit = startOfTrajectory.toISOString().slice(0, 7);

        const companyWhere = req.user?.companyId ? { companyId: req.user.companyId } : {};

        const [invoices, expenses, salaries, assets] = await Promise.all([
            Invoice.findMany({
                where: { ...companyWhere, issueDate: { gte: startOfTrajectory }, status: 'paid' },
                select: { id: true, issueDate: true, totalAmount: true, invoiceNumber: true, clientName: true, client: { select: { name: true } } }
            }),
            Expense.findMany({
                where: { ...companyWhere, date: { gte: startOfTrajectory }, status: 'approved' },
                select: { id: true, date: true, amount: true, title: true, employee: { select: { name: true } }, project: { select: { name: true } } }
            }),
            Salary.findMany({
                where: { ...companyWhere, effectiveDate: { gte: startOfTrajectory }, status: 'active' },
                select: { id: true, effectiveDate: true, amount: true, employee: { select: { name: true } } }
            }),
            Asset.findMany({
                where: { ...companyWhere, createdAt: { gte: startOfTrajectory }, cost: { gt: 0 } },
                select: { id: true, createdAt: true, cost: true, name: true, provider: true, owner: { select: { name: true } } }
            })
        ]);

        const revMap = {}, exMap = {}, salMap = {};
        const transactions = [];

        for (const inv of invoices) {
            const m = inv.issueDate.toISOString().slice(0, 7);
            revMap[m] = (revMap[m] || 0) + (inv.totalAmount || 0);
            transactions.push({
                id: inv.id,
                type: 'income',
                date: inv.issueDate.toISOString(),
                amount: inv.totalAmount || 0,
                what: `Invoice #${inv.invoiceNumber}`,
                who: inv.client?.name || inv.clientName || 'Unknown Client',
                where: 'Sales',
                url: `/dashboard/invoices`
            });
        }
        for (const ex of expenses) {
            const m = ex.date.toISOString().slice(0, 7);
            exMap[m] = (exMap[m] || 0) + (ex.amount || 0);
            transactions.push({
                id: ex.id,
                type: 'expense',
                date: ex.date.toISOString(),
                amount: ex.amount || 0,
                what: ex.title,
                who: ex.employee?.name || 'Employee',
                where: ex.project?.name || 'General',
                url: `/dashboard/expenses`
            });
        }
        for (const sal of salaries) {
            const m = sal.effectiveDate.toISOString().slice(0, 7);
            salMap[m] = (salMap[m] || 0) + (sal.amount || 0);
            transactions.push({
                id: sal.id,
                type: 'salary',
                date: sal.effectiveDate.toISOString(),
                amount: sal.amount || 0,
                what: 'Salary Payment',
                who: sal.employee?.name || 'Employee',
                where: 'HR / Payroll',
                url: `/dashboard/hr`
            });
        }
        for (const ast of assets) {
            const m = ast.createdAt.toISOString().slice(0, 7);
            exMap[m] = (exMap[m] || 0) + (ast.cost || 0);
            transactions.push({
                id: ast.id,
                type: 'asset',
                date: ast.createdAt.toISOString(),
                amount: ast.cost || 0,
                what: ast.name,
                who: ast.owner?.name || 'Company',
                where: ast.provider || 'Internal',
                url: `/dashboard/assets`
            });
        }
        
        const revenueData = Object.keys(revMap).map(k => ({ _id: k, total: revMap[k] }));
        const expenseData = Object.keys(exMap).map(k => ({ _id: k, total: exMap[k] }));
        const salaryData = Object.keys(salMap).map(k => ({ _id: k, total: salMap[k] }));

        const financialData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthLabel = months[date.getMonth()];
            const monthKey = date.toISOString().slice(0, 7);

            const rev = revenueData.find(r => r._id === monthKey)?.total || 0;
            const ex = expenseData.find(e => e._id === monthKey)?.total || 0;
            const sal = salaryData.find(s => s._id === monthKey)?.total || 0;

            financialData.push({
                name: monthLabel,
                rev: rev,
                cost: ex + sal
            });
        }

        // 2. Task Velocity
        const [todo, inProgress, inReview, done] = await Promise.all([
            Task.count({ where: { ...companyWhere, status: 'todo' } }),
            Task.count({ where: { ...companyWhere, status: 'in_progress' } }),
            Task.count({ where: { ...companyWhere, status: 'in_review' } }),
            Task.count({ where: { ...companyWhere, status: 'done' } })
        ]);

        const taskVelocity = [
            { name: 'To Do', completed: 0, added: todo },
            { name: 'In Progress', completed: 0, added: inProgress },
            { name: 'In Review', completed: 0, added: inReview },
            { name: 'Done', completed: done, added: 0 }
        ];

        // 3. Performance Metrics
        const [totalUser, inactiveUser, reviews] = await Promise.all([
            User.count({ where: { ...companyWhere, role: 'employee' } }),
            User.count({ where: { ...companyWhere, role: 'employee', isActive: false } }),
            Review.aggregate({
                where: { ...companyWhere, overallRating: { not: null } },
                _avg: { overallRating: true }
            }).then(res => [{ avg: res._avg.overallRating }])
        ]);

        const retentionRate = totalUser > 0 ? Math.round(((totalUser - inactiveUser) / totalUser) * 100) : 100;
        const satisfactionScore = reviews[0]?.avg ? Math.round((reviews[0].avg / 5) * 100) : 0;

        const currentMonthData = financialData[financialData.length - 1];
        const previousMonthData = financialData[financialData.length - 2];
        
        const mrr = currentMonthData?.rev || previousMonthData?.rev || 0;
        const burnRate = currentMonthData?.cost || previousMonthData?.cost || 0;
        let runwayMonths = '12+ mo';
        if (burnRate > 0) {
            runwayMonths = mrr > burnRate ? 'Infinite' : (5000000 / burnRate).toFixed(1) + ' mo'; // Mock runway
        }

        res.json({
            financialTrajectory: financialData,
            transactions,
            taskVelocity,
            retentionRate,
            satisfactionScore,
            mrr,
            burnRate,
            runway: runwayMonths
        });
    } catch (err) { next(err); }
};

exports.getAttendanceTrend = async (req, res, next) => {
    try {
        const Attendance = req.prisma.attendance;
        const User = req.prisma.user;
        const range = req.query.range || '7';
        const grouping = (req.query.grouping || 'weekly').toLowerCase();

        console.log(`[AttendanceTrend] Fetching with range: ${range}, grouping: ${grouping}`);

        let limitDays = range === 'all' ? 3650 : (parseInt(range) || 7);
        
        // If grouping is monthly but range is too small, expand range to see context
        if (grouping === 'monthly' && limitDays < 180) limitDays = 180;
        if (grouping === 'weekly' && limitDays < 30) limitDays = 30;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - limitDays);
        startDate.setHours(0, 0, 0, 0);
        
        const startDateStr = startDate.toISOString().split('T')[0];
        const companyWhere = req.user?.companyId ? { companyId: req.user.companyId } : {};
        const activeEmployees = await User.count({ where: { ...companyWhere, role: 'employee', isActive: true } });

        const attendances = await Attendance.findMany({
            where: { ...companyWhere, date: { gte: startDateStr } },
            select: { date: true, status: true },
            orderBy: { date: 'asc' }
        });

        const presentMap = {};
        const absentMap = {};
        
        const formatAttDate = (dateStr, grp) => {
            if (grp === 'weekly') {
                const weekNum = getWeekNumber(new Date(dateStr));
                return `${dateStr.slice(0,4)}-W${String(weekNum).padStart(2, '0')}`;
            }
            if (grp === 'monthly') return dateStr.slice(0, 7);
            return dateStr;
        };

        for (const att of attendances) {
            const key = formatAttDate(att.date, grouping);
            if (!presentMap[key]) presentMap[key] = 0;
            if (!absentMap[key]) absentMap[key] = 0;
            
            if (['present', 'late', 'work_from_home', 'half_day'].includes(att.status)) {
                presentMap[key]++;
            } else if (att.status === 'absent') {
                absentMap[key]++;
            }
        }

        const trendData = [];
        const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        if (grouping === 'weekly') {
            const limitWeeks = Math.ceil(limitDays / 7);
            for (let i = limitWeeks; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - (i * 7));
                const weekNum = getWeekNumber(date);
                const weekKey = `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
                
                trendData.push({
                    date: weekKey,
                    display: limitWeeks <= 1 ? `Week ${weekNum}` : `W${weekNum}`,
                    present: presentMap[weekKey] || 0,
                    absent: absentMap[weekKey] || 0,
                    total: activeEmployees * 7
                });
            }
        } else if (grouping === 'monthly') {
            const limitMonths = Math.min(Math.ceil(limitDays / 30), 24);
            for (let i = limitMonths; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                
                trendData.push({
                    date: monthKey,
                    display: getMonthName(date),
                    present: presentMap[monthKey] || 0,
                    absent: absentMap[monthKey] || 0,
                    total: activeEmployees * 30
                });
            }
        } else {
            for (let i = limitDays - 1; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                
                trendData.push({
                    date: dateStr,
                    display: limitDays <= 7 ? daysShort[date.getDay()] : format(date, 'MMM dd'),
                    present: presentMap[dateStr] || 0,
                    absent: absentMap[dateStr] || 0,
                    total: activeEmployees
                });
            }
        }

        res.json(trendData);
    } catch (err) { next(err); }
};
