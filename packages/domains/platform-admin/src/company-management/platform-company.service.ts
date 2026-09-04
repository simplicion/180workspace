import { PlatformCompanyRepository } from '../repositories/platform-company.repository';
import * as bcrypt from 'bcryptjs';

export class PlatformCompanyService {
    static async list(page: number, limit: number, search: string, status: string) {
        const [companies, total] = await PlatformCompanyRepository.list(page, limit, search, status);
        const mapped = companies.map(c => ({
            ...c,
            companyName: c.name || (c as any).companyName || 'Unnamed Company',
        }));
        return { companies: mapped, total, page, totalPages: Math.ceil(total / limit) };
    }

    static async getOne(id: string) {
        const result = await PlatformCompanyRepository.getCompanyDetailed(id);
        if (!result) throw new Error('Company not found');
        return result;
    }

    static async suspend(id: string, reason: string) {
        try {
            const company = await PlatformCompanyRepository.update(id, {
                accountStatus: 'suspended',
                subscriptionStatus: 'suspended',
                metadata: { suspendedReason: reason, suspendedAt: new Date().toISOString() },
            });
            return company;
        } catch (err: any) {
            if (err.code === 'P2025') throw new Error('Company not found');
            throw err;
        }
    }

    static async unsuspend(id: string) {
        try {
            const company = await PlatformCompanyRepository.update(id, {
                accountStatus: 'active',
                subscriptionStatus: 'active',
                metadata: {},
            });
            return company;
        } catch (err: any) {
            if (err.code === 'P2025') throw new Error('Company not found');
            throw err;
        }
    }

    static async resetAdminPassword(id: string, newPassword: string) {
        const company = await PlatformCompanyRepository.findById(id);
        if (!company) throw new Error('Company not found');

        if (!newPassword || newPassword.length < 8) {
            throw new Error('New password must be at least 8 characters');
        }

        const hashed = await bcrypt.hash(newPassword, 12);
        await PlatformCompanyRepository.updateAdminPassword(company.adminEmail, hashed);

        return company.adminEmail;
    }

    static async create(data: any) {
        return await PlatformCompanyRepository.create(data);
    }
}
