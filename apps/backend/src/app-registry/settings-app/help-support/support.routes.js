'use strict';
const express = require('express');
const router = express.Router();
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const { SupportService } = require('@workspace/customer-support');

// All company support routes require auth
router.use(protect);

router.post('/', async (req, res) => {
    try {
        const result = await SupportService.createTicket(req.user.companyId, req.user, req.body);
        res.status(201).json(result);
    } catch (err) {
        if (err.message.includes('Monthly support ticket limit reached')) {
            const matches = err.message.match(/\((\d+)\/month\)/);
            const limit = matches ? parseInt(matches[1], 10) : 9;
            return res.status(429).json({
                error: err.message,
                used: limit,
                limit: limit,
            });
        }
        console.error('Create ticket error:', err);
        res.status(500).json({ error: 'Failed to create support ticket' });
    }
});

router.get('/', async (req, res) => {
    try {
        const result = await SupportService.listOwnTickets(req.user.companyId);
        res.json(result);
    } catch {
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const ticket = await SupportService.getTicket(req.params.id);
        res.json({ ticket });
    } catch (err) {
        if (err.message === 'Ticket not found') return res.status(404).json({ error: 'Ticket not found' });
        res.status(500).json({ error: 'Failed to fetch ticket' });
    }
});

router.post('/:id/reply', async (req, res) => {
    try {
        const ticket = await SupportService.addReplyFromCompany(req.params.id, req.body.text, req.user);
        res.json({ ticket });
    } catch (err) {
        if (err.message === 'Message text required') return res.status(400).json({ error: err.message });
        if (err.message === 'Ticket not found') return res.status(404).json({ error: err.message });
        res.status(500).json({ error: 'Failed to add reply' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const ticket = await SupportService.editTicket(req.params.id, req.user.companyId, req.body);
        res.json({ ticket });
    } catch (err) {
        if (err.message === 'Ticket not found') return res.status(404).json({ error: err.message });
        if (err.message === 'Not authorized to edit this ticket') return res.status(403).json({ error: err.message });
        res.status(500).json({ error: 'Failed to update ticket' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await SupportService.deleteTicket(req.params.id, req.user.companyId);
        res.json(result);
    } catch (err) {
        if (err.message === 'Ticket not found') return res.status(404).json({ error: err.message });
        if (err.message === 'Not authorized to delete this ticket') return res.status(403).json({ error: err.message });
        res.status(500).json({ error: 'Failed to delete ticket' });
    }
});

module.exports = router;
