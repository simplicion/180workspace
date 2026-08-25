import { b as createAstro, d as maybeRenderHead, f as renderHead, i as renderComponent, p as addAttribute, s as renderSlot, u as renderTemplate } from "./server_Dip1cA9v.mjs";
import { t as createComponent } from "./compiler_D38QwvgS.mjs";
//#region src/components/Footer.astro
var $$Footer = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${maybeRenderHead($$result)}<footer class="bg-gray-50 border-t border-gray-200 pt-16 pb-8 mt-24"><div class="container mx-auto px-4 max-w-6xl"><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12"><div class="lg:col-span-1"><a href="/" class="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2 mb-4"><div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center"><span class="text-white text-sm font-bold">180</span></div>180workspace</a><p class="text-gray-500 text-sm leading-relaxed mb-6">The ultimate work graph architecture SaaS. Manage your entire freelance business or digital agency in one unified platform.</p></div><div class="lg:col-span-1"><h4 class="font-semibold text-gray-900 mb-6 uppercase text-xs tracking-wider">Features</h4><ul class="space-y-3">${[
		{
			label: "CRM & Sales",
			slug: "crm-and-sales-software"
		},
		{
			label: "HR Management",
			slug: "hr-management-system"
		},
		{
			label: "Projects & Tasks",
			slug: "project-management-tool"
		},
		{
			label: "Finance & Billing",
			slug: "invoicing-and-finance"
		},
		{
			label: "Advertising & Websites",
			slug: "website-and-form-builder"
		},
		{
			label: "Communications",
			slug: "team-client-chat"
		},
		{
			label: "Social Media",
			slug: "social-media-content-calendar"
		},
		{
			label: "Workspace Tools",
			slug: "workspace-productivity-tools"
		},
		{
			label: "Automations",
			slug: "workflow-automations"
		},
		{
			label: "Insights & Analytics",
			slug: "agency-analytics-dashboard"
		},
		{
			label: "Identity & Security",
			slug: "enterprise-security"
		}
	].map((feature) => renderTemplate`<li><a${addAttribute(`/features/${feature.slug}`, "href")} class="text-sm text-gray-600 hover:text-indigo-600 transition-colors">${feature.label}</a></li>`)}</ul></div><div class="lg:col-span-1"><h4 class="font-semibold text-gray-900 mb-6 uppercase text-xs tracking-wider">Use Cases</h4><ul class="space-y-3">${[
		{
			label: "For Freelancers",
			slug: "for-freelancers"
		},
		{
			label: "For Digital Agencies",
			slug: "for-digital-agencies"
		},
		{
			label: "For Consultants",
			slug: "for-consultants"
		}
	].map((useCase) => renderTemplate`<li><a${addAttribute(`/use-cases/${useCase.slug}`, "href")} class="text-sm text-gray-600 hover:text-indigo-600 transition-colors">${useCase.label}</a></li>`)}</ul></div><div class="lg:col-span-1"><h4 class="font-semibold text-gray-900 mb-6 uppercase text-xs tracking-wider">Company</h4><ul class="space-y-3">${[
		{
			label: "About Us",
			slug: "about"
		},
		{
			label: "Blog",
			slug: "/blog"
		},
		{
			label: "Pricing",
			slug: "/pricing"
		},
		{
			label: "Contact",
			slug: "contact"
		}
	].map((item) => renderTemplate`<li><a${addAttribute(item.slug.startsWith("/") ? item.slug : `/company/${item.slug}`, "href")} class="text-sm text-gray-600 hover:text-indigo-600 transition-colors">${item.label}</a></li>`)}</ul></div></div><div class="border-t border-gray-200 pt-8 flex flex-col md:flex-row items-center justify-between"><p class="text-gray-400 text-sm">&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} 180workspace. All rights reserved.</p><div class="flex gap-4 mt-4 md:mt-0"><a href="/legal/privacy" class="text-gray-400 hover:text-gray-600 text-sm">Privacy Policy</a><a href="/legal/terms" class="text-gray-400 hover:text-gray-600 text-sm">Terms of Service</a></div></div></div></footer>`;
}, "C:/Users/saavi/OneDrive/Desktop/180workspace/apps/marketing-web/src/components/Footer.astro", void 0);
//#endregion
//#region src/layouts/Layout.astro
createAstro("https://astro.build");
var $$Layout = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Layout;
	const { title, description = "180workspace - The Ultimate Work Graph Architecture SaaS.", image = "/og-image.jpg" } = Astro.props;
	return renderTemplate`<html lang="en"><head><meta charset="UTF-8"><meta name="description"${addAttribute(description, "content")}><meta name="viewport" content="width=device-width"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><meta name="generator"${addAttribute(Astro.generator, "content")}><title>${title}</title><meta property="og:type" content="website"><meta property="og:title"${addAttribute(title, "content")}><meta property="og:description"${addAttribute(description, "content")}><meta property="og:image"${addAttribute(image, "content")}><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title"${addAttribute(title, "content")}><meta name="twitter:description"${addAttribute(description, "content")}><meta name="twitter:image"${addAttribute(image, "content")}>${renderHead($$result)}</head><body class="min-h-screen bg-background font-sans antialiased flex flex-col"><div class="flex-grow">${renderSlot($$result, $$slots["default"])}</div>${renderComponent($$result, "Footer", $$Footer, {})}</body></html>`;
}, "C:/Users/saavi/OneDrive/Desktop/180workspace/apps/marketing-web/src/layouts/Layout.astro", void 0);
//#endregion
export { $$Layout as t };
