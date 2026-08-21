import { CompanyServicesRepository } from '../repositories/company-services.repository';export class CompanyServicesService {
    static async createService(companyId: string, name: string, description: string, startingPrice: number, imageUrl: string, detailedDescription: string) {
        const newService = await CompanyServicesRepository.create(
            companyId,
            name,
            description,
            String(startingPrice),
            imageUrl,
            detailedDescription
        );
        return newService;
    }

    static async updateService(companyId: string, serviceId: string, name: string, description: string, startingPrice: number, imageUrl: string, detailedDescription: string) {
        const existingService = await CompanyServicesRepository.findByIdAndCompany(serviceId, companyId);

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

    static async deleteService(companyId: string, serviceId: string) {
        const existingService = await CompanyServicesRepository.findByIdAndCompany(serviceId, companyId);

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

    static async getServiceRequests(companyId: string) {
        const requests = await CompanyServicesRepository.getRequests(companyId);
        return requests;
    }
}
