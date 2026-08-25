import { prisma, requestContext } from '@workspace/db';
import { PrismaClient } from '@workspace/db';

export class CompanyProductsService {
    static async createProduct(name: string, description: string, link: string, logoUrl: string) {
        const companyId = requestContext.getStore()?.companyId as string;
        if (!name) {
            throw new Error('Product name is required.');
        }

        const product = await prisma.companyProduct.create({
            data: {
                companyId,
                name,
                description,
                link,
                logoUrl
            }
        });

        return product;
    }

    static async updateProduct(productId: string, name?: string, description?: string, link?: string, logoUrl?: string) {
        const companyId = requestContext.getStore()?.companyId as string;
        const existing = await prisma.companyProduct.findFirst({
            where: { id: productId, companyId }
        });

        if (!existing) {
            throw new Error('Product not found.');
        }

        const product = await prisma.companyProduct.update({
            where: { id: productId },
            data: {
                name: name !== undefined ? name : existing.name,
                description: description !== undefined ? description : existing.description,
                link: link !== undefined ? link : existing.link,
                logoUrl: logoUrl !== undefined ? logoUrl : existing.logoUrl,
            }
        });

        return product;
    }

    static async deleteProduct(productId: string) {
        const companyId = requestContext.getStore()?.companyId as string;
        const existing = await prisma.companyProduct.findFirst({
            where: { id: productId, companyId }
        });

        if (!existing) {
            throw new Error('Product not found.');
        }

        await prisma.companyProduct.delete({
            where: { id: productId }
        });

        return true;
    }
}
