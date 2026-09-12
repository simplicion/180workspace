import { prisma, requestContext } from '@workspace/db';
import { PrismaClient } from '@workspace/db';

export class CompanyMediaService {
    static async addMedia(imageUrlOrUrls: string | string[], companyIdParam?: string) {
        const storeCompanyId = requestContext.getStore()?.companyId as string;
        const companyId = storeCompanyId || companyIdParam;
        if (!companyId) {
            throw new Error('Company context required');
        }

        if (Array.isArray(imageUrlOrUrls)) {
            const urls = imageUrlOrUrls.filter(Boolean);
            if (urls.length === 0) throw new Error('At least one image URL is required.');
            const created = await Promise.all(
                urls.map(url =>
                    prisma.companyMedia.create({
                        data: {
                            companyId,
                            imageUrl: url
                        }
                    })
                )
            );
            return created;
        }

        if (!imageUrlOrUrls) {
            throw new Error('Image URL is required.');
        }

        const media = await prisma.companyMedia.create({
            data: {
                companyId,
                imageUrl: imageUrlOrUrls
            }
        });

        return media;
    }

    static async deleteMedia(mediaId: string) {
        const companyId = requestContext.getStore()?.companyId as string;
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
