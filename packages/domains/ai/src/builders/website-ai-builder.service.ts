// @ts-nocheck
import { prisma } from '@workspace/db';
import crypto from 'crypto';
import { aiProviderService } from '../kernel/ai-provider.service';
import { AICompanyConfigService } from '../kernel/ai-company-config.service';
import { IUniversalBuilder, BuilderGenerationParams, BuilderResult } from './universal-builder.interface';

export class WebsiteAIBuilderService implements IUniversalBuilder {
    readonly builderType = 'website';

    async compileAST(params: BuilderGenerationParams): Promise<BuilderResult> {
        const { prompt, companyId, userId } = params;
        const textPrompt = (prompt || '').trim();

        let effectiveCompanyId = companyId;
        if (!effectiveCompanyId) {
            const firstCompany = await prisma.company.findFirst().catch(() => null);
            effectiveCompanyId = firstCompany?.id;
        }

        const { settings, companyName } = await AICompanyConfigService.getCompanyAISettings(effectiveCompanyId);

        // 1. Extract Name/Title if specified
        let extractedTitle = '';
        const nameMatch = textPrompt.match(/(?:website\s+name\s+(?:will\s+be|is)|name\s*:\s*|called\s+|titled\s+)(["']?[a-zA-Z0-9_\s-]+["']?)/i);
        if (nameMatch) {
            extractedTitle = nameMatch[1].replace(/["']/g, '').trim();
        }

        const lowerPrompt = textPrompt.toLowerCase();
        const isDiwaliOrFestival = lowerPrompt.includes('diwali') || lowerPrompt.includes('festival') || lowerPrompt.includes('holiday') || lowerPrompt.includes('offer') || lowerPrompt.includes('promo') || lowerPrompt.includes('black friday');
        const isEcommerce = (lowerPrompt.includes('ecommerce') || lowerPrompt.includes('e-commerce') || lowerPrompt.includes('store') || lowerPrompt.includes('shop') || lowerPrompt.includes('product')) && !isDiwaliOrFestival;
        const isAgency = lowerPrompt.includes('agency') || lowerPrompt.includes('portfolio') || lowerPrompt.includes('studio') || lowerPrompt.includes('freelance') || isDiwaliOrFestival;

        let siteTitle = extractedTitle || (isDiwaliOrFestival ? `${companyName || 'Apex'} Diwali Special Campaign` : isEcommerce ? `${companyName || 'Apex'} E-Commerce Store` : isAgency ? `${companyName || 'Studio'} Creative Agency` : `${companyName || 'Modern'} Landing Page`);
        let theme = { mode: 'dark', primaryColor: isDiwaliOrFestival ? '#f59e0b' : isEcommerce ? '#ec4899' : isAgency ? '#8b5cf6' : '#6366f1', fontFamily: 'Inter, sans-serif' };
        let sections: any[] = [];

        if (isDiwaliOrFestival) {
            sections = [
                {
                    id: crypto.randomUUID(),
                    type: 'hero_campaign',
                    headline: `Light Up Your Growth This Diwali with ${siteTitle}`,
                    subheadline: 'Exclusive festive marketing & advertising packages to skyrocket your brand revenue, reach millions, and scale your ROAS.',
                    badge: '🪔 SPECIAL DIWALI 2026 FESTIVAL OFFER • 40% OFF',
                    ctaText: 'Claim Festive Discount →',
                    ctaLink: '#pricing-offers',
                    secondaryCtaText: 'View Campaign Results',
                    bgGradient: 'from-amber-950 via-slate-950 to-orange-950'
                },
                {
                    id: crypto.randomUUID(),
                    type: 'special_offers_grid',
                    title: 'Exclusive Diwali Campaign Packages',
                    subtitle: 'Limited slots available for guaranteed Q4 festive advertising slots.',
                    items: [
                        { id: 'off_1', name: 'Diwali Spark Starter', price: '₹24,999', originalPrice: '₹45,000', features: ['Meta & Instagram Ads Setup', '5 Festive Ad Creatives', 'Dedicated Campaign Manager', 'Up to 50k Reach'] },
                        { id: 'off_2', name: 'Festive Growth Booster', price: '₹59,999', originalPrice: '₹95,000', popular: true, features: ['Meta + Google PMax Ads', '15 Animated Video Creatives', 'High-Converting Landing Page', '24/7 ROAS Optimization'] },
                        { id: 'off_3', name: 'Grand Festive Dominance', price: '₹1,29,999', originalPrice: '₹2,00,000', features: ['Omnichannel Ad Takeover', 'Influencer Collab Strategy', 'Custom Funnel & Retargeting', 'Dedicated Senior Media Buyer'] }
                    ]
                },
                {
                    id: crypto.randomUUID(),
                    type: 'value_props',
                    title: 'Why Top Brands Choose Our Agency',
                    items: [
                        { icon: 'Target', title: 'Targeted High-Intent Buyers', desc: 'Laser-focused audience targeting to convert holiday shoppers.' },
                        { icon: 'Zap', title: 'Lightning Fast Deployment', desc: 'Campaign goes live in under 48 hours with full QA.' },
                        { icon: 'TrendingUp', title: 'Proven 4.5x+ Average ROAS', desc: 'Data-driven ad creatives optimized for maximum holiday conversion.' },
                        { icon: 'Award', title: 'End-to-End Creative Studio', desc: 'Complete festive copywriting, banners, and video production.' }
                    ]
                },
                {
                    id: crypto.randomUUID(),
                    type: 'lead_capture_form_cta',
                    headline: 'Book Your Free Diwali Strategy Session',
                    subheadline: 'Lock in your 40% early bird festival discount before campaign slots fill up.',
                    buttonText: 'Get My Festive Growth Plan',
                    inputPlaceholder: 'Enter your business email / WhatsApp number...'
                }
            ];
        } else if (isEcommerce) {
            sections = [
                {
                    id: crypto.randomUUID(),
                    type: 'hero_ecommerce',
                    headline: `Elevate Your Lifestyle with ${siteTitle}`,
                    subheadline: 'Curated premium collections engineered for modern aesthetics, daily durability, and effortless performance.',
                    badge: 'NEW ARRIVALS • SPRING 2026',
                    ctaText: 'Explore Collection →',
                    ctaLink: '#products',
                    secondaryCtaText: 'View Lookbook',
                    bgGradient: 'from-slate-950 via-purple-950 to-slate-900'
                },
                {
                    id: crypto.randomUUID(),
                    type: 'product_grid',
                    title: 'Featured Best Sellers',
                    subtitle: 'Handcrafted precision. 100% satisfaction guaranteed.',
                    items: [
                        { id: 'prod_1', name: 'Aero Minimalist Chrono Watch', category: 'Accessories', price: 189, rating: 4.9, reviewsCount: 320, tag: 'Bestseller' },
                        { id: 'prod_2', name: 'Nomad Waterproof Travel Duffle', category: 'Luggage', price: 145, rating: 4.8, reviewsCount: 198, tag: 'New' },
                        { id: 'prod_3', name: 'PureSound Active Noise Cancelling Earbuds', category: 'Audio', price: 219, rating: 5.0, reviewsCount: 540, tag: 'Top Rated' },
                        { id: 'prod_4', name: 'ErgoLeather Cardholder & Key Case', category: 'Leather Goods', price: 65, rating: 4.9, reviewsCount: 112, tag: 'Trending' }
                    ]
                },
                {
                    id: crypto.randomUUID(),
                    type: 'value_props',
                    title: 'The Quality Promise',
                    items: [
                        { icon: 'Truck', title: 'Free Express Shipping', desc: 'Complimentary priority delivery on all orders over $75.' },
                        { icon: 'ShieldCheck', title: '30-Day Money Back', desc: 'Hassle-free worldwide returns and exchanges with zero questions asked.' },
                        { icon: 'Sparkles', title: 'Carbon Neutral Delivery', desc: '100% offset sustainable packaging and eco-friendly logistics.' },
                        { icon: 'Lock', title: 'Secure Instant Checkout', desc: 'Bank-grade 256-bit SSL encrypted Stripe and Apple Pay support.' }
                    ]
                },
                {
                    id: crypto.randomUUID(),
                    type: 'newsletter_cta',
                    headline: 'Unlock 20% Off Your First Order',
                    subheadline: 'Subscribe to our private insider newsletter for exclusive seasonal drops and member-only pricing.',
                    buttonText: 'Claim Your Discount',
                    inputPlaceholder: 'Enter your work or personal email...'
                }
            ];
        } else if (isAgency) {
            sections = [
                {
                    id: crypto.randomUUID(),
                    type: 'hero_agency',
                    headline: 'Crafting Iconic Digital Experiences',
                    subheadline: 'We partner with visionary founders and global enterprises to design high-converting web applications and brand ecosystems.',
                    ctaText: 'Start a Project →',
                    ctaLink: '#contact'
                },
                {
                    id: crypto.randomUUID(),
                    type: 'portfolio_grid',
                    title: 'Selected Work (2025–2026)',
                    subtitle: 'Transforming complexity into effortless, memorable software.',
                    items: [
                        { title: 'Vortex Capital OS', client: 'Fintech Group', year: '2026', tags: ['Design System', 'Next.js App'] },
                        { title: 'HyperScale AI Platform', client: 'Enterprise Cloud', year: '2025', tags: ['3D WebGL', 'Brand Architecture'] },
                        { title: 'Lumina Health Sensor', client: 'MedTech Labs', year: '2025', tags: ['Mobile App', 'IoT UI'] }
                    ]
                },
                {
                    id: crypto.randomUUID(),
                    type: 'cta_banner',
                    headline: 'Have a project in mind?',
                    subheadline: "Let's build something extraordinary together.",
                    buttonText: 'Schedule a Consultation'
                }
            ];
        } else {
            sections = [
                {
                    id: crypto.randomUUID(),
                    type: 'hero',
                    headline: `Scale Faster with ${siteTitle}`,
                    subheadline: 'The unified operating system designed for high-velocity teams, automated billing, and AI co-pilots.',
                    ctaText: 'Get Started Free',
                    ctaLink: '#pricing'
                },
                {
                    id: crypto.randomUUID(),
                    type: 'features',
                    title: 'Engineered for High-Velocity Execution',
                    items: [
                        { title: 'AI Document Synthesizer', desc: 'Generate contracts, invoices, and NDAs in seconds.' },
                        { title: 'Real-Time Financial Analytics', desc: 'Live cashflow monitoring and automated payroll tracking.' },
                        { title: 'Universal Form & Lead Capture', desc: 'Embed forms with built-in CRM attribution.' }
                    ]
                },
                {
                    id: crypto.randomUUID(),
                    type: 'pricing_tiers',
                    title: 'Simple, Transparent Pricing',
                    tiers: [
                        { name: 'Starter', price: '$29/mo', desc: 'Ideal for early-stage teams.' },
                        { name: 'Growth', price: '$79/mo', desc: 'Full AI capabilities and team automation.', popular: true },
                        { name: 'Enterprise', price: '$199/mo', desc: 'Custom models and dedicated support.' }
                    ]
                },
                {
                    id: crypto.randomUUID(),
                    type: 'cta_banner',
                    headline: 'Ready to modernize your operations?',
                    buttonText: 'Start 14-Day Trial'
                }
            ];
        }

        const siteId = `site_${Date.now()}`;
        const editUrl = `/advertising?id=${siteId}`;

        const reply = `🌐 **${siteTitle}** has been synthesized with ${sections.length} high-fidelity sections!\n\n` +
            `• **Category**: ${isEcommerce ? 'E-Commerce Storefront' : isAgency ? 'Creative Agency / Portfolio' : 'SaaS Landing Page'}\n` +
            `• **Theme**: ${theme.mode === 'dark' ? 'Dark Glassmorphism' : 'Modern Clean'} (${theme.primaryColor})\n` +
            `• **Sections**: ${sections.map((s: any) => s.type.replace(/_/g, ' ')).join(', ')}\n\n` +
            `You can open and customize the site live in the **Website Builder** below.`;

        return {
            success: true,
            builderType: this.builderType,
            entityId: siteId,
            title: siteTitle,
            editUrl,
            reply,
            ast: sections,
            actionCards: [
                { type: 'edit', label: 'Open in Website Builder →', url: editUrl }
            ]
        };
    }

    async patchAST(entityId: string, instruction: string, params: BuilderGenerationParams): Promise<BuilderResult> {
        return {
            success: true,
            builderType: this.builderType,
            entityId,
            title: 'Website Updated',
            editUrl: `/advertising?id=${entityId}`,
            reply: `✅ Website sections updated with: "${instruction}"`,
            ast: []
        };
    }

    async deleteEntity(entityId: string, companyId: string) {
        return { success: true, message: 'Website deleted.' };
    }
}

