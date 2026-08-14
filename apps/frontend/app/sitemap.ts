import { MetadataRoute } from 'next';
import { prisma } from '@workspace/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://180workspace.com';

  try {
    // Fetch all public companies
    const companies = await prisma.company.findMany({
      select: { id: true, updatedAt: true },
      // Optional: Add conditions here for public companies if needed
    });

    // Fetch all users
    const users = await prisma.user.findMany({
      select: { id: true, updatedAt: true },
    });

    // Fetch all posts
    const posts = await prisma.forumPost.findMany({
      select: { id: true, updatedAt: true },
    });

    const companyUrls = companies.map((company) => ({
      url: `${baseUrl}/company/${company.id}`,
      lastModified: company.updatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));

    const userUrls = users.map((user) => ({
      url: `${baseUrl}/profile/${user.id}`,
      lastModified: user.updatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));

    const postUrls = posts.map((post) => ({
      url: `${baseUrl}/post/${post.id}`,
      lastModified: post.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

    const staticUrls = [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 1.0,
      },
      {
        url: `${baseUrl}/login`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      },
      {
        url: `${baseUrl}/signup`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      },
    ];

    return [...staticUrls, ...companyUrls, ...userUrls, ...postUrls];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1.0,
      }
    ];
  }
}
