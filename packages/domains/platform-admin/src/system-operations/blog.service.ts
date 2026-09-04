import { BlogRepository } from '../repositories/blog.repository';

export class BlogService {
  static async list(filters?: { category?: string; published?: boolean; search?: string }) {
    return await BlogRepository.list(filters);
  }

  static async getById(id: string) {
    return await BlogRepository.getById(id);
  }

  static async getBySlug(slug: string) {
    return await BlogRepository.getBySlug(slug);
  }

  static async create(data: any, adminId?: string) {
    return await BlogRepository.create(data, adminId);
  }

  static async update(id: string, data: any) {
    return await BlogRepository.update(id, data);
  }

  static async togglePublish(id: string) {
    return await BlogRepository.togglePublish(id);
  }

  static async remove(id: string) {
    return await BlogRepository.remove(id);
  }

  static async incrementViews(slug: string) {
    return await BlogRepository.incrementViews(slug);
  }
}
