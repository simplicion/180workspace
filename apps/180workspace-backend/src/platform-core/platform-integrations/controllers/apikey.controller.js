'use strict';

const crypto = require('crypto');

/**
 * Generate a personal API key for the authenticated user.
 * Key is stored hashed (SHA-256) in DB; returned plain-text only once.
 */
exports.generateApiKey = async (req, res, next) => {
    try {
        const User = req.prisma.user;

        // Generate a cryptographically secure 40-char key with prefix
        const rawKey = `ims_${crypto.randomBytes(24).toString('hex')}`;
        const hashed = crypto.createHash('sha256').update(rawKey).digest('hex');

        let targetId = req.user.id;
        if (req.body.userId && ['admin', 'manager'].includes(req.user.role)) {
            targetId = req.body.userId;
        }

        await User.update({ where: { id: targetId }, data: {
            apiKey: hashed,
            apiKeyEnabled: true,
        } });

        res.json({
            message: 'API key generated successfully. Copy it now â€” it will not be shown again.',
            apiKey: rawKey,
            prefix: rawKey.slice(0, 12) + 'â€¦',
        });
    } catch (err) { next(err); }
};

/**
 * Revoke the user's API key.
 */
exports.revokeApiKey = async (req, res, next) => {
    try {
        const User = req.prisma.user;
        let targetId = req.user.id;
        if (req.query.userId && ['admin', 'manager'].includes(req.user.role)) {
            targetId = req.query.userId;
        }

        await User.update({ where: { id: targetId }, data: {
            apiKey: null,
            apiKeyEnabled: false,
        } });
        res.json({ message: 'API key revoked successfully.' });
    } catch (err) { next(err); }
};

/**
 * Get API key status (whether key exists, prefix visible).
 * Never returns the actual key hash.
 */
exports.getApiKeyStatus = async (req, res, next) => {
    try {
        const User = req.prisma.user;
        const { userId } = req.query;

        let targetId = req.user.id;
        if (userId && ['admin', 'manager'].includes(req.user.role)) {
            targetId = userId;
        }

        const user = await User.findUnique({ 
            where: { id: targetId },
            select: { apiKey: true, apiKeyEnabled: true }
        });
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
            hasKey: !!user.apiKey,
            enabled: user.apiKeyEnabled || false,
        });
    } catch (err) { next(err); }
};

/**
 * Public endpoint: GET /api/public/profile?key=ims_xxxxx
 * Returns aggregated profile data for embedding on external sites.
 */
exports.publicProfile = async (req, res, next) => {
    try {
        const { key } = req.query;
        if (!key) return res.status(400).json({ error: 'API key required. Pass ?key=your_api_key' });

        const hashed = crypto.createHash('sha256').update(key).digest('hex');

        const User = req.prisma.user;
        const Task = req.prisma.task;
        const Project = req.prisma.project;

        const user = await User.findFirst({ 
            where: { apiKey: hashed, apiKeyEnabled: true, deletedAt: null },
            select: { id: true, name: true, email: true, role: true, department: true, position: true, photoUrl: true, joinDate: true, performanceScore: true, employeeId: true }
        });

        if (!user) return res.status(401).json({ error: 'Invalid or disabled API key.' });

        const userId = user.id;

        // Task stats
        const [allTasks, projects] = await Promise.all([
            Task.findMany({ 
                where: { assigneeId: userId, deletedAt: null },
                select: { id: true, title: true, status: true, dueDate: true, completedOnTime: true, completedAt: true, projectId: true, priority: true, project: { select: { name: true } } }
            }),
            Project.findMany({
                where: {
                    OR: [{ ownerId: userId }, { memberIds: { has: userId } }],
                    deletedAt: null,
                },
                select: { id: true, name: true, status: true, progress: true, deadline: true, ownerId: true }
            }),
        ]);

        const totalTasks = allTasks.length;
        const completedTasks = allTasks.filter(t => t.status === 'done').length;
        const completedOnTime = allTasks.filter(t => t.completedOnTime === true).length;
        const completedLate = allTasks.filter(t => t.status === 'done' && t.completedOnTime === false).length;
        const pendingTasks = allTasks.filter(t => t.status !== 'done').length;
        const overdueTasks = allTasks.filter(t =>
            t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()
        ).length;

        // Achievement tag
        const score = user.performanceScore || 100;
        const TIERS = [
            { min: 0, max: 100, tag: 'Rookie', emoji: 'ðŸŒ±' },
            { min: 100, max: 200, tag: 'Consistent Contributor', emoji: 'ðŸ”¥' },
            { min: 200, max: 300, tag: 'Rising Star', emoji: 'â­' },
            { min: 300, max: 400, tag: 'High Achiever', emoji: 'ðŸš€' },
            { min: 400, max: 500, tag: 'Elite Performer', emoji: 'ðŸ’Ž' },
            { min: 500, max: 501, tag: 'Legendary Executor', emoji: 'ðŸ†' },
        ];
        const tier = score >= 500 ? TIERS[5] : TIERS.find(t => score >= t.min && score < t.max) || TIERS[0];

        // Projects with role
        const projectsWithRole = projects.map(p => ({
            _id: p.id,
            name: p.name,
            status: p.status,
            progress: p.progress,
            deadline: p.deadline,
            role: p.ownerId === userId ? 'owner' : 'member',
        }));

        res.json({
            profile: {
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                position: user.position,
                photoUrl: user.photoUrl,
                employeeId: user.employeeId,
                joinDate: user.joinDate,
            },
            performance: {
                score,
                maxScore: 500,
                achievementTag: tier.tag,
                achievementEmoji: tier.emoji,
            },
            taskStats: {
                total: totalTasks,
                completed: completedTasks,
                completedOnTime,
                completedLate,
                pending: pendingTasks,
                overdue: overdueTasks,
            },
            projects: projectsWithRole,
            generatedAt: new Date().toISOString(),
        });
    } catch (err) { next(err); }
};
