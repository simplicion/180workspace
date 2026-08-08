'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const { requireHR } = require('../../../system-configs/middleware/auth/rbac.js');
const { createNotification } = require('../../../platform-core/platform-communications/services/notify.js');

/**
 * All Leave routes are company-isolated.
 * Models are retrieved from req.prisma to ensure data comes from the correct workspace.
 */

// Employee applies for leave
router.post('/', protect, async (req, res, next) => {
    try {
        const { startDate, endDate, type, reason } = req.body;
        if (!startDate || !endDate) return res.status(400).json({ error: 'Start and end date required' });
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
        
        const leave = await req.prisma.leave.create({
            data: {
                employeeId: req.user.id,
                type: type || 'casual',
                startDate,
                endDate,
                reason,
                days,
            }
        });
        res.status(201).json({ leave });
    } catch (err) { next(err); }
});

// Get leaves â€” admin/hr sees all, employee sees own
router.get('/', protect, async (req, res, next) => {
    try {
        const { employeeId, status, month } = req.query;
        const filter = {};
        
        if (req.user.role === 'employee') {
            filter.employeeId = req.user.id;
        } else if (employeeId) {
            filter.employeeId = employeeId;
        }
        
        if (status) filter.status = status;
        if (month) {
            filter.startDate = { startsWith: month };
        }
        
        const leaves = await req.prisma.leave.findMany({
            where: filter,
            include: {
                employee: { select: { id: true, name: true, email: true, department: true } },
                reviewedBy: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
            
        res.json({ leaves });
    } catch (err) { next(err); }
});

// Approve / Reject â€” admin or hr
router.put('/:id/review', protect, requireHR, async (req, res, next) => {
    try {
        const { status, reviewNote } = req.body;
        if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
        
        const leave = await req.prisma.leave.update({
            where: { id: req.params.id },
            data: { 
                status, 
                reviewedById: req.user.id, 
                reviewedAt: new Date(), 
                reviewNote 
            },
            include: {
                employee: { select: { id: true, name: true, email: true, department: true } },
                reviewedBy: { select: { id: true, name: true } }
            }
        }).catch(() => null);
        
        if (!leave) return res.status(404).json({ error: 'Leave not found' });

        // Notify employee about the decision
        try {
            await createNotification({
                userId: leave.employeeId,
                type: 'attendance',
                title: `Leave ${status === 'approved' ? 'Approved âœ…' : 'Rejected âŒ'}`,
                message: `Your ${leave.type} leave (${leave.days} day${leave.days > 1 ? 's' : ''}) has been ${status}${reviewNote ? ': ' + reviewNote : ''}.`,
                actionUrl: '/dashboard/attendance',
                io: require('../../../system-configs/sockets').getIo(),
            });
        } catch (e) { /* swallow notification errors */ }

        res.json({ leave });
    } catch (err) { next(err); }
});

// Delete own pending leave request
router.delete('/:id', protect, async (req, res, next) => {
    try {
        const leave = await req.prisma.leave.findUnique({ where: { id: req.params.id } });
        if (!leave) return res.status(404).json({ error: 'Not found' });
        if (leave.status !== 'pending') return res.status(400).json({ error: 'Can only delete pending requests' });
        
        const userId = req.user.id;
        if (leave.employeeId !== userId && !['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        await req.prisma.leave.delete({ where: { id: req.params.id } });
        res.json({ message: 'Leave request deleted' });
    } catch (err) { next(err); }
});

module.exports = router;
