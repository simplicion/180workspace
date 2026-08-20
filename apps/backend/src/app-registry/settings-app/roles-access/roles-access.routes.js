'use strict';

const express = require('express');
const router = express.Router();
const { authorize } = require('../../../system-configs/middleware/auth/auth.js');
const { RoleService } = require('@workspace/settings');

router.use(authorize('admin'));

router.get('/matrix', async (req, res, next) => {
    try {
        const users = await RoleService.getMatrix();
        res.json({ users });
    } catch (err) {
        next(err);
    }
});

router.put('/bulk-update', async (req, res, next) => {
    try {
        const { userId, role, permissions } = req.body;
        const updatedUser = await RoleService.bulkUpdate(userId, role, permissions, req.user);
        res.json({ user: updatedUser, message: 'User access updated successfully' });
    } catch (err) {
        if (err.message.includes('userId is required') || err.message.includes('cannot change your own role') || err.message.includes('Invalid role')) {
            return res.status(400).json({ error: err.message });
        }
        if (err.message === 'User not found') {
            return res.status(404).json({ error: 'User not found' });
        }
        next(err);
    }
});

module.exports = router;
