'use strict';

exports.list = async (req, res) => {
    try {
        const notes = await req.prisma.releaseNote.findMany({
            orderBy: [{ version: 'desc' }, { createdAt: 'desc' }]
        });
        res.json(notes);
    } catch (error) {
        console.error('[ReleaseNote Controller] list error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.listPublished = async (req, res) => {
    try {
        const notes = await req.prisma.releaseNote.findMany({
            where: { isPublished: true },
            orderBy: [{ version: 'desc' }, { createdAt: 'desc' }]
        });
        res.json(notes);
    } catch (error) {
        console.error('[ReleaseNote Controller] listPublished error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.create = async (req, res) => {
    try {
        const note = await req.prisma.releaseNote.create({
            data: {
                ...req.body,
                createdBy: req.superAdmin.id
            }
        });
        res.status(201).json(note);
    } catch (error) {
        console.error('[ReleaseNote Controller] create error:', error);
        res.status(400).json({ error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const note = await req.prisma.releaseNote.update({
            where: { id: req.params.id },
            data: req.body
        });
        res.json(note);
    } catch (error) {
        console.error('[ReleaseNote Controller] update error:', error);
        res.status(400).json({ error: error.message });
    }
};

exports.remove = async (req, res) => {
    try {
        await req.prisma.releaseNote.delete({ where: { id: req.params.id } });
        res.json({ message: 'Release note deleted' });
    } catch (error) {
        console.error('[ReleaseNote Controller] remove error:', error);
        res.status(500).json({ error: error.message });
    }
};
