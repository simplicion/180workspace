'use strict';

const { prisma } = require('@workspace/db');

exports.list = async (req, res) => {
    try {
        const { page = 1, limit = 50, search = '', role } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const where = { deletedAt: null };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (role) {
            where.role = role;
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                include: { company: true },
                orderBy: { createdAt: 'desc' },
                skip,
                take
            }),
            prisma.user.count({ where })
        ]);

        const usersWithContext = users.map(u => ({
            ...u,
            companyName: u.company?.name || 'SYSTEM',
            companyId: u.company?.id || null
        }));

        res.json({ users: usersWithContext, total });
    } catch (err) {
        console.error('SuperAdmin user list error:', err);
        res.status(500).json({ error: 'Failed to list users' });
    }
};

exports.suspend = async (req, res) => {
    try {
        await prisma.user.update({
            where: { id: req.params.id },
            data: { isActive: false }
        });
        res.json({ message: 'User suspended' });
    } catch (err) {
        console.error('Suspend error:', err);
        res.status(500).json({ error: 'Failed to suspend user' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        await prisma.user.update({
            where: { id: req.params.id },
            data: { deletedAt: new Date() }
        });
        res.json({ message: 'User deleted' });
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};
