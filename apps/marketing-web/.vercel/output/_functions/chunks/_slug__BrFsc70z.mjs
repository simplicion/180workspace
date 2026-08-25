import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { b as createAstro, d as maybeRenderHead, i as renderComponent, p as addAttribute, u as renderTemplate, v as unescapeHTML } from "./server_5ZIlVhEg.mjs";
import { t as createComponent } from "./compiler_CBFesyMw.mjs";
import { t as $$Layout } from "./Layout_B3tswm74.mjs";
import { prisma } from "@workspace/db";
//#region src/pages/blog/[slug].astro
var _slug__exports = /* @__PURE__ */ __exportAll({
	default: () => $$Slug,
	file: () => $$file,
	getStaticPaths: () => getStaticPaths,
	url: () => $$url
});
createAstro("https://astro.build");
async function getStaticPaths() {
	return (await prisma.marketingBlog.findMany({
		where: { published: true },
		select: {
			slug: true,
			title: true,
			contentHtml: true,
			category: true,
			authorName: true,
			publishedAt: true,
			seoTitle: true,
			seoDescription: true,
			keywords: true
		}
	})).map((blog) => ({
		params: { slug: blog.slug },
		props: { blog }
	}));
}
var $$Slug = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Slug;
	const { blog } = Astro.props;
	const defaultStructuredData = {
		"@context": "https://schema.org",
		"@type": "Article",
		"headline": blog.seoTitle || blog.title,
		"description": blog.seoDescription,
		"author": {
			"@type": "Person",
			"name": blog.authorName || "180workspace Team"
		},
		"publisher": {
			"@type": "Organization",
			"name": "180workspace",
			"logo": {
				"@type": "ImageObject",
				"url": "https://180workspace.com/logo.png"
			}
		},
		"datePublished": blog.publishedAt?.toISOString()
	};
	const jsonLd = JSON.stringify(defaultStructuredData);
	return renderTemplate`${renderComponent($$result, "Layout", $$Layout, {
		"title": `${blog.seoTitle || blog.title} | 180workspace Blog`,
		"description": blog.seoDescription || `Read ${blog.title} on the 180workspace blog.`
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<main class="container mx-auto px-4 py-16 max-w-4xl"><div class="mb-12 border-b border-border pb-8"><div class="flex items-center gap-x-4 text-sm mb-6"><a href="/blog" class="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">← Back to Blog</a><span class="text-border">|</span><time${addAttribute(blog.publishedAt?.toISOString(), "datetime")} class="text-muted-foreground">${blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric"
	}) : "Unknown Date"}</time><span class="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">${blog.category}</span></div><h1 class="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">${blog.title}</h1><div class="flex items-center gap-3 mt-8"><div class="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">${blog.authorName ? blog.authorName.charAt(0) : "1"}</div><div><p class="font-medium text-foreground">${blog.authorName || "180workspace Team"}</p><p class="text-sm text-muted-foreground">Content Team</p></div></div></div><article class="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-primary hover:prose-a:text-primary/80"><div>${unescapeHTML(blog.contentHtml)}</div></article><!-- Structured Data (JSON-LD) --><script type="application/ld+json">${unescapeHTML(jsonLd)}<\/script></main>` })}`;
}, "C:/Users/saavi/OneDrive/Desktop/180workspace/apps/marketing-web/src/pages/blog/[slug].astro", void 0);
var $$file = "C:/Users/saavi/OneDrive/Desktop/180workspace/apps/marketing-web/src/pages/blog/[slug].astro";
var $$url = "/blog/[slug]";
//#endregion
//#region \0virtual:astro:page:src/pages/blog/[slug]@_@astro
var page = () => _slug__exports;
//#endregion
export { page };
