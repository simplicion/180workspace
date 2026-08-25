import { I as __exportAll, d as maybeRenderHead, i as renderComponent, p as addAttribute, u as renderTemplate } from "./server_Dip1cA9v.mjs";
import { t as createComponent } from "./compiler_D38QwvgS.mjs";
import { t as $$Layout } from "./Layout_CoIEeGzQ.mjs";
import { t as prisma } from "./src_B4okvoVY.mjs";
//#region src/pages/pricing.astro
var pricing_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Pricing,
	file: () => $$file,
	url: () => $$url
});
var $$Pricing = createComponent(async ($$result, $$props, $$slots) => {
	let plans = [];
	try {
		plans = await prisma.plan.findMany({
			where: { isActive: true },
			orderBy: { price: "asc" }
		});
	} catch (error) {
		console.error("Failed to fetch plans for SSG:", error);
	}
	return renderTemplate`${renderComponent($$result, "Layout", $$Layout, {
		"title": "180workspace | Pricing",
		"description": "Simple, transparent pricing for your digital agency. Choose the plan that fits your needs."
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<main class="container mx-auto px-4 py-20 max-w-6xl"><div class="text-center mb-16"><h1 class="text-4xl md:text-5xl font-bold tracking-tight mb-4">Simple, transparent pricing</h1><p class="text-xl text-muted-foreground max-w-2xl mx-auto">No hidden fees. No surprise charges. Just powerful software to run your agency.</p></div>${plans.length === 0 ? renderTemplate`<div class="py-20 text-center rounded-xl border border-dashed border-border bg-accent/20"><p class="text-muted-foreground text-lg">No active plans found. Please configure pricing in the admin panel.</p></div>` : renderTemplate`<div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">${plans.map((plan) => renderTemplate`<div${addAttribute(`relative flex flex-col rounded-2xl border p-8 shadow-sm ${plan.planName.toLowerCase().includes("pro") ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card"}`, "class")}>${plan.planName.toLowerCase().includes("pro") && renderTemplate`<div class="absolute -top-4 left-0 right-0 mx-auto w-fit rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Most Popular</div>`}<div class="mb-6"><h3 class="text-2xl font-bold text-foreground">${plan.planName}</h3><p class="mt-2 text-sm text-muted-foreground line-clamp-2">${plan.description || "Everything you need to get started."}</p></div><div class="mb-6 flex items-baseline gap-x-2"><span class="text-5xl font-bold tracking-tight text-foreground">$${plan.price}</span><span class="text-sm font-semibold leading-6 text-muted-foreground">/${plan.billingCycle || "month"}</span></div><a href="/register"${addAttribute(`mt-auto mb-8 block rounded-full px-3 py-3 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${plan.planName.toLowerCase().includes("pro") ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`, "class")}>Get started</a><ul class="space-y-4 text-sm leading-6 text-muted-foreground"><li class="flex gap-x-3"><svg class="h-6 w-5 flex-none text-primary" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"></path></svg>Includes ${plan.maxUsers || "Unlimited"} users</li><li class="flex gap-x-3"><svg class="h-6 w-5 flex-none text-primary" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"></path></svg>Core Workspace Features</li><li class="flex gap-x-3"><svg class="h-6 w-5 flex-none text-primary" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"></path></svg>24/7 Support</li></ul></div>`)}</div>`}</main>` })}`;
}, "C:/Users/saavi/OneDrive/Desktop/180workspace/apps/marketing-web/src/pages/pricing.astro", void 0);
var $$file = "C:/Users/saavi/OneDrive/Desktop/180workspace/apps/marketing-web/src/pages/pricing.astro";
var $$url = "/pricing";
//#endregion
//#region \0virtual:astro:page:src/pages/pricing@_@astro
var page = () => pricing_exports;
//#endregion
export { page };
