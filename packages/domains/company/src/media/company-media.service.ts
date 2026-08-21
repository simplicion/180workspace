import { prisma } from '@workspace/db';
import { PrismaClient } from '@workspace/db';

export class CompanyMediaService {
    static async addMedia(companyId: string, imageUrl: string) {
        if (!imageUrl) {
            throw new Error('Image URL is required.');
        }

        const media = await prisma.companyMedia.create({
            data: {
                companyId,
                imageUrl
            }
        });

        return media;
    }

    static async deleteMedia(companyId: string, mediaId: string) {
        const existing = await prisma.companyMedia.findFirst({
            where: { id: mediaId, companyId }
        });

        if (!existing) {
            throw new Error('Media not found.');
        }

        await prisma.companyMedia.delete({
            where: { id: mediaId }
        });

        return true;
    }
}
