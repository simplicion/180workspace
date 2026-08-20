'use strict';
const { SupportService } = require('@workspace/customer-support');

exports.list = async (req, res) => {
    try {
        const result = await SupportService.superadminListTickets(req.query);
        res.json(result);
    } catch (err) {
        console.error('[SupportTicket Controller] List failed:', err.message);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
};

exports.getOne = async (req, res) => {
    try {
        const ticket = await SupportService.getTicket(req.params.id);
        res.json({ ticket });
    } catch (err) {
        if (err.message === 'Ticket not found') return res.status(404).json({ error: 'Ticket not found' });
        console.error('[SupportTicket Controller] GetOne failed:', err.message);
        res.status(500).json({ error: 'Failed to get ticket' });
    }
};

exports.reply = async (req, res) => {
    try {
        const ticket = await SupportService.superadminReply(req.params.id, req.body.text, req.superAdmin);
        res.json({ ticket });
    } catch (err) {
        if (err.message === 'Message text is required') return res.status(400).json({ error: err.message });
        if (err.message === 'Ticket not found') return res.status(404).json({ error: err.message });
        console.error('[SupportTicket Controller] Reply failed:', err.message);
        res.status(500).json({ error: 'Failed to send reply' });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const ticket = await SupportService.superadminUpdateStatus(req.params.id, req.body.status);
        res.json({ ticket });
    } catch (err) {
        if (err.message === 'Ticket not found') return res.status(404).json({ error: 'Ticket not found' });
        console.error('[SupportTicket Controller] UpdateStatus failed:', err.message);
        res.status(500).json({ error: 'Failed to update status' });
    }
};
