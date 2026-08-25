import { CompanyOfferingsRepository } from '../repositories/company-offerings.repository';
import { requestContext } from '@workspace/db';

export class CompanyOfferingsService {
    static async createOffering(name: string, description: string, startingPrice: number, imageUrl: string, detailedDescription: string, link: string = '') {
        const companyId = requestContext.getStore()?.companyId as string;
        const newOffering = await CompanyOfferingsRepository.create(
            name,
            description,
            startingPrice.toString(),
            imageUrl,
            detailedDescription,
            link
        );
        return newOffering;
    }

    static async updateOffering(offeringId: string, name: string, description: string, startingPrice: number, imageUrl: string, detailedDescription: string, link: string = '') {
        const companyId = requestContext.getStore()?.companyId as string;
        const existingOffering = await CompanyOfferingsRepository.findByIdAndCompany(offeringId);

        if (!existingOffering) {
            throw new Error('Offering not found or unauthorized.');
        }

        const updatedOffering = await CompanyOfferingsRepository.update(
            offeringId,
            name,
            description,
            String(startingPrice),
            imageUrl,
            detailedDescription,
            link
        );
        return updatedOffering;
    }

    static async deleteOffering(offeringId: string) {
        const companyId = requestContext.getStore()?.companyId as string;
        const existingOffering = await CompanyOfferingsRepository.findByIdAndCompany(offeringId);

        if (!existingOffering) {
            throw new Error('Offering not found or unauthorized.');
        }

        await CompanyOfferingsRepository.delete(offeringId);
        return true;
    }

    static async getPublicOfferingDetails(companyId: string, offeringId: string) {
        const offering = await CompanyOfferingsRepository.findByIdAndCompany(offeringId, companyId);

        if (!offering) {
            throw new Error('Offering not found.');
        }

        return offering;
    }

    static async createOfferingRequest(companyId: string, offeringId: string, requirements: string, requesterEmail: string, requesterName: string) {
        if (!requirements || !requesterEmail) {
            throw new Error('Requirements and email are required.');
        }

        const offering = await CompanyOfferingsRepository.findByIdAndCompany(offeringId, companyId);

        if (!offering) {
            throw new Error('Offering not found.');
        }

        const newRequest = await CompanyOfferingsRepository.createRequest(
            offeringId,
            companyId,
            requesterEmail,
            requesterName || 'Unknown User',
            requirements
        );
        return newRequest;
    }

    static async getOfferingRequests() {
        const requests = await CompanyOfferingsRepository.getRequests();
        return requests;
    }
}
