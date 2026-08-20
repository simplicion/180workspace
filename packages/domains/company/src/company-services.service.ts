import { prisma } from '@workspace/db';
import { PrismaClient } from '@workspace/db';

export class CompanyServicesService {
    static async createService(companyId: string, name: string, description: string, startingPrice: number, imageUrl: string, detailedDescription: string) {
        const newService = await prisma.companyService.create({
            data: {
                companyId,
                name,
                description,
                startingPrice: String(startingPrice),
                imageUrl,
                detailedDescription
            }
        });
        return newService;
    }

    static async updateService(companyId: string, serviceId: string, name: string, description: string, startingPrice: number, imageUrl: string, detailedDescription: string) {
        const existingService = await prisma.companyService.findFirst({
            where: { id: serviceId, companyId }
        });

        if (!existingService) {
            throw new Error('Service not found or unauthorized.');
        }

        const updatedService = await prisma.companyService.update({
            where: { id: serviceId },
            data: {
                name,
                description,
                startingPrice: String(startingPrice),
                imageUrl,
                detailedDescription
            }
        });
        return updatedService;
    }

    static async deleteService(companyId: string, serviceId: string) {
        const existingService = await prisma.companyService.findFirst({
            where: { id: serviceId, companyId }
        });

        if (!existingService) {
            throw new Error('Service not found or unauthorized.');
        }

        await prisma.companyService.delete({
            where: { id: serviceId }
        });
        return true;
    }

    static async getPublicServiceDetails(companyId: string, serviceId: string) {
        const service = await prisma.companyService.findFirst({
            where: { id: serviceId, companyId }
        });

        if (!service) {
            throw new Error('Service not found.');
        }

        return service;
    }

    static async createServiceRequest(companyId: string, serviceId: string, requirements: string, requesterEmail: string, requesterName: string) {
        if (!requirements || !requesterEmail) {
            throw new Error('Requirements and email are required.');
        }

        const service = await prisma.companyService.findFirst({
            where: { id: serviceId, companyId }
        });

        if (!service) {
            throw new Error('Service not found.');
        }

        const newRequest = await prisma.serviceRequest.create({
            data: {
                serviceId,
                companyId,
                requesterEmail,
                requesterName: requesterName || 'Unknown User',
                requirements
            }
        });
        return newRequest;
    }

    static async getServiceRequests(companyId: string) {
        const requests = await prisma.serviceRequest.findMany({
            where: { companyId },
            include: {
                service: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return requests;
    }
}
