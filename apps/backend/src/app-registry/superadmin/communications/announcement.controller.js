'use strict';

exports.list = async (req, res) => {
    try {
        const announcements = await req.prisma.announcement.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.json({ announcements });
    } catch (err) {
        console.error('[Announcement Controller] List failed:', err.message);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
};

exports.listActive = async (req, res) => {
    try {
        const now = new Date();
        const announcements = await req.prisma.announcement.findMany({
            where: {
                isActive: true,
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            },
            orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        });
        res.json({ announcements });
    } catch (err) {
        console.error('[Announcement Controller] ListActive failed:', err.message);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
};

exports.create = async (req, res) => {
    try {
        const announcement = await req.prisma.announcement.create({
            data: { ...req.body, createdBy: req.superAdmin.id },
        });
        res.status(201).json({ announcement });
    } catch (err) {
        console.error('[Announcement Controller] Create failed:', err.message);
        res.status(500).json({ error: 'Failed to create announcement' });
    }
};

exports.update = async (req, res) => {
    try {
        const announcement = await req.prisma.announcement.update({
            where: { id: req.params.id },
            data: req.body,
        });
        res.json({ announcement });
    } catch (err) {
        if (err.code === 'P2025') return res.status(404).json({ error: 'Announcement not found' });
        console.error('[Announcement Controller] Update failed:', err.message);
        res.status(500).json({ error: 'Failed to update announcement' });
    }
};

exports.remove = async (req, res) => {
    try {
        await req.prisma.announcement.delete({ where: { id: req.params.id } });
        res.json({ message: 'Announcement deleted' });
    } catch (err) {
        if (err.code === 'P2025') return res.status(404).json({ error: 'Announcement not found' });
        console.error('[Announcement Controller] Delete failed:', err.message);
        res.status(500).json({ error: 'Failed to delete announcement' });
    }
};
