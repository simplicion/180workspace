'use strict';

const express = require('express');
const router = express.Router();
const { authorize } = require('../../../system-configs/middleware/auth/auth.js');

// All routes here are already behind `protect` from index.routes.js
// Only admins can access roles & access management
router.use(authorize('admin'));

/**
 * GET /api/roles-access/matrix
 * Returns all users with id, name, email, role, permissions, isActive
 */
router.get('/matrix', async (req, res, next) => {
    try {
        const users = await req.prisma.user.findMany({
            where: { deletedAt: null },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                permissions: true,
                isActive: true,
                photoUrl: true,
                image: true,
                department: true,
                designation: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ users });
    } catch (err) {
        next(err);
    }
});

/**
 * PUT /api/roles-access/bulk-update
 * Body: { userId: string, role: string, permissions: string[] }
 * Updates a single user's role and permissions.
 */
router.put('/bulk-update', async (req, res, next) => {
    try {
        const { userId, role, permissions } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        // Prevent admin from demoting themselves
        if (userId === req.user.id && role !== 'admin') {
            return res.status(400).json({ error: 'You cannot change your own role.' });
        }

        const validRoles = ['admin', 'manager', 'hr', 'employee', 'finance', 'sales', 'client'];
        if (role && !validRoles.includes(role)) {
            return res.status(400).json({ error: `Invalid role: ${role}. Valid roles: ${validRoles.join(', ')}` });
        }

        const validPermissions = [
            'can_manage_team', 'can_manage_hr', 'can_manage_finance',
            'can_manage_sales', 'can_manage_projects'
        ];
        const sanitizedPermissions = (permissions || []).filter(p => validPermissions.includes(p));

        const existingUser = await req.prisma.user.findUnique({ where: { id: userId } });
        if (!existingUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const updateData = {};
        if (role) updateData.role = role;
        updateData.permissions = sanitizedPermissions;

        const updatedUser = await req.prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                permissions: true,
                isActive: true,
            },
        });

        res.json({ user: updatedUser, message: 'User access updated successfully' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
