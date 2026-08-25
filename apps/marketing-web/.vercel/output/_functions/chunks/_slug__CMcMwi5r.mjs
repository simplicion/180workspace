import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { b as createAstro, d as maybeRenderHead, i as renderComponent, u as renderTemplate, v as unescapeHTML } from "./server_5ZIlVhEg.mjs";
import { t as createComponent } from "./compiler_CBFesyMw.mjs";
import { t as $$Layout } from "./Layout_B3tswm74.mjs";
import { prisma } from "@workspace/db";
//#region src/pages/features/[slug].astro
var _slug__exports = /* @__PURE__ */ __exportAll({
	default: () => $$Slug,
	file: () => $$file,
	getStaticPaths: () => getStaticPaths,
	url: () => $$url
});
createAstro("https://astro.build");
async function getStaticPaths() {
	return (await prisma.marketingPage.findMany({
		where: {
			type: "FEATURE",
			published: true
		},
		select: {
			slug: true,
			heroHeadline: true,
			contentBlocks: true,
			seoTitle: true,
			seoDescription: true,
			jsonLdSchema: true
		}
	})).map((feature) => ({
		params: { slug: feature.slug },
		props: { feature }
	}));
}
var $$Slug = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Slug;
	const { feature } = Astro.props;
	const defaultStructuredData = {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		"name": feature.heroHeadline,
		"operatingSystem": "All",
		"applicationCategory": "BusinessApplication",
		"description": feature.seoDescription || feature.heroHeadline,
		"offers": {
			"@type": "Offer",
			"price": "0.00",
			"priceCurrency": "USD"
		},
		"publisher": {
			"@type": "Organization",
			"name": "180workspace"
		}
	};
	const jsonLd = feature.jsonLdSchema ? feature.jsonLdSchema : JSON.stringify(defaultStructuredData);
	return renderTemplate`${renderComponent($$result, "Layout", $$Layout, {
		"title": `${feature.seoTitle || feature.heroHeadline} | 180workspace`,
		"description": feature.seoDescription || `Explore the ${feature.heroHeadline} app on 180workspace.`
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<main class="container mx-auto px-4 py-16 max-w-5xl"><div class="mb-12"><div class="mb-6"><a href="/features" class="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">← Back to Features</a></div><div class="max-w-3xl"><h1 class="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">${feature.heroHeadline}</h1><p class="text-xl text-muted-foreground leading-relaxed">${feature.seoDescription}</p></div><div class="mt-8 flex gap-4"><a href="/register" class="btn-primary inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">Start Free Trial</a><a href="/contact" class="btn-secondary inline-flex h-12 items-center justify-center rounded-full border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">Talk to Sales</a></div></div><div class="my-16 border-t border-border pt-16"><article class="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-primary hover:prose-a:text-primary/80"><div>${unescapeHTML(typeof feature.contentBlocks === "string" ? feature.contentBlocks : JSON.stringify(feature.contentBlocks))}</div></article></div><!-- Structured Data (JSON-LD) --><script type="application/ld+json">${unescapeHTML(jsonLd)}<\/script></main>` })}`;
}, "C:/Users/saavi/OneDrive/Desktop/180workspace/apps/marketing-web/src/pages/features/[slug].astro", void 0);
var $$file = "C:/Users/saavi/OneDrive/Desktop/180workspace/apps/marketing-web/src/pages/features/[slug].astro";
var $$url = "/features/[slug]";
//#endregion
//#region \0virtual:astro:page:src/pages/features/[slug]@_@astro
var page = () => _slug__exports;
//#endregion
export { page };
