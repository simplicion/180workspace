exports.submitWorkLog = async (req, res, next) => { 
    try {
        const WorkLog = req.prisma.workLog;
        const { projectId, moduleId, taskId, description, hoursSpent, workDate, links, attachmentUrls, voiceMessageUrl, isWorkCompleted, status, reviewComment } = req.body;
        
        const workLog = await WorkLog.create({
            data: {
                userId: req.user.id,
                projectId,
                moduleId,
                taskId,
                description,
                hoursSpent: hoursSpent ? parseFloat(hoursSpent) : 0,
                workDate: workDate ? new Date(workDate) : undefined,
                links: links || [],
                attachmentUrls: attachmentUrls || [],
                voiceMessageUrl,
                isWorkCompleted: isWorkCompleted || false,
                status: status || 'pending',
                reviewComment: reviewComment || ''
            }
        });
        res.status(201).json({ success: true, workLog });
    } catch (err) {
        next(err);
    }
};
exports.getMyLogs = async (req, res, next) => { res.json({ success: true, data: [] }); };
exports.getAllLogs = async (req, res, next) => { res.json({ success: true, data: [] }); };
exports.getPendingReviews = async (req, res, next) => { res.json({ success: true, data: [] }); };
exports.getDashboardStats = async (req, res, next) => { res.json({ success: true, data: {} }); };
exports.reviewWorkLog = async (req, res, next) => { res.json({ success: true, data: {} }); };
