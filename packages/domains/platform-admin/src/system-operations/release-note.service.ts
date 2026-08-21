import { ReleaseNoteRepository } from '../repositories/release-note.repository';

export class ReleaseNoteService {
    static async list() {
        return await ReleaseNoteRepository.list();
    }

    static async listPublished() {
        return await ReleaseNoteRepository.listPublished();
    }

    static async create(data: any, adminId: string) {
        return await ReleaseNoteRepository.create(data, adminId);
    }

    static async update(id: string, data: any) {
        return await ReleaseNoteRepository.update(id, data);
    }

    static async remove(id: string) {
        return await ReleaseNoteRepository.remove(id);
    }
}
