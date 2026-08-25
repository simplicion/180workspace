import { prisma, requestContext } from '@workspace/db';

export class CompanyOfferingsRepository {
    static async create(name: string, description: string, startingPrice: string, imageUrl: string, detailedDescription: string, link: string = '') {
        const companyId = requestContext.getStore()?.companyId as string;
        if (!companyId) throw new Error('Company ID is required in context');
        return prisma.companyOffering.create({
            data: {
                companyId,
                name,
                description,
                startingPrice,
                imageUrl,
                detailedDescription,
                link
            }
        });
    }

    static async findByIdAndCompany(id: string, explicitCompanyId?: string) {
        const companyId = explicitCompanyId || (requestContext.getStore()?.companyId as string);
        return prisma.companyOffering.findFirst({
            where: { id, companyId }
        });
    }

    static async update(id: string, name: string, description: string, startingPrice: string, imageUrl: string, detailedDescription: string, link: string = '') {
        return prisma.companyOffering.update({
            where: { id },
            data: {
                name,
                description,
                startingPrice,
                imageUrl,
                detailedDescription,
                link
            }
        });
    }

    static async delete(id: string) {
        return prisma.companyOffering.delete({
            where: { id }
        });
    }

    static async createRequest(offeringId: string, companyId: string, requesterEmail: string, requesterName: string, requirements: string) {
        return prisma.serviceRequest.create({
            data: {
                serviceId: offeringId,
                companyId,
                requesterEmail,
                requesterName,
                requirements
            }
        });
    }

    static async getRequests(explicitCompanyId?: string) {
        const companyId = explicitCompanyId || (requestContext.getStore()?.companyId as string);
        return prisma.serviceRequest.findMany({
            where: { companyId },
            include: {
                service: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
}
