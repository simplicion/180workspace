const AutomationService = require('../../../platform-core/platform-communications/services/automation.service');

exports.getGoals = async (req, res, next) => {
    try {
        const Goal = req.prisma.goal;
        const goals = await Goal.findMany({
            where: {
                companyId: req.user.companyId,
                deletedAt: null
            },
            include: {
                owner: { select: { name: true, email: true, photoUrl: true } },
                assignedTo: { select: { name: true, email: true, photoUrl: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ goals });
    } catch (err) { next(err); }
};

exports.createGoal = async (req, res, next) => {
    try {
        const Goal = req.prisma.goal;
        const userId = req.user.id;
        const goalData = { ...req.body, companyId: req.user.companyId };
        if (!goalData.ownerId) goalData.ownerId = userId;
        
        const goal = await Goal.create({ data: goalData });

        // Trigger goal assignment notification
        if (goal.ownerId && goal.ownerId !== userId) {
            await AutomationService.trigger('goal_assigned', {
                userId: goal.ownerId,
                metadata: {
                    goalTitle: goal.title,
                    motivation: goal.motivation,
                    celebration: goal.celebration,
                    difficulty: goal.difficulty,
                    dueDate: goal.dueDate ? new Date(goal.dueDate).toLocaleDateString() : 'Ongoing',
                    assignedBy: req.user.name
                },
                relatedItem: {
                    itemType: 'Goal',
                    itemId: goal.id
                }
            }, req.prisma);
        }

        res.status(201).json({ goal });
    } catch (err) { next(err); }
};

exports.getGoalById = async (req, res, next) => {
    try {
        const Goal = req.prisma.goal;
        const goal = await Goal.findUnique({ 
            where: { id: req.params.id },
            include: {
                owner: { select: { name: true, email: true, photoUrl: true } },
                assignedTo: { select: { name: true, email: true, photoUrl: true } }
            }
        });
        if (!goal || goal.companyId !== req.user.companyId) return res.status(404).json({ error: 'Goal not found' });
        res.json({ goal });
    } catch (err) { next(err); }
};

exports.updateGoal = async (req, res, next) => {
    try {
        const Goal = req.prisma.goal;
        const oldGoal = await Goal.findUnique({ where: { id: req.params.id } });
        if (!oldGoal || oldGoal.companyId !== req.user.companyId) return res.status(404).json({ error: 'Goal not found' });

        const goal = await Goal.update({ 
            where: { id: req.params.id }, 
            data: req.body,
            include: {
                owner: { select: { name: true, email: true, photoUrl: true } },
                assignedTo: { select: { name: true, email: true, photoUrl: true } }
            }
        });

        // If owner changed, notify the new owner
        if (req.body.ownerId && req.body.ownerId !== oldGoal.ownerId) {
            await AutomationService.trigger('goal_assigned', {
                userId: req.body.ownerId,
                metadata: {
                    goalTitle: goal.title,
                    motivation: goal.motivation,
                    celebration: goal.celebration,
                    difficulty: goal.difficulty,
                    dueDate: goal.dueDate ? new Date(goal.dueDate).toLocaleDateString() : 'Ongoing',
                    assignedBy: req.user.name
                },
                relatedItem: {
                    itemType: 'Goal',
                    itemId: goal.id
                }
            }, req.prisma);
        }

        res.json({ goal });
    } catch (err) { next(err); }
};

exports.deleteGoal = async (req, res, next) => {
    try {
        const Goal = req.prisma.goal;
        const oldGoal = await Goal.findUnique({ where: { id: req.params.id } });
        if (!oldGoal || oldGoal.companyId !== req.user.companyId) return res.status(404).json({ error: 'Goal not found' });
        await Goal.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
        res.json({ message: 'Goal deleted' });
    } catch (err) { next(err); }
};
