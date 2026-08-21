import { prisma } from '@workspace/db';

export class ReleaseNoteRepository {
    static async list() {
        return await prisma.releaseNote.findMany({
            orderBy: [{ version: 'desc' }, { createdAt: 'desc' }]
        });
    }

    static async listPublished() {
        return await prisma.releaseNote.findMany({
            orderBy: [{ version: 'desc' }, { createdAt: 'desc' }]
        });
    }

    static async create(data: any, adminId: string) {
        return await prisma.releaseNote.create({
            data: {
                ...data,
                createdBy: adminId
            }
        });
    }

    static async update(id: string, data: any) {
        return await prisma.releaseNote.update({
            where: { id },
            data
        });
    }

    static async remove(id: string) {
        await prisma.releaseNote.delete({ where: { id } });
        return true;
    }
}
