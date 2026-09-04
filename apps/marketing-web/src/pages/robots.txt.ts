import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const robots = `# 180workspace Robots Directives
# Optimized for Google, Bing, and Next-Gen AI Answer Engines

User-agent: *
Allow: /
Allow: /apps/
Allow: /pricing/
Allow: /enterprise/
Allow: /developers/
Allow: /features/
Allow: /blog/
Allow: /case-studies/
Disallow: /api/

# Tier-1 Web Search Engines
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Applebot
Allow: /

User-agent: DuckDuckBot
Allow: /

User-agent: Yandex
Allow: /

User-agent: Baiduspider
Allow: /

# AI Answer Engines & Real-Time Knowledge Retrievers
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: Amazonbot
Allow: /

User-agent: Meta-ExternalAgent
Allow: /

User-agent: CCBot
Allow: /

# XML Sitemap
Sitemap: https://180workspace.com/sitemap.xml

# LLM Machine-Readable Index
# Specification: https://llmstxt.org/
LLMs-Txt: https://180workspace.com/llms.txt
`;

  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
