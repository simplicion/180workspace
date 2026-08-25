import { CompanyServicesRepository } from '../repositories/company-services.repository';
import { requestContext } from '@workspace/db';

export class CompanyServicesService {
    static async createService(name: string, description: string, startingPrice: number, imageUrl: string, detailedDescription: string) {
        const companyId = requestContext.getStore()?.companyId as string;
        const newService = await CompanyServicesRepository.create(
            name,
            description,
            startingPrice.toString(),
            imageUrl,
            detailedDescription
        );
        return newService;
    }

    static async updateService(serviceId: string, name: string, description: string, startingPrice: number, imageUrl: string, detailedDescription: string) {
        const companyId = requestContext.getStore()?.companyId as string;
        const existingService = await CompanyServicesRepository.findByIdAndCompany(serviceId);

        if (!existingService) {
            throw new Error('Service not found or unauthorized.');
        }

        const updatedService = await CompanyServicesRepository.update(
            serviceId,
            name,
            description,
            String(startingPrice),
            imageUrl,
            detailedDescription
        );
        return updatedService;
    }

    static async deleteService(serviceId: string) {
        const companyId = requestContext.getStore()?.companyId as string;
        const existingService = await CompanyServicesRepository.findByIdAndCompany(serviceId);

        if (!existingService) {
            throw new Error('Service not found or unauthorized.');
        }

        await CompanyServicesRepository.delete(serviceId);
        return true;
    }

    static async getPublicServiceDetails(companyId: string, serviceId: string) {
        const service = await CompanyServicesRepository.findByIdAndCompany(serviceId, companyId);

        if (!service) {
            throw new Error('Service not found.');
        }

        return service;
    }

    static async createServiceRequest(companyId: string, serviceId: string, requirements: string, requesterEmail: string, requesterName: string) {
        if (!requirements || !requesterEmail) {
            throw new Error('Requirements and email are required.');
        }

        const service = await CompanyServicesRepository.findByIdAndCompany(serviceId, companyId);

        if (!service) {
            throw new Error('Service not found.');
        }

        const newRequest = await CompanyServicesRepository.createRequest(
            serviceId,
            companyId,
            requesterEmail,
            requesterName || 'Unknown User',
            requirements
        );
        return newRequest;
    }

    static async getServiceRequests() {
        const requests = await CompanyServicesRepository.getRequests();
        return requests;
    }
}
