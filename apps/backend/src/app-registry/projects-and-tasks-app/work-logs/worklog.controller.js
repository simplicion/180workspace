exports.submitWorkLog = async (req, res, next) => { 
    try {
        const WorkLog = req.prisma.workLog;
        const { projectId, moduleId, taskId, description, hoursSpent, workDate, links, attachmentUrls, voiceMessageUrl, isWorkCompleted, status, reviewComment } = req.body;
        
        const workLog = await WorkLog.create({
            data: {
                userId: req.user.id,
                projectId,
                moduleId: moduleId || null,
                taskId: taskId || null,
                description,
                hoursSpent: hoursSpent ? parseFloat(hoursSpent) : 0,
                workDate: workDate ? new Date(workDate) : undefined,
                links: links || [],
                attachmentUrls: attachmentUrls || [],
                voiceMessageUrl,
                isWorkCompleted: isWorkCompleted || false,
                status: status || 'pending',
                reviewComment: reviewComment || ''
            },
            include: {
                user: { select: { id: true, name: true, photoUrl: true } },
                task: { select: { id: true, title: true } },
                module: { select: { id: true, title: true } }
            }
        });
        
        const mappedLog = {
            ...workLog,
            userId: workLog.user,
            taskId: workLog.task,
            moduleId: workLog.module
        };
        delete mappedLog.user;
        delete mappedLog.task;
        delete mappedLog.module;

        res.status(201).json({ success: true, workLog: mappedLog });
    } catch (err) {
        next(err);
    }
};

exports.getLogs = async (req, res, next) => {
    try {
        const { projectId } = req.query;
        if (!projectId) {
            return res.status(400).json({ success: false, message: 'projectId is required' });
        }
        
        const logs = await req.prisma.workLog.findMany({
            where: { projectId },
            include: {
                user: { select: { id: true, name: true, photoUrl: true } },
                task: { select: { id: true, title: true } },
                module: { select: { id: true, title: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        const mappedLogs = logs.map(log => {
            const mapped = {
                ...log,
                userId: log.user,
                taskId: log.task,
                moduleId: log.module
            };
            delete mapped.user;
            delete mapped.task;
            delete mapped.module;
            return mapped;
        });
        
        res.json({ success: true, logs: mappedLogs });
    } catch (err) {
        next(err);
    }
};

const mapLogs = (logs) => logs.map(log => {
    const mapped = {
        ...log,
        userId: log.user,
        taskId: log.task,
        moduleId: log.module
    };
    delete mapped.user;
    delete mapped.task;
    delete mapped.module;
    return mapped;
});

const getQueryFilters = (query) => {
    const { projectId, moduleId, userId, startDate, endDate } = query;
    const where = {};
    if (projectId) where.projectId = projectId;
    if (moduleId) where.moduleId = moduleId;
    if (userId) where.userId = userId;
    if (startDate && endDate) {
        // Use workDate (not createdAt) and include the full end day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        where.workDate = {
            gte: new Date(startDate),
            lte: endOfDay
        };
    }
    return where;
};

exports.getMyLogs = async (req, res, next) => {
    try {
        const where = { ...getQueryFilters(req.query), userId: req.user.id };
        const logs = await req.prisma.workLog.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, photoUrl: true } },
                task: { select: { id: true, title: true } },
                module: { select: { id: true, title: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, logs: mapLogs(logs) });
    } catch (err) {
        next(err);
    }
};

exports.getAllLogs = async (req, res, next) => {
    try {
        const where = getQueryFilters(req.query);
        const logs = await req.prisma.workLog.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, photoUrl: true } },
                task: { select: { id: true, title: true } },
                module: { select: { id: true, title: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, logs: mapLogs(logs) });
    } catch (err) {
        next(err);
    }
};

exports.getPendingReviews = async (req, res, next) => {
    try {
        const where = { ...getQueryFilters(req.query), status: 'pending' };
        const logs = await req.prisma.workLog.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, photoUrl: true } },
                task: { select: { id: true, title: true } },
                module: { select: { id: true, title: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, logs: mapLogs(logs) });
    } catch (err) {
        next(err);
    }
};

exports.getDashboardStats = async (req, res, next) => {
    try {
        const where = getQueryFilters(req.query);
        const { companyId } = req.user;
        
        // Fetch logs matching filters (with user info for Review History)
        const logs = await req.prisma.workLog.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, photoUrl: true } },
                task: { select: { id: true, title: true } },
                module: { select: { id: true, title: true } }
            },
            orderBy: { workDate: 'desc' }
        });

        // Summary stats
        const totalHours = logs.reduce((sum, log) => sum + (log.hoursSpent || 0), 0);
        const approved = logs.filter(l => l.status === 'approved').length;
        const pending = logs.filter(l => l.status === 'pending').length;
        const rejected = logs.filter(l => l.status === 'rejected').length;

        // Build chartData: aggregate hours by date
        const chartMap = {};
        logs.forEach(log => {
            const dateKey = log.workDate.toISOString().split('T')[0];
            chartMap[dateKey] = (chartMap[dateKey] || 0) + (log.hoursSpent || 0);
        });
        const chartData = Object.entries(chartMap)
            .map(([date, hours]) => ({ date, hours }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Filter options from company data
        const projects = await req.prisma.project.findMany({
            where: { companyId },
            select: { id: true, name: true }
        });

        const modules = await req.prisma.module.findMany({
            where: { project: { companyId } },
            select: { id: true, title: true, projectId: true }
        });

        const users = await req.prisma.user.findMany({
            where: { companyId },
            select: { id: true, name: true, photoUrl: true }
        });

        res.json({
            success: true,
            summary: { totalHours, approved, pending, rejected },
            chartData,
            logs: mapLogs(logs),
            filterOptions: {
                projects,
                modules: modules.map(m => ({ id: m.id, name: m.title, projectId: m.projectId })),
                users
            }
        });
    } catch (err) {
        next(err);
    }
};

exports.reviewWorkLog = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, reviewComment } = req.body;
        
        const workLog = await req.prisma.workLog.update({
            where: { id },
            data: { status, reviewComment }
        });
        
        res.json({ success: true, data: workLog });
    } catch (err) {
        next(err);
    }
};
