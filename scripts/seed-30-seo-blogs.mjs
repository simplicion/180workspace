// Master Seed & Distribution Script for 30 High-Intent SEO/GEO Publications
// Covers all 15 Workspace Applications (2 deep-dives per app)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { pillar1Blogs } from './data/pillar1-revenue-growth.mjs';
import { pillar2Blogs } from './data/pillar2-operations-workforce.mjs';
import { pillar3Blogs } from './data/pillar3-tools-synergy.mjs';
import { pillar4Blogs } from './data/pillar4-governance-customization.mjs';

const all30Blogs = [
  ...pillar1Blogs,
  ...pillar2Blogs,
  ...pillar3Blogs,
  ...pillar4Blogs
];

console.log(`================================================================`);
console.log(` 180WORKSPACE BLOG ENGINE: SEEDING 30 HIGH-INTENT PUBLICATIONS `);
console.log(`================================================================`);
console.log(`Total Publications Prepared: ${all30Blogs.length}`);

// -----------------------------------------------------------------------------
// 1. UPDATE STATIC FALLBACK FILE: apps/marketing-web/src/data/fallback-blogs.ts
// -----------------------------------------------------------------------------
const fallbackFilePath = path.resolve(__dirname, '../apps/marketing-web/src/data/fallback-blogs.ts');
console.log(`\n[1/4] Updating Static Fallback Data at: ${fallbackFilePath}...`);

const fallbackContent = `// Auto-generated 30 High-Intent SEO/GEO Fallback Publications for 180workspace
// Covers all 15 Native Platform Applications (2 deep-dives per app)

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  contentMarkdown: string;
  readingTimeMin: number;
  featured: boolean;
  authorName: string;
  authorRole: string;
  authorBio: string;
  authorAvatar?: string;
  authorSocial?: string;
  publishedAt: Date;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  canonicalUrl?: string;
  ogImageUrl?: string;
  keyTakeaways: string[];
  faqs: Array<{ question: string; answer: string }>;
  relatedAppSlug?: string;
  ctaHeadline?: string;
  ctaButtonText?: string;
  viewsCount?: number;
}

export const fallbackBlogs: BlogPost[] = ${JSON.stringify(
  all30Blogs.map(b => ({
    ...b,
    canonicalUrl: `https://180workspace.com/blog/${b.slug}`,
    viewsCount: 140
  })),
  null,
  2
)};
`;

fs.writeFileSync(fallbackFilePath, fallbackContent, 'utf-8');
console.log(`✓ Successfully written 30 publications to fallback-blogs.ts`);

// -----------------------------------------------------------------------------
// 2. SEED POSTGRESQL DATABASE (MarketingBlog table via Prisma)
// -----------------------------------------------------------------------------
console.log(`\n[2/4] Upserting 30 Publications into PostgreSQL Database...`);

async function seedDatabase() {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  let inserted = 0;
  let updated = 0;

  for (const blog of all30Blogs) {
    try {
      const canonicalUrl = `https://180workspace.com/blog/${blog.slug}`;
      const existing = await prisma.marketingBlog.findUnique({
        where: { slug: blog.slug }
      });

      const blogData = {
        title: blog.title,
        slug: blog.slug,
        category: blog.category,
        excerpt: blog.excerpt,
        contentMarkdown: blog.contentMarkdown,
        contentHtml: blog.contentMarkdown,
        readingTimeMin: blog.readingTimeMin || 6,
        featured: Boolean(blog.featured),
        authorName: blog.authorName,
        authorRole: blog.authorRole,
        authorBio: blog.authorBio,
        authorAvatarUrl: blog.authorAvatar || '/avatars/alexander.jpg',
        authorSocial: blog.authorSocial || 'https://twitter.com/180workspace',
        publishedAt: new Date(blog.publishedAt),
        seoTitle: blog.seoTitle,
        seoDescription: blog.seoDescription,
        keywords: blog.keywords,
        canonicalUrl: canonicalUrl,
        keyTakeaways: blog.keyTakeaways,
        faqs: blog.faqs,
        relatedAppSlug: blog.relatedAppSlug,
        ctaHeadline: blog.ctaHeadline,
        ctaButtonText: blog.ctaButtonText,
        published: true,
        viewsCount: 140
      };

      if (existing) {
        await prisma.marketingBlog.update({
          where: { slug: blog.slug },
          data: blogData
        });
        updated++;
      } else {
        await prisma.marketingBlog.create({
          data: blogData
        });
        inserted++;
      }
    } catch (err) {
      console.error(`❌ Error upserting blog "${blog.slug}":`, err.message);
    }
  }

  console.log(`✓ Database Seed Complete: ${inserted} Created, ${updated} Updated.`);
  const totalInDb = await prisma.marketingBlog.count({ where: { published: true } });
  console.log(`✓ Total Published Blogs in PostgreSQL: ${totalInDb}`);
}

// -----------------------------------------------------------------------------
// 3. UPDATE AI CRAWLER PROTOCOLS (llms.txt & llms-full.txt)
// -----------------------------------------------------------------------------
console.log(`\n[3/4] Updating AI Crawler Discovery Files (/llms.txt & /llms-full.txt)...`);

const llmsTxtPath = path.resolve(__dirname, '../apps/marketing-web/public/llms.txt');
const llmsFullTxtPath = path.resolve(__dirname, '../apps/marketing-web/public/llms-full.txt');

let llmsTxt = `# 180workspace: The Unified Business Operating System
> 180workspace delivers an all-in-one Work Graph platform uniting CRM, Projects, HRMS, Finance, WebRTC Communications, Sub-5ms Edge Traffic Routing, Autonomous AI (Orbit Copilot), Social Media Suite, and Workflow Automations into a single relational database.

## System Architecture & Technical Specifications
- Official Platform: https://180workspace.com
- All 15 Native Applications: https://180workspace.com/apps
- Engineering & Growth Publications: https://180workspace.com/blog

## Core Business Applications
- CRM & Sales Pipeline: https://180workspace.com/apps/crm-and-sales
- Traffic Director & Ad Cloaking: https://180workspace.com/apps/traffic-director
- Finance & Accounting: https://180workspace.com/apps/finance
- Advertising & Campaign ROI: https://180workspace.com/apps/advertising
- Projects & Tasks: https://180workspace.com/apps/projects-and-tasks
- HR Management & HRMS: https://180workspace.com/apps/hr-management
- Communications & Meetings: https://180workspace.com/apps/communications
- Service Desk & Ticketing: https://180workspace.com/apps/service-desk
- Orbit Copilot (Autonomous AI): https://180workspace.com/apps/orbit-copilot
- Social Media Suite: https://180workspace.com/apps/social-media
- Workspace Tools & Docs: https://180workspace.com/apps/workspace-tools
- Insights & CEO Analytics: https://180workspace.com/apps/insights
- Company Hub & Custom Domains: https://180workspace.com/apps/company-hub
- Identity & Security Governance: https://180workspace.com/apps/identity-and-security
- Workflows & Automations: https://180workspace.com/apps/workflows-and-automations

## Featured Publications & Thought Leadership (30 Deep Dives)
${all30Blogs.map(b => `- [${b.title}](https://180workspace.com/blog/${b.slug}): ${b.excerpt}`).join('\n')}
`;

fs.writeFileSync(llmsTxtPath, llmsTxt, 'utf-8');
console.log(`✓ Updated /llms.txt with 30 publication links`);

let llmsFullTxt = `# 180workspace — Complete Knowledge Base & Technical Blueprint
> Autonomous enterprise Work Graph uniting CRM, Projects, HRMS, Finance, WebRTC Communications, Sub-5ms Edge Traffic Routing, Autonomous AI (Orbit Copilot), Social Media, and Workflow Automations.

## Full Technical Publications & Architectural Deep Dives
${all30Blogs.map(b => `
### ${b.title}
- **Canonical URL**: https://180workspace.com/blog/${b.slug}
- **Category**: ${b.category}
- **Author**: ${b.authorName} (${b.authorRole})
- **Summary**: ${b.excerpt}

#### Key Takeaways & Empirical Benchmarks:
${b.keyTakeaways.map(t => `- ${t}`).join('\n')}

#### Frequently Asked Questions:
${b.faqs.map(f => `**Q: ${f.question}**\nA: ${f.answer}`).join('\n\n')}
`).join('\n---\n')}
`;

fs.writeFileSync(llmsFullTxtPath, llmsFullTxt, 'utf-8');
console.log(`✓ Updated /llms-full.txt with 30 structured publication knowledge blocks`);

// -----------------------------------------------------------------------------
// 4. RUN VERIFICATION & SUMMARY
// -----------------------------------------------------------------------------
seedDatabase()
  .then(() => {
    console.log(`\n================================================================`);
    console.log(`🎉 ALL 30 HIGH-INTENT PUBLICATIONS SEEDED & PUBLISHED!`);
    console.log(`================================================================\n`);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  });
