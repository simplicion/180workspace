import { I as __exportAll, d as maybeRenderHead, i as renderComponent, p as addAttribute, u as renderTemplate } from "./server_Dip1cA9v.mjs";
import { t as createComponent } from "./compiler_D38QwvgS.mjs";
import { t as $$Layout } from "./Layout_CoIEeGzQ.mjs";
import { t as prisma } from "./src_B4okvoVY.mjs";
//#region src/pages/blog/index.astro
var blog_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Index,
	file: () => $$file,
	url: () => $$url
});
var $$Index = createComponent(async ($$result, $$props, $$slots) => {
	let blogs = [];
	try {
		blogs = await prisma.marketingBlog.findMany({
			where: { published: true },
			orderBy: { publishedAt: "desc" },
			select: {
				id: true,
				title: true,
				slug: true,
				category: true,
				authorName: true,
				publishedAt: true,
				seoDescription: true
			}
		});
	} catch (error) {
		console.error("Failed to fetch blogs for SSG:", error);
	}
	return renderTemplate`${renderComponent($$result, "Layout", $$Layout, {
		"title": "180workspace Blog | Resources & Insights",
		"description": "Learn about Work Graph Architecture, agency scaling, and the latest product updates from 180workspace."
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<main class="container mx-auto px-4 py-16 max-w-5xl"><div class="mb-12"><h1 class="text-4xl md:text-5xl font-bold tracking-tight mb-4">Blog & Resources</h1><p class="text-xl text-muted-foreground max-w-2xl">Insights, guides, and updates on scaling your digital agency and managing modern teams.</p></div>${blogs.length === 0 ? renderTemplate`<div class="py-20 text-center rounded-xl border border-dashed border-border bg-accent/20"><p class="text-muted-foreground text-lg">No published blog posts found yet.</p></div>` : renderTemplate`<div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">${blogs.map((blog) => renderTemplate`<article class="group relative flex flex-col items-start justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md"><div class="flex items-center gap-x-4 text-xs mb-4"><time${addAttribute(blog.publishedAt?.toISOString(), "datetime")} class="text-muted-foreground">${blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric"
	}) : "Unknown Date"}</time><span class="relative z-10 rounded-full bg-primary/10 px-3 py-1.5 font-medium text-primary hover:bg-primary/20 transition-colors">${blog.category}</span></div><div class="group relative"><h3 class="mt-3 text-lg font-semibold leading-6 text-foreground group-hover:text-primary transition-colors line-clamp-2"><a${addAttribute(`/blog/${blog.slug}`, "href")}><span class="absolute inset-0"></span>${blog.title}</a></h3><p class="mt-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground">${blog.seoDescription || "Read more about this topic..."}</p></div><div class="relative mt-8 flex items-center gap-x-4"><div class="text-sm leading-6"><p class="font-semibold text-foreground"><span class="absolute inset-0"></span>${blog.authorName || "180workspace Team"}</p></div></div></article>`)}</div>`}</main>` })}`;
}, "C:/Users/saavi/OneDrive/Desktop/180workspace/apps/marketing-web/src/pages/blog/index.astro", void 0);
var $$file = "C:/Users/saavi/OneDrive/Desktop/180workspace/apps/marketing-web/src/pages/blog/index.astro";
var $$url = "/blog";
//#endregion
//#region \0virtual:astro:page:src/pages/blog/index@_@astro
var page = () => blog_exports;
//#endregion
export { page };
