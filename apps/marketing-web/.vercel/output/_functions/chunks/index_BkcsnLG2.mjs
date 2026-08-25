import { I as __exportAll, d as maybeRenderHead, i as renderComponent, p as addAttribute, u as renderTemplate } from "./server_Dip1cA9v.mjs";
import { t as createComponent } from "./compiler_D38QwvgS.mjs";
import { t as $$Layout } from "./Layout_CoIEeGzQ.mjs";
import { t as prisma } from "./src_B4okvoVY.mjs";
//#region src/pages/features/index.astro
var features_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Index,
	file: () => $$file,
	url: () => $$url
});
var $$Index = createComponent(async ($$result, $$props, $$slots) => {
	let apps = [];
	try {
		apps = await prisma.marketingPage.findMany({
			where: {
				type: "FEATURE",
				published: true
			},
			orderBy: { seoTitle: "asc" }
		});
	} catch (error) {
		console.error("Failed to fetch features for SSG:", error);
	}
	return renderTemplate`${renderComponent($$result, "Layout", $$Layout, {
		"title": "180workspace Features & Ecosystem",
		"description": "Explore the 11+ SaaS apps included in the 180workspace platform."
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<main class="container mx-auto px-4 py-16 max-w-6xl"><div class="mb-16 text-center"><h1 class="text-4xl md:text-5xl font-bold tracking-tight mb-4">The Work Graph Ecosystem</h1><p class="text-xl text-muted-foreground max-w-3xl mx-auto">Discover the powerful suite of 11+ integrated applications designed to streamline every aspect of your agency's operations.</p></div>${apps.length === 0 ? renderTemplate`<div class="py-20 text-center rounded-xl border border-dashed border-border bg-accent/20"><p class="text-muted-foreground text-lg">Features are currently being updated. Please check back later.</p></div>` : renderTemplate`<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">${apps.map((app) => renderTemplate`<a${addAttribute(`/features/${app.slug}`, "href")} class="group block h-full"><div class="h-full rounded-2xl border border-border bg-card p-8 transition-all hover:shadow-md hover:border-primary/30 flex flex-col"><h3 class="text-2xl font-bold text-foreground group-hover:text-primary transition-colors mb-4">${app.heroHeadline || app.seoTitle}</h3><p class="text-muted-foreground leading-relaxed mb-6 flex-grow">${app.seoDescription || "Learn more about how this app integrates into the Work Graph."}</p><div class="flex items-center text-sm font-medium text-primary">Explore Feature<svg class="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></div></div></a>`)}</div>`}</main>` })}`;
}, "C:/Users/saavi/OneDrive/Desktop/180workspace/apps/marketing-web/src/pages/features/index.astro", void 0);
var $$file = "C:/Users/saavi/OneDrive/Desktop/180workspace/apps/marketing-web/src/pages/features/index.astro";
var $$url = "/features";
//#endregion
//#region \0virtual:astro:page:src/pages/features/index@_@astro
var page = () => features_exports;
//#endregion
export { page };
