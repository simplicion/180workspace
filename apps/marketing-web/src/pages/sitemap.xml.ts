import type { APIRoute } from 'astro';
import { prisma } from '@workspace/db';
import { fallbackBlogs } from '../data/fallback-blogs';

export const GET: APIRoute = async () => {
  const baseUrl = 'https://180workspace.com';
  const now = new Date().toISOString();

  // Core Platform URLs
  const corePages = [
    { url: `${baseUrl}`, priority: 1.0, changeFrequency: 'daily' },
    { url: `${baseUrl}/apps`, priority: 0.95, changeFrequency: 'weekly' },
    { url: `${baseUrl}/pricing`, priority: 0.95, changeFrequency: 'daily' },
    { url: `${baseUrl}/enterprise`, priority: 0.90, changeFrequency: 'weekly' },
    { url: `${baseUrl}/developers`, priority: 0.90, changeFrequency: 'weekly' },
    { url: `${baseUrl}/features`, priority: 0.85, changeFrequency: 'weekly' },
    { url: `${baseUrl}/case-studies`, priority: 0.85, changeFrequency: 'monthly' },
    { url: `${baseUrl}/blog`, priority: 0.90, changeFrequency: 'daily' },
    { url: `${baseUrl}/privacy`, priority: 0.70, changeFrequency: 'monthly' },
    { url: `${baseUrl}/terms`, priority: 0.70, changeFrequency: 'monthly' },
  ];

  // All 16 Business Applications
  const appSlugs = [
    'crm-and-sales',
    'traffic-director',
    'finance',
    'projects-and-tasks',
    'hr-management',
    'communications',
    'service-desk',
    'orbit-copilot',
    'social-media',
    'workspace-tools',
    'insights',
    'company-hub',
    'advertising',
    'identity-and-security',
    'workflows-and-automations'
  ];

  const appPages = appSlugs.map(slug => ({
    url: `${baseUrl}/apps/${slug}`,
    priority: 0.90,
    changeFrequency: 'weekly',
    lastModified: now,
  }));

  let dynamicBlogPages: Array<{ url: string; priority: number; changeFrequency: string; lastModified: string }> = [];
  const blogMap = new Map<string, { url: string; priority: number; changeFrequency: string; lastModified: string }>();

    // Add fallback blogs first
    fallbackBlogs.forEach(b => {
      const pubDate = b.publishedAt ? new Date(b.publishedAt).toISOString() : now;
      blogMap.set(b.slug, {
        url: `${baseUrl}/blog/${b.slug}`,
        priority: 0.85,
        changeFrequency: 'weekly',
        lastModified: pubDate
      });
    });

    if (process.env.DATABASE_URL) {
      try {
        const publishedBlogs = await prisma.marketingBlog.findMany({
          where: { published: true },
          select: { slug: true, updatedAt: true, publishedAt: true }
        });

        publishedBlogs.forEach(b => {
          const modDate = b.updatedAt || b.publishedAt ? new Date(b.updatedAt || b.publishedAt).toISOString() : now;
          blogMap.set(b.slug, {
            url: `${baseUrl}/blog/${b.slug}`,
            priority: 0.85,
            changeFrequency: 'weekly',
            lastModified: modDate
          });
        });
      } catch (err) {
        console.warn("Could not query published blogs for sitemap, using defaults:", err);
      }
    }

    dynamicBlogPages = Array.from(blogMap.values());

  let dynamicFeaturePages: Array<{ url: string; priority: number; changeFrequency: string; lastModified: string }> = [];
  if (process.env.DATABASE_URL) {
    try {
      const publishedFeatures = await prisma.marketingPage.findMany({
        where: { type: 'FEATURE', published: true },
        select: { slug: true, updatedAt: true }
      });

      dynamicFeaturePages = publishedFeatures.map(f => ({
        url: `${baseUrl}/features/${f.slug}`,
        priority: 0.75,
        changeFrequency: 'monthly',
        lastModified: (f.updatedAt || new Date()).toISOString()
      }));
    } catch (err) {
      console.warn("Could not query published features for sitemap:", err);
    }
  }

  const allEntries = [
    ...corePages.map(p => ({ ...p, lastModified: now })),
    ...appPages,
    ...dynamicBlogPages,
    ...dynamicFeaturePages
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${allEntries.map(entry => `  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.lastModified}</lastmod>
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority.toFixed(2)}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
};
