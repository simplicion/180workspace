import { prisma } from '@workspace/db';

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

function calculateReadingTime(text: string): number {
  if (!text) return 3;
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export class BlogRepository {
  static async list(filters?: { category?: string; published?: boolean; search?: string }) {
    const where: any = {};

    if (filters?.published !== undefined) {
      where.published = filters.published;
    }

    if (filters?.category && filters.category !== 'All') {
      where.category = filters.category;
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { excerpt: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } }
      ];
    }

    return await prisma.marketingBlog.findMany({
      where,
      orderBy: [
        { featured: 'desc' },
        { publishedAt: 'desc' },
        { createdAt: 'desc' }
      ]
    });
  }

  static async getById(id: string) {
    return await prisma.marketingBlog.findUnique({
      where: { id }
    });
  }

  static async getBySlug(slug: string) {
    return await prisma.marketingBlog.findUnique({
      where: { slug }
    });
  }

  static async create(data: any, _adminId?: string) {
    const title = data.title?.trim() || 'Untitled Article';
    let baseSlug = data.slug ? slugify(data.slug) : slugify(title);
    if (!baseSlug) baseSlug = `article-${Date.now()}`;

    // Ensure unique slug
    let finalSlug = baseSlug;
    const existing = await prisma.marketingBlog.findUnique({ where: { slug: finalSlug } });
    if (existing) {
      finalSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    }

    const contentMarkdown = data.contentMarkdown || '';
    const contentHtml = data.contentHtml || contentMarkdown;
    const readingTimeMin = data.readingTimeMin || calculateReadingTime(contentMarkdown || contentHtml);

    return await prisma.marketingBlog.create({
      data: {
        title,
        slug: finalSlug,
        category: data.category || 'Operations',
        tags: Array.isArray(data.tags) ? data.tags : [],
        seoTitle: data.seoTitle?.trim() || title,
        seoDescription: data.seoDescription?.trim() || data.excerpt?.trim() || title,
        keywords: Array.isArray(data.keywords) ? data.keywords : [],
        canonicalUrl: data.canonicalUrl || null,
        ogImageUrl: data.ogImageUrl || data.coverImageUrl || null,
        noIndex: Boolean(data.noIndex),
        excerpt: data.excerpt?.trim() || '',
        contentMarkdown,
        contentHtml,
        coverImageUrl: data.coverImageUrl || null,
        keyTakeaways: Array.isArray(data.keyTakeaways) ? data.keyTakeaways : [],
        readingTimeMin,
        authorName: data.authorName?.trim() || '180workspace Team',
        authorRole: data.authorRole?.trim() || 'Strategy & Engineering',
        authorAvatarUrl: data.authorAvatarUrl || null,
        authorBio: data.authorBio?.trim() || null,
        authorSocial: data.authorSocial?.trim() || null,
        relatedAppSlug: data.relatedAppSlug || null,
        ctaHeadline: data.ctaHeadline || null,
        ctaButtonText: data.ctaButtonText || null,
        faqs: data.faqs || null,
        featured: Boolean(data.featured),
        published: Boolean(data.published),
        publishedAt: data.published ? (data.publishedAt ? new Date(data.publishedAt) : new Date()) : null,
      } as any
    });
  }

  static async update(id: string, data: any) {
    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.category !== undefined) updateData.category = data.category;
    if (data.tags !== undefined) updateData.tags = Array.isArray(data.tags) ? data.tags : [];
    if (data.seoTitle !== undefined) updateData.seoTitle = data.seoTitle.trim();
    if (data.seoDescription !== undefined) updateData.seoDescription = data.seoDescription.trim();
    if (data.keywords !== undefined) updateData.keywords = Array.isArray(data.keywords) ? data.keywords : [];
    if (data.canonicalUrl !== undefined) updateData.canonicalUrl = data.canonicalUrl || null;
    if (data.ogImageUrl !== undefined) updateData.ogImageUrl = data.ogImageUrl || null;
    if (data.noIndex !== undefined) updateData.noIndex = Boolean(data.noIndex);
    if (data.excerpt !== undefined) updateData.excerpt = data.excerpt.trim();
    if (data.contentMarkdown !== undefined) updateData.contentMarkdown = data.contentMarkdown;
    if (data.contentHtml !== undefined) updateData.contentHtml = data.contentHtml;
    if (data.coverImageUrl !== undefined) updateData.coverImageUrl = data.coverImageUrl || null;
    if (data.keyTakeaways !== undefined) updateData.keyTakeaways = Array.isArray(data.keyTakeaways) ? data.keyTakeaways : [];
    if (data.readingTimeMin !== undefined) {
      updateData.readingTimeMin = Number(data.readingTimeMin);
    } else if (data.contentMarkdown) {
      updateData.readingTimeMin = calculateReadingTime(data.contentMarkdown);
    }

    if (data.authorName !== undefined) updateData.authorName = data.authorName.trim();
    if (data.authorRole !== undefined) updateData.authorRole = data.authorRole.trim();
    if (data.authorAvatarUrl !== undefined) updateData.authorAvatarUrl = data.authorAvatarUrl || null;
    if (data.authorBio !== undefined) updateData.authorBio = data.authorBio.trim() || null;
    if (data.authorSocial !== undefined) updateData.authorSocial = data.authorSocial.trim() || null;

    if (data.relatedAppSlug !== undefined) updateData.relatedAppSlug = data.relatedAppSlug || null;
    if (data.ctaHeadline !== undefined) updateData.ctaHeadline = data.ctaHeadline || null;
    if (data.ctaButtonText !== undefined) updateData.ctaButtonText = data.ctaButtonText || null;
    if (data.faqs !== undefined) updateData.faqs = data.faqs;
    if (data.featured !== undefined) updateData.featured = Boolean(data.featured);

    if (data.slug !== undefined) {
      const cleanSlug = slugify(data.slug);
      const existing = await prisma.marketingBlog.findFirst({
        where: { slug: cleanSlug, NOT: { id } }
      });
      if (!existing) {
        updateData.slug = cleanSlug;
      }
    }

    if (data.published !== undefined) {
      updateData.published = Boolean(data.published);
      if (data.published && !data.publishedAt) {
        updateData.publishedAt = new Date();
      } else if (data.publishedAt) {
        updateData.publishedAt = new Date(data.publishedAt);
      }
    }

    return await prisma.marketingBlog.update({
      where: { id },
      data: updateData
    });
  }

  static async togglePublish(id: string) {
    const existing = await prisma.marketingBlog.findUnique({ where: { id } });
    if (!existing) throw new Error('Blog article not found');

    const nextPublished = !existing.published;
    return await prisma.marketingBlog.update({
      where: { id },
      data: {
        published: nextPublished,
        publishedAt: nextPublished ? (existing.publishedAt || new Date()) : existing.publishedAt
      }
    });
  }

  static async remove(id: string) {
    return await prisma.marketingBlog.delete({
      where: { id }
    });
  }

  static async incrementViews(slug: string) {
    return await prisma.marketingBlog.update({
      where: { slug },
      data: {
        viewsCount: { increment: 1 }
      }
    });
  }
}
