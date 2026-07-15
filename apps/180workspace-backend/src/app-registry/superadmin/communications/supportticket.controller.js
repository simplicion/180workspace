'use strict';

exports.list = async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const where = {};
        if (status) where.status = status;

        const [tickets, total] = await Promise.all([
            req.prisma.supportTicket.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
            }),
            req.prisma.supportTicket.count({ where }),
        ]);
        res.json({ tickets, total });
    } catch (err) {
        console.error('[SupportTicket Controller] List failed:', err.message);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
};

exports.getOne = async (req, res) => {
    try {
        const ticket = await req.prisma.supportTicket.findUnique({ where: { id: req.params.id } });
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
        res.json({ ticket });
    } catch (err) {
        console.error('[SupportTicket Controller] GetOne failed:', err.message);
        res.status(500).json({ error: 'Failed to get ticket' });
    }
};

exports.reply = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text?.trim()) return res.status(400).json({ error: 'Message text is required' });

        // Fetch existing ticket to append to messages array
        const existing = await req.prisma.supportTicket.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ error: 'Ticket not found' });

        const currentMessages = Array.isArray(existing.messages) ? existing.messages : [];
        const newMessage = {
            senderName: req.superAdmin.name,
            senderRole: 'superadmin',
            senderId: req.superAdmin.id,
            text,
            timestamp: new Date().toISOString(),
        };

        const ticket = await req.prisma.supportTicket.update({
            where: { id: req.params.id },
            data: {
                messages: [...currentMessages, newMessage],
                status: 'in_progress',
            },
        });
        res.json({ ticket });
    } catch (err) {
        console.error('[SupportTicket Controller] Reply failed:', err.message);
        res.status(500).json({ error: 'Failed to send reply' });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const data = { status };
        if (status === 'resolved') data.resolvedAt = new Date();
        if (status === 'closed') data.closedAt = new Date();

        const ticket = await req.prisma.supportTicket.update({
            where: { id: req.params.id },
            data,
        });
        res.json({ ticket });
    } catch (err) {
        if (err.code === 'P2025') return res.status(404).json({ error: 'Ticket not found' });
        console.error('[SupportTicket Controller] UpdateStatus failed:', err.message);
        res.status(500).json({ error: 'Failed to update status' });
    }
};
