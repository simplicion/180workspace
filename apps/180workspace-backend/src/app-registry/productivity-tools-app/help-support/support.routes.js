'use strict';
const express = require('express');
const router = express.Router();
const { protect } = require('../../../system-configs/middleware/auth/auth.js');

// All company support routes require auth
router.use(protect);

const MONTHLY_LIMIT = 9;

// â”€â”€ Helper: get monthly count â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function getMonthlyCount(prisma, companyId) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    return await prisma.supportTicket.count({
        where: {
            companyId,
            createdAt: { gte: startOfMonth },
        },
    });
}

// â”€â”€ Create ticket (enforces 9/month limit) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const count = await getMonthlyCount(req.prisma, companyId);
        if (count >= MONTHLY_LIMIT) {
            return res.status(429).json({
                error: `Monthly support ticket limit reached (${MONTHLY_LIMIT}/month). Please wait until next month.`,
                used: count,
                limit: MONTHLY_LIMIT,
            });
        }
        
        const config = await req.prisma.companyConfig.findFirst();
        
        const ticket = await req.prisma.supportTicket.create({
            data: {
                companyId,
                companyName: config?.companyName || req.user.name,
                userId: req.user.id,
                userName: req.user.name,
                userEmail: req.user.email,
                subject: req.body.subject,
                message: req.body.description || req.body.message || '',
                category: req.body.category || 'other',
                priority: req.body.priority || 'medium',
                messages: []
            }
        });
        res.status(201).json({
            ticket,
            remaining: MONTHLY_LIMIT - (count + 1),
            used: count + 1,
            limit: MONTHLY_LIMIT,
        });
    } catch (err) {
        console.error('Create ticket error:', err);
        res.status(500).json({ error: 'Failed to create support ticket' });
    }
});

// â”€â”€ List own tickets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const tickets = await req.prisma.supportTicket.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' }
        });
        
        // Also get monthly usage
        const monthCount = await getMonthlyCount(req.prisma, companyId);
        res.json({ tickets, monthlyUsed: monthCount, monthlyLimit: MONTHLY_LIMIT });
    } catch { res.status(500).json({ error: 'Failed to fetch tickets' }); }
});

// â”€â”€ Get one ticket â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/:id', async (req, res) => {
    try {
        const ticket = await req.prisma.supportTicket.findUnique({
            where: { id: req.params.id }
        });
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
        res.json({ ticket });
    } catch { res.status(500).json({ error: 'Failed to fetch ticket' }); }
});

// â”€â”€ Add reply from company side â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/:id/reply', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text?.trim()) return res.status(400).json({ error: 'Message text required' });
        
        const ticket = await req.prisma.supportTicket.findUnique({ where: { id: req.params.id } });
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

        const currentMessages = Array.isArray(ticket.messages) ? ticket.messages : [];
        const newMessage = { senderName: req.user.name, senderRole: 'admin', senderId: req.user.id, text, createdAt: new Date().toISOString() };
        
        const updatedTicket = await req.prisma.supportTicket.update({
            where: { id: req.params.id },
            data: {
                messages: [...currentMessages, newMessage],
                status: 'waiting_on_customer'
            }
        });
        
        res.json({ ticket: updatedTicket });
    } catch { res.status(500).json({ error: 'Failed to add reply' }); }
});

// â”€â”€ Edit ticket â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.put('/:id', async (req, res) => {
    try {
        const { subject, description, category, priority } = req.body;
        
        const ticket = await req.prisma.supportTicket.findUnique({ where: { id: req.params.id } });
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
        
        const companyId = req.user.companyId;
        if (ticket.companyId !== companyId) {
            return res.status(403).json({ error: 'Not authorized to edit this ticket' });
        }

        const updateData = {};
        if (subject) updateData.subject = subject;
        if (description) updateData.message = description;
        if (category) updateData.category = category;
        if (priority) updateData.priority = priority;

        const updatedTicket = await req.prisma.supportTicket.update({
            where: { id: req.params.id },
            data: updateData
        });
        res.json({ ticket: updatedTicket });
    } catch { res.status(500).json({ error: 'Failed to update ticket' }); }
});

// â”€â”€ Delete ticket â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.delete('/:id', async (req, res) => {
    try {
        const ticket = await req.prisma.supportTicket.findUnique({ where: { id: req.params.id } });
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
        
        const companyId = req.user.companyId;
        if (ticket.companyId !== companyId) {
            return res.status(403).json({ error: 'Not authorized to delete this ticket' });
        }

        await req.prisma.supportTicket.delete({ where: { id: req.params.id } });
        res.json({ message: 'Ticket deleted successfully' });
    } catch { res.status(500).json({ error: 'Failed to delete ticket' }); }
});

module.exports = router;
