import { prisma } from '@workspace/db';
import { PrismaClient } from '@workspace/db';

export class CompanyCoreValuesService {
    static async addCoreValue(userId: string, title: string, description: string, iconUrl?: string) {
        if (!title || !description) {
            throw new Error('Title and description are required');
        }

        const company = await prisma.company.findFirst({
            where: {
                users: {
                    some: {
                        id: userId
                    }
                }
            }
        });

        if (!company) {
            throw new Error('Company not found');
        }

        const currentCoreValues = await prisma.companyCoreValue.count({
            where: { companyId: company.id }
        });

        if (currentCoreValues >= 10) {
            throw new Error('You can add a maximum of 10 core values');
        }

        const newCoreValue = await prisma.companyCoreValue.create({
            data: {
                companyId: company.id,
                title,
                description,
                iconUrl: iconUrl || null
            }
        });

        return newCoreValue;
    }

    static async deleteCoreValue(userId: string, coreValueId: string) {
        const company = await prisma.company.findFirst({
            where: {
                users: {
                    some: {
                        id: userId
                    }
                }
            }
        });

        if (!company) {
            throw new Error('Company not found');
        }

        const coreValue = await prisma.companyCoreValue.findFirst({
            where: {
                id: coreValueId,
                companyId: company.id
            }
        });

        if (!coreValue) {
            throw new Error('Core value not found or unauthorized');
        }

        await prisma.companyCoreValue.delete({
            where: {
                id: coreValueId
            }
        });

        return true;
    }
}
