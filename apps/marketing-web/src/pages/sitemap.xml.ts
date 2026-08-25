import type { APIRoute } from 'astro';
import { prisma } from '@workspace/db';

export const GET: APIRoute = async () => {
  const baseUrl = 'https://180workspace.com';

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  try {
    // Fetch all public companies
    const companies = await prisma.company.findMany({
      select: { id: true, updatedAt: true },
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
      changeFrequency: 'daily',
      priority: 0.8,
    }));

    const userUrls = users.map((user) => ({
      url: `${baseUrl}/profile/${user.id}`,
      lastModified: user.updatedAt,
      changeFrequency: 'daily',
      priority: 0.8,
    }));

    const postUrls = posts.map((post) => ({
      url: `${baseUrl}/post/${post.id}`,
      lastModified: post.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

    const staticUrls = [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1.0,
      },
      {
        url: `${baseUrl}/login`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.5,
      },
      {
        url: `${baseUrl}/signup`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.5,
      },
    ];

    const allUrls = [...staticUrls, ...companyUrls, ...userUrls, ...postUrls];

    allUrls.forEach((item) => {
      xml += `
  <url>
    <loc>${item.url}</loc>
    <lastmod>${item.lastModified.toISOString()}</lastmod>
    <changefreq>${item.changeFrequency}</changefreq>
    <priority>${item.priority}</priority>
  </url>`;
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    xml += `
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;
  }

  xml += `
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
};
