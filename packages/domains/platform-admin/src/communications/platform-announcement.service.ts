import { PlatformAnnouncementRepository } from '../repositories/platform-announcement.repository';

export class PlatformAnnouncementService {
    static async list() {
        return await PlatformAnnouncementRepository.list();
    }

    static async listActive() {
        return await PlatformAnnouncementRepository.listActive();
    }

    static async create(data: any, createdBy: string) {
        return await PlatformAnnouncementRepository.create({ ...data, createdBy });
    }

    static async update(id: string, data: any) {
        return await PlatformAnnouncementRepository.update(id, data);
    }

    static async remove(id: string) {
        return await PlatformAnnouncementRepository.remove(id);
    }
}
