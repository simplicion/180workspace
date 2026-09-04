import { prisma } from '@workspace/db';

function formatNote(note: any) {
    if (!note) return note;
    let parsedContent: any = {};
    if (typeof note.content === 'string') {
        try {
            parsedContent = JSON.parse(note.content);
        } catch {
            parsedContent = { description: note.content };
        }
    } else if (typeof note.content === 'object' && note.content !== null) {
        parsedContent = note.content;
    }

    return {
        id: note.id,
        _id: note.id,
        version: note.version,
        title: note.title,
        description: parsedContent.description || '',
        features: parsedContent.features || [],
        fixes: parsedContent.fixes || [],
        isPublished: parsedContent.isPublished !== undefined ? parsedContent.isPublished : true,
        releaseDate: note.publishedAt || note.createdAt,
        publishedAt: note.publishedAt || note.createdAt,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
    };
}

export class ReleaseNoteRepository {
    static async list() {
        const notes = await prisma.releaseNote.findMany({
            orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }]
        });
        return notes.map(formatNote);
    }

    static async listPublished() {
        const notes = await prisma.releaseNote.findMany({
            orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }]
        });
        return notes.map(formatNote);
    }

    static async create(data: any, adminId?: string) {
        const { version, title, description, features, fixes, isPublished } = data;
        let finalVersion = version && version.trim() ? version.trim() : `v${new Date().toISOString().slice(0, 10).replace(/-/g, '.')}-${Date.now().toString().slice(-4)}`;
        
        const existing = await prisma.releaseNote.findUnique({ where: { version: finalVersion } });
        if (existing) {
            finalVersion = `${finalVersion}-${Math.floor(Math.random() * 1000)}`;
        }

        const content = JSON.stringify({
            description: description || '',
            features: Array.isArray(features) ? features : [],
            fixes: Array.isArray(fixes) ? fixes : [],
            isPublished: isPublished !== undefined ? isPublished : true,
        });

        const created = await prisma.releaseNote.create({
            data: {
                version: finalVersion,
                title: title || 'Release Announcement',
                content,
                publishedAt: new Date(),
            }
        });
        return formatNote(created);
    }

    static async update(id: string, data: any) {
        const { version, title, description, features, fixes, isPublished } = data;
        const updateData: any = {};
        if (version !== undefined && version.trim()) updateData.version = version.trim();
        if (title !== undefined) updateData.title = title;
        if (description !== undefined || features !== undefined || fixes !== undefined || isPublished !== undefined) {
            updateData.content = JSON.stringify({
                description: description || '',
                features: Array.isArray(features) ? features : [],
                fixes: Array.isArray(fixes) ? fixes : [],
                isPublished: isPublished !== undefined ? isPublished : true,
            });
        }

        const updated = await prisma.releaseNote.update({
            where: { id },
            data: updateData
        });
        return formatNote(updated);
    }

    static async remove(id: string) {
        await prisma.releaseNote.delete({ where: { id } });
        return true;
    }
}
