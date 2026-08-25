import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { prisma } from "@workspace/db";
//#region src/pages/sitemap.xml.ts
var sitemap_xml_exports = /* @__PURE__ */ __exportAll({ GET: () => GET });
var GET = async () => {
	const baseUrl = "https://180workspace.com";
	let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
	try {
		const companies = await prisma.company.findMany({ select: {
			id: true,
			updatedAt: true
		} });
		const users = await prisma.user.findMany({ select: {
			id: true,
			updatedAt: true
		} });
		const posts = await prisma.forumPost.findMany({ select: {
			id: true,
			updatedAt: true
		} });
		const companyUrls = companies.map((company) => ({
			url: `${baseUrl}/company/${company.id}`,
			lastModified: company.updatedAt,
			changeFrequency: "daily",
			priority: .8
		}));
		const userUrls = users.map((user) => ({
			url: `${baseUrl}/profile/${user.id}`,
			lastModified: user.updatedAt,
			changeFrequency: "daily",
			priority: .8
		}));
		const postUrls = posts.map((post) => ({
			url: `${baseUrl}/post/${post.id}`,
			lastModified: post.updatedAt,
			changeFrequency: "weekly",
			priority: .6
		}));
		[
			...[
				{
					url: baseUrl,
					lastModified: /* @__PURE__ */ new Date(),
					changeFrequency: "daily",
					priority: 1
				},
				{
					url: `${baseUrl}/login`,
					lastModified: /* @__PURE__ */ new Date(),
					changeFrequency: "monthly",
					priority: .5
				},
				{
					url: `${baseUrl}/signup`,
					lastModified: /* @__PURE__ */ new Date(),
					changeFrequency: "monthly",
					priority: .5
				}
			],
			...companyUrls,
			...userUrls,
			...postUrls
		].forEach((item) => {
			xml += `
  <url>
    <loc>${item.url}</loc>
    <lastmod>${item.lastModified.toISOString()}</lastmod>
    <changefreq>${item.changeFrequency}</changefreq>
    <priority>${item.priority}</priority>
  </url>`;
		});
	} catch (error) {
		console.error("Error generating sitemap:", error);
		xml += `
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${(/* @__PURE__ */ new Date()).toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;
	}
	xml += `
</urlset>`;
	return new Response(xml, { headers: {
		"Content-Type": "application/xml",
		"Cache-Control": "public, max-age=3600, s-maxage=86400"
	} });
};
//#endregion
//#region \0virtual:astro:page:src/pages/sitemap.xml@_@ts
var page = () => sitemap_xml_exports;
//#endregion
export { page };
