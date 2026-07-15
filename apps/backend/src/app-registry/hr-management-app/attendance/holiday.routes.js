'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const { requireHR } = require('../../../system-configs/middleware/auth/rbac.js');

// Get all holidays (all authenticated users)
router.get('/', protect, async (req, res, next) => {
    try {
        const { year } = req.query;
        const companyId = req.user.companyId;
        if (!companyId) return res.status(403).json({ error: 'Company ID is required' });
        
        const filter = { companyId };
        if (year) {
            filter.date = {
                gte: new Date(`${year}-01-01T00:00:00.000Z`),
                lte: new Date(`${year}-12-31T23:59:59.999Z`)
            };
        }
        const holidays = await req.prisma.holiday.findMany({
            where: filter,
            orderBy: { date: 'asc' }
        });
        res.json({ holidays });
    } catch (err) { next(err); }
});

// Create a holiday (admin / hr only)
router.post('/', protect, requireHR, async (req, res, next) => {
    try {
        const { name, date, type, description } = req.body;
        if (!name || !date) return res.status(400).json({ error: 'Name and date are required' });
        if (!req.user.companyId) return res.status(403).json({ error: 'Company ID is required to create a holiday' });
        const holiday = await req.prisma.holiday.create({
            data: { name, date: new Date(date), type, description, companyId: req.user.companyId }
        });
        res.status(201).json({ holiday });
    } catch (err) { 
        console.error('Error creating holiday:', err);
        next(err); 
    }
});

// Update a holiday (admin / hr only)
router.put('/:id', protect, requireHR, async (req, res, next) => {
    try {
        const { name, date, type, description } = req.body;
        const update = { name, type, description };
        if (date) update.date = new Date(date);
        
        const existingHoliday = await req.prisma.holiday.findUnique({ where: { id: req.params.id } });
        if (!existingHoliday || existingHoliday.companyId !== req.user.companyId) {
            return res.status(404).json({ error: 'Holiday not found' });
        }
        
        const holiday = await req.prisma.holiday.update({
            where: { id: req.params.id },
            data: update
        });
        res.json({ holiday });
    } catch (err) {
        console.error('Error updating holiday:', err);
        next(err); 
    }
});

// Delete a holiday (admin / hr only)
router.delete('/:id', protect, requireHR, async (req, res, next) => {
    try {
        const existingHoliday = await req.prisma.holiday.findUnique({ where: { id: req.params.id } });
        if (!existingHoliday || existingHoliday.companyId !== req.user.companyId) {
            return res.status(404).json({ error: 'Holiday not found' });
        }

        await req.prisma.holiday.delete({
            where: { id: req.params.id }
        });
        res.json({ message: 'Holiday deleted' });
    } catch (err) {
        next(err); 
    }
});

module.exports = router;
