import { prisma, requestContext } from '@workspace/db';

export class CompanyServicesRepository {
    static async create(name: string, description: string, startingPrice: string, imageUrl: string, detailedDescription: string) {
        const companyId = requestContext.getStore()?.companyId as string;
        if (!companyId) throw new Error('Company ID is required in context');
        return prisma.companyService.create({
            data: {
                companyId,
                name,
                description,
                startingPrice,
                imageUrl,
                detailedDescription
            }
        });
    }

    static async findByIdAndCompany(id: string, explicitCompanyId?: string) {
        const companyId = explicitCompanyId || (requestContext.getStore()?.companyId as string);
        return prisma.companyService.findFirst({
            where: { id, companyId }
        });
    }

    static async update(id: string, name: string, description: string, startingPrice: string, imageUrl: string, detailedDescription: string) {
        return prisma.companyService.update({
            where: { id },
            data: {
                name,
                description,
                startingPrice,
                imageUrl,
                detailedDescription
            }
        });
    }

    static async delete(id: string) {
        return prisma.companyService.delete({
            where: { id }
        });
    }

    static async createRequest(serviceId: string, companyId: string, requesterEmail: string, requesterName: string, requirements: string) {
        return prisma.serviceRequest.create({
            data: {
                serviceId,
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
