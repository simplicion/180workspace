import { PlatformUserRepository } from '../repositories/platform-user.repository';

export class PlatformUserService {
    static async list(page: number, limit: number, search: string, role: string) {
        const [users, total] = await PlatformUserRepository.list(page, limit, search, role);

        const usersWithContext = users.map(u => ({
            ...u,
            companyName: u.company?.name || 'SYSTEM',
            companyId: u.company?.id || null
        }));

        return { users: usersWithContext, total };
    }

    static async suspend(id: string) {
        await PlatformUserRepository.update(id, { isActive: false });
    }

    static async deleteUser(id: string) {
        await PlatformUserRepository.deleteUser(id);
    }

    static async bulkDelete(ids: string[]) {
        await PlatformUserRepository.bulkDelete(ids);
    }
}
