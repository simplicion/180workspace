import { Request, Response, NextFunction } from 'express';
import { HrManagementService } from '@workspace/hr-management';
import { prisma } from '@workspace/db';

export const getDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const service = new HrManagementService();
        const data = await service.getDashboard();
        res.json(data);
    } catch (err) { next(err); }
};

export const getAttendanceReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const service = new HrManagementService();
        const data = await service.getAttendanceReport(req.query.month as string);
        res.json(data);
    } catch (err: any) {
        if (err.message === 'month param required (YYYY-MM)') return res.status(400).json({ error: err.message });
        next(err); 
    }
};

export const getSalaryReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const service = new HrManagementService();
        const data = await service.getSalaryReport(req.query.month as string);
        res.json(data);
    } catch (err: any) {
        if (err.message === 'month param required (YYYY-MM)') return res.status(400).json({ error: err.message });
        next(err); 
    }
};

export const getWeeklyTrends = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const service = new HrManagementService();
        const data = await service.getWeeklyTrends(req.query.range as string, req.query.grouping as string);
        res.json(data);
    } catch (err) { next(err); }
};

export const getCEOInsights = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const service = new HrManagementService();
        const data = await service.getCEOInsights();
        res.json(data);
    } catch (err) { next(err); }
};

export const getAttendanceTrend = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const service = new HrManagementService();
        const data = await service.getAttendanceTrend(req.query.range as string, req.query.grouping as string);
        res.json(data);
    } catch (err) { next(err); }
};

export const getGoals = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
        const ownerId = (req as any).user?.id;
        const companyId = (req as any).companyId || (req as any).user?.companyId;
        const role = (req as any).user?.role;
        if (!ownerId) return res.status(401).json({ error: 'Unauthorized' });

        const where: any = {};
        if (['admin', 'manager', 'hr', 'super_admin'].includes(role)) {
            if (companyId) where.companyId = companyId;
        } else {
            where.ownerId = ownerId;
            if (companyId) where.companyId = companyId;
        }

        const goals = await prisma.goal.findMany({
            where,
            include: {
                owner: { select: { id: true, name: true, email: true } }
            },
            take: limit,
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, goals });
    } catch (err) { next(err); }
};

export const createGoal = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ownerId = (req as any).user?.id;
        const companyId = (req as any).companyId || (req as any).user?.companyId;
        if (!ownerId) return res.status(401).json({ error: 'Unauthorized' });

        const { title, description, dueDate, targetDate, progress, difficulty, color, type, status } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Goal title is required' });
        }

        const parsedDueDate = targetDate || dueDate ? new Date(targetDate || dueDate) : null;

        const goal = await prisma.goal.create({
            data: {
                title: title.trim(),
                description: description ? description.trim() : '',
                dueDate: parsedDueDate,
                progress: typeof progress === 'number' ? progress : 0,
                difficulty: difficulty || 'medium',
                color: color || '#6366f1',
                type: type || 'personal',
                status: status || 'active',
                ownerId,
                companyId: companyId || null
            },
            include: {
                owner: { select: { id: true, name: true, email: true } }
            }
        });

        res.status(201).json({ success: true, goal });
    } catch (err) { next(err); }
};

export const updateGoal = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const ownerId = (req as any).user?.id;
        const companyId = (req as any).companyId || (req as any).user?.companyId;
        if (!ownerId) return res.status(401).json({ error: 'Unauthorized' });

        const { title, description, dueDate, targetDate, progress, difficulty, color, type, status } = req.body;

        const existing = await prisma.goal.findFirst({
            where: {
                id,
                ...(companyId ? { companyId } : {})
            }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Goal not found' });
        }

        const updateData: any = {};
        if (title !== undefined) updateData.title = title.trim();
        if (description !== undefined) updateData.description = description.trim();
        if (targetDate !== undefined || dueDate !== undefined) {
            updateData.dueDate = (targetDate || dueDate) ? new Date(targetDate || dueDate) : null;
        }
        if (progress !== undefined) updateData.progress = Number(progress);
        if (difficulty !== undefined) updateData.difficulty = difficulty;
        if (color !== undefined) updateData.color = color;
        if (type !== undefined) updateData.type = type;
        if (status !== undefined) updateData.status = status;

        const goal = await prisma.goal.update({
            where: { id },
            data: updateData,
            include: {
                owner: { select: { id: true, name: true, email: true } }
            }
        });

        res.json({ success: true, goal });
    } catch (err) { next(err); }
};

export const deleteGoal = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const companyId = (req as any).companyId || (req as any).user?.companyId;

        const existing = await prisma.goal.findFirst({
            where: {
                id,
                ...(companyId ? { companyId } : {})
            }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Goal not found' });
        }

        await prisma.goal.delete({ where: { id } });
        res.json({ success: true, message: 'Goal deleted successfully' });
    } catch (err) { next(err); }
};

// ─── STICKY NOTES ────────────────────────────────────────────────────────────

export const getStickyNotes = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ownerId = (req as any).user?.id;
        const companyId = (req as any).companyId || (req as any).user?.companyId;
        if (!ownerId) return res.status(401).json({ error: 'Unauthorized' });

        const notes = await prisma.note.findMany({
            where: {
                relatedType: 'sticky_note',
                ...(companyId ? { companyId } : { createdById: ownerId })
            },
            include: {
                createdBy: { select: { id: true, name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        const parsedNotes = notes.map((n: any) => {
            let noteData = { title: '', content: n.content, color: 'yellow', isPinned: false, tag: 'General' };
            try {
                if (n.content && n.content.startsWith('{')) {
                    const parsed = JSON.parse(n.content);
                    noteData = { ...noteData, ...parsed };
                }
            } catch {
                noteData.content = n.content;
            }
            return {
                id: n.id,
                title: noteData.title,
                content: noteData.content,
                color: noteData.color || 'yellow',
                isPinned: Boolean(noteData.isPinned),
                tag: noteData.tag || 'General',
                createdAt: n.createdAt,
                updatedAt: n.updatedAt,
                createdBy: n.createdBy
            };
        });

        res.json({ success: true, notes: parsedNotes });
    } catch (err) { next(err); }
};

export const createStickyNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ownerId = (req as any).user?.id;
        const companyId = (req as any).companyId || (req as any).user?.companyId;
        if (!ownerId) return res.status(401).json({ error: 'Unauthorized' });

        const { title, content, color, isPinned, tag } = req.body;
        if (!content && !title) {
            return res.status(400).json({ error: 'Note title or content is required' });
        }

        const notePayload = JSON.stringify({
            title: title ? title.trim() : '',
            content: content ? content.trim() : '',
            color: color || 'yellow',
            isPinned: Boolean(isPinned),
            tag: tag || 'General'
        });

        const note = await prisma.note.create({
            data: {
                content: notePayload,
                relatedType: 'sticky_note',
                createdById: ownerId,
                companyId: companyId || null
            },
            include: {
                createdBy: { select: { id: true, name: true, email: true } }
            }
        });

        res.status(201).json({
            success: true,
            note: {
                id: note.id,
                title: title ? title.trim() : '',
                content: content ? content.trim() : '',
                color: color || 'yellow',
                isPinned: Boolean(isPinned),
                tag: tag || 'General',
                createdAt: note.createdAt,
                updatedAt: note.updatedAt,
                createdBy: note.createdBy
            }
        });
    } catch (err) { next(err); }
};

export const updateStickyNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const ownerId = (req as any).user?.id;
        const companyId = (req as any).companyId || (req as any).user?.companyId;
        if (!ownerId) return res.status(401).json({ error: 'Unauthorized' });

        const existing = await prisma.note.findFirst({
            where: {
                id,
                relatedType: 'sticky_note',
                ...(companyId ? { companyId } : { createdById: ownerId })
            }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Sticky note not found' });
        }

        let currentData = { title: '', content: existing.content, color: 'yellow', isPinned: false, tag: 'General' };
        try {
            if (existing.content.startsWith('{')) {
                currentData = { ...currentData, ...JSON.parse(existing.content) };
            }
        } catch {
            currentData.content = existing.content;
        }

        const { title, content, color, isPinned, tag } = req.body;
        const updatedData = {
            title: title !== undefined ? title.trim() : currentData.title,
            content: content !== undefined ? content.trim() : currentData.content,
            color: color !== undefined ? color : currentData.color,
            isPinned: isPinned !== undefined ? Boolean(isPinned) : currentData.isPinned,
            tag: tag !== undefined ? tag : currentData.tag
        };

        const updated = await prisma.note.update({
            where: { id },
            data: {
                content: JSON.stringify(updatedData)
            },
            include: {
                createdBy: { select: { id: true, name: true, email: true } }
            }
        });

        res.json({
            success: true,
            note: {
                id: updated.id,
                ...updatedData,
                createdAt: updated.createdAt,
                updatedAt: updated.updatedAt,
                createdBy: updated.createdBy
            }
        });
    } catch (err) { next(err); }
};

export const deleteStickyNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const ownerId = (req as any).user?.id;
        const companyId = (req as any).companyId || (req as any).user?.companyId;
        if (!ownerId) return res.status(401).json({ error: 'Unauthorized' });

        const existing = await prisma.note.findFirst({
            where: {
                id,
                relatedType: 'sticky_note',
                ...(companyId ? { companyId } : { createdById: ownerId })
            }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Sticky note not found' });
        }

        await prisma.note.delete({ where: { id } });
        res.json({ success: true, message: 'Sticky note deleted successfully' });
    } catch (err) { next(err); }
};
