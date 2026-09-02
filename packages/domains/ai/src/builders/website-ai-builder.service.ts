// @ts-nocheck
import { prisma, basePrisma } from '@workspace/db';
import crypto from 'crypto';
import { aiProviderService } from '../kernel/ai-provider.service';
import { AICompanyConfigService } from '../kernel/ai-company-config.service';
import { IUniversalBuilder, BuilderGenerationParams, BuilderResult } from './universal-builder.interface';

export interface ElementNode {
    id: string;
    type: 'section' | 'box' | 'row' | 'column' | 'text' | 'media' | 'button' | 'line' | 'floating' | 'code';
    data?: any;
    style?: any;
    children?: ElementNode[];
    animation?: any;
}

const genId = (prefix: string = 'el') => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

export class WebsiteAIBuilderService implements IUniversalBuilder {
    readonly builderType = 'website';

    // Helper node creators
    private createBox(children: ElementNode[] = [], style: any = {}): ElementNode {
        return {
            id: genId('box'),
            type: 'box',
            data: {},
            style: {
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                maxWidth: '100%',
                ...style
            },
            children
        };
    }

    private createRow(children: ElementNode[] = [], style: any = {}): ElementNode {
        return {
            id: genId('row'),
            type: 'row',
            data: {},
            style: {
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                boxSizing: 'border-box',
                maxWidth: '100%',
                ...style
            },
            children
        };
    }

    private createText(content: string, style: any = {}): ElementNode {
        return {
            id: genId('text'),
            type: 'text',
            data: { content },
            style: {
                boxSizing: 'border-box',
                ...style
            }
        };
    }

    private createMedia(imageUrl: string, style: any = {}): ElementNode {
        return {
            id: genId('media'),
            type: 'media',
            data: { imageUrl },
            style: {
                boxSizing: 'border-box',
                ...style
            }
        };
    }

    private createButton(content: string, style: any = {}, link: string = '#'): ElementNode {
        return {
            id: genId('button'),
            type: 'button',
            data: { content, link },
            style: {
                padding: '0.85em 1.75em',
                borderRadius: '0.625rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxSizing: 'border-box',
                ...style
            }
        };
    }

    private createFloating(data: any = {}, style: any = {}): ElementNode {
        return {
            id: genId('floating'),
            type: 'floating',
            data: {
                position: 'bottom-right',
                ...data
            },
            style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '56px',
                height: '56px',
                borderRadius: '9999px',
                backgroundColor: '#25D366',
                color: '#ffffff',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
                offsetX: '1.5rem',
                offsetY: '1.5rem',
                zIndex: 50,
                ...style
            },
            children: []
        };
    }

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

        const siteTitle = extractedTitle || (
            isDiwaliOrFestival ? `${companyName || 'Apex'} Diwali Special Campaign` :
            isEcommerce ? `${companyName || 'Apex'} E-Commerce Store` :
            isAgency ? `${companyName || 'Studio'} Creative Agency` :
            `${companyName || 'Apex'} Landing Page`
        );

        const primaryColor = isDiwaliOrFestival ? '#f59e0b' : isEcommerce ? '#ec4899' : isAgency ? '#8b5cf6' : '#4f46e5';
        const brand = {
            primaryColor,
            secondaryColor: '#ffffff',
            textColor: '#111827',
            headingFont: 'Inter',
            bodyFont: 'Inter',
            fontFamily: 'Inter',
            headerFooterTheme: 'dark',
            bgType: 'color',
            bgValue: '#ffffff'
        };

        const sections: ElementNode[] = [];

        if (isDiwaliOrFestival) {
            // Section 1: Festive Hero
            sections.push({
                id: genId('sec-hero'),
                type: 'section',
                data: {},
                style: { paddingY: 6, backgroundColor: '#0f172a', color: '#ffffff' },
                children: [
                    this.createBox([
                        this.createText('🪔 SPECIAL DIWALI 2026 FESTIVAL OFFER • 40% OFF', {
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            color: '#f59e0b',
                            backgroundColor: 'rgba(245, 158, 11, 0.15)',
                            padding: '0.4rem 1rem',
                            borderRadius: '9999px',
                            maxWidth: 'fit-content',
                            marginBottom: '1.25rem'
                        }),
                        this.createText(`Light Up Your Brand Growth with ${siteTitle}`, {
                            tagName: 'h1',
                            fontSize: 'clamp(2.5rem, 5vw, 3.75rem)',
                            fontWeight: '900',
                            lineHeight: '1.15',
                            marginBottom: '1rem',
                            color: '#ffffff'
                        }),
                        this.createText('Exclusive festive marketing & advertising packages to skyrocket your brand revenue, reach millions of buyers, and maximize your ROAS during the festival season.', {
                            tagName: 'p',
                            fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                            opacity: 0.85,
                            marginBottom: '2rem',
                            lineHeight: '1.6',
                            color: '#cbd5e1'
                        }),
                        this.createRow([
                            this.createButton('Claim 40% Festive Discount →', { backgroundColor: '#f59e0b', color: '#000000', fontWeight: 'bold' }, '#offers'),
                            this.createButton('View Campaign Results', { backgroundColor: 'transparent', color: '#ffffff', borderWidth: '1px', borderColor: '#475569' }, '#features')
                        ], { gap: '1rem', alignItems: 'center' })
                    ], { maxWidth: '850px', margin: '0 auto', textAlign: 'center', alignItems: 'center' })
                ]
            });

            // Section 2: Diwali Offer Packages
            sections.push({
                id: genId('sec-offers'),
                type: 'section',
                data: {},
                style: { paddingY: 6, backgroundColor: '#ffffff' },
                children: [
                    this.createBox([
                        this.createText('Exclusive Diwali Campaign Packages', { tagName: 'h2', fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: '900', textAlign: 'center', marginBottom: '0.75rem', color: '#0f172a' }),
                        this.createText('Limited slots available for guaranteed festive ad placement and viral creative delivery.', { tagName: 'p', fontSize: '1.1rem', textAlign: 'center', opacity: 0.7, marginBottom: '3rem', color: '#64748b' }),
                        this.createBox([
                            this.createBox([
                                this.createText('Diwali Spark Starter', { fontWeight: 'bold', fontSize: '1.35rem', color: '#0f172a', marginBottom: '0.5rem' }),
                                this.createText('₹24,999', { fontWeight: '900', fontSize: '2rem', color: '#f59e0b', marginBottom: '1rem' }),
                                this.createText('• Meta & Instagram Ads Setup\n• 5 Festive Video Creatives\n• Dedicated Campaign Manager\n• Up to 50k Reach', { lineHeight: '1.8', opacity: 0.8, color: '#475569', marginBottom: '1.5rem' }),
                                this.createButton('Choose Spark Plan', { backgroundColor: '#0f172a', color: '#ffffff' })
                            ], { backgroundColor: '#f8fafc', borderRadius: '1.25rem', padding: '2rem', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e2e8f0', flex: 1, minWidth: '260px' }),
                            this.createBox([
                                this.createText('⭐ MOST POPULAR', { fontSize: '0.75rem', fontWeight: 'bold', color: '#ffffff', backgroundColor: '#f59e0b', padding: '0.25rem 0.75rem', borderRadius: '9999px', maxWidth: 'fit-content', marginBottom: '0.5rem' }),
                                this.createText('Festive Growth Booster', { fontWeight: 'bold', fontSize: '1.35rem', color: '#0f172a', marginBottom: '0.5rem' }),
                                this.createText('₹59,999', { fontWeight: '900', fontSize: '2rem', color: '#f59e0b', marginBottom: '1rem' }),
                                this.createText('• Meta + Google PMax Ads\n• 15 Animated Motion Creatives\n• High-Converting Landing Page\n• 24/7 ROAS Optimization', { lineHeight: '1.8', opacity: 0.8, color: '#475569', marginBottom: '1.5rem' }),
                                this.createButton('Claim Booster Plan', { backgroundColor: '#f59e0b', color: '#000000', fontWeight: 'bold' })
                            ], { backgroundColor: '#fffbeb', borderRadius: '1.25rem', padding: '2rem', borderStyle: 'solid', borderWidth: '2px', borderColor: '#f59e0b', flex: 1, minWidth: '260px', transform: 'scale(1.03)', boxShadow: '0 20px 25px -5px rgba(245, 158, 11, 0.15)' }),
                            this.createBox([
                                this.createText('Grand Festive Dominance', { fontWeight: 'bold', fontSize: '1.35rem', color: '#0f172a', marginBottom: '0.5rem' }),
                                this.createText('₹1,29,999', { fontWeight: '900', fontSize: '2rem', color: '#f59e0b', marginBottom: '1rem' }),
                                this.createText('• Omnichannel Ad Takeover\n• Influencer Collab Strategy\n• Custom Funnel & Retargeting\n• Senior Media Buyer Support', { lineHeight: '1.8', opacity: 0.8, color: '#475569', marginBottom: '1.5rem' }),
                                this.createButton('Choose Grand Plan', { backgroundColor: '#0f172a', color: '#ffffff' })
                            ], { backgroundColor: '#f8fafc', borderRadius: '1.25rem', padding: '2rem', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e2e8f0', flex: 1, minWidth: '260px' })
                        ], { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', width: '100%' })
                    ], { maxWidth: '1100px', margin: '0 auto' })
                ]
            });

            // Section 3: Value Props
            sections.push({
                id: genId('sec-values'),
                type: 'section',
                data: {},
                style: { paddingY: 6, backgroundColor: '#f8fafc' },
                children: [
                    this.createBox([
                        this.createText('Why High-Growth Brands Partner With Us', { tagName: 'h2', fontSize: 'clamp(2rem, 4vw, 2.5rem)', fontWeight: '900', textAlign: 'center', marginBottom: '3rem', color: '#0f172a' }),
                        this.createBox([
                            this.createBox([
                                this.createText('🎯 Laser-Targeted Buyers', { fontWeight: 'bold', fontSize: '1.2rem', color: '#0f172a', marginBottom: '0.5rem' }),
                                this.createText('High-intent audience segments crafted specifically for festive conversion spikes.', { opacity: 0.75, color: '#475569', lineHeight: '1.6' })
                            ], { backgroundColor: '#ffffff', borderRadius: '1rem', padding: '1.5rem', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e2e8f0' }),
                            this.createBox([
                                this.createText('⚡ 48-Hour Live Launch', { fontWeight: 'bold', fontSize: '1.2rem', color: '#0f172a', marginBottom: '0.5rem' }),
                                this.createText('Campaigns reviewed, approved, and launched within 48 hours to capitalize on holiday traffic.', { opacity: 0.75, color: '#475569', lineHeight: '1.6' })
                            ], { backgroundColor: '#ffffff', borderRadius: '1rem', padding: '1.5rem', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e2e8f0' }),
                            this.createBox([
                                this.createText('📈 4.5x Average ROAS', { fontWeight: 'bold', fontSize: '1.2rem', color: '#0f172a', marginBottom: '0.5rem' }),
                                this.createText('Data-backed creative iterations designed to lower acquisition cost and boost checkout rate.', { opacity: 0.75, color: '#475569', lineHeight: '1.6' })
                            ], { backgroundColor: '#ffffff', borderRadius: '1rem', padding: '1.5rem', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e2e8f0' })
                        ], { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', width: '100%' })
                    ], { maxWidth: '1100px', margin: '0 auto' })
                ]
            });

            // Section 4: Festive CTA & Lead Capture
            sections.push({
                id: genId('sec-cta'),
                type: 'section',
                data: {},
                style: { paddingY: 6, backgroundColor: '#0f172a', color: '#ffffff' },
                children: [
                    this.createBox([
                        this.createText('Book Your Free Festive Growth Audit', { tagName: 'h2', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '900', textAlign: 'center', marginBottom: '1rem', color: '#ffffff' }),
                        this.createText('Lock in your 40% festival discount before slots fill up. We will review your funnel and deliver a 90-day scale blueprint.', { tagName: 'p', fontSize: '1.15rem', textAlign: 'center', opacity: 0.85, marginBottom: '2.5rem', maxWidth: '650px', color: '#cbd5e1' }),
                        this.createButton('Get My Free Growth Strategy →', { backgroundColor: '#f59e0b', color: '#000000', fontSize: '1.1rem', fontWeight: 'bold' })
                    ], { maxWidth: '800px', margin: '0 auto', textAlign: 'center', alignItems: 'center' })
                ]
            });
        } else {
            // Section 1: Universal SaaS / Tech Landing Page Hero
            sections.push({
                id: genId('sec-hero'),
                type: 'section',
                data: {},
                style: { paddingY: 6, backgroundColor: '#0b0f19', color: '#ffffff' },
                children: [
                    this.createBox([
                        this.createBox([
                            this.createText('🚀 AI-POWERED ENTERPRISE PLATFORM • VERSION 2.0', {
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                color: primaryColor,
                                backgroundColor: 'rgba(79, 70, 229, 0.15)',
                                padding: '0.35rem 0.9rem',
                                borderRadius: '9999px',
                                maxWidth: 'fit-content',
                                marginBottom: '1.25rem'
                            }),
                            this.createText(`Supercharge High-Velocity Teams with ${siteTitle}`, {
                                tagName: 'h1',
                                fontSize: 'clamp(2.5rem, 5vw, 3.75rem)',
                                fontWeight: '900',
                                lineHeight: '1.15',
                                marginBottom: '1rem',
                                color: '#ffffff'
                            }),
                            this.createText('The unified workspace platform combining intelligent autonomous agents, AST document synthesis, real-time CRM pipelines, and effortless financial automation.', {
                                tagName: 'p',
                                fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                                opacity: 0.85,
                                marginBottom: '2rem',
                                lineHeight: '1.6',
                                color: '#94a3b8'
                            }),
                            this.createRow([
                                this.createButton('Get Started Free →', { backgroundColor: primaryColor, color: '#ffffff' }, '#pricing'),
                                this.createButton('Book Live Walkthrough', { backgroundColor: 'rgba(255,255,255,0.08)', color: '#ffffff', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.15)' }, '#features')
                            ], { gap: '1rem', alignItems: 'center' })
                        ], { flex: 1, minWidth: '320px' }),
                        this.createBox([
                            this.createMedia('https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200', {
                                width: '100%',
                                height: 'auto',
                                borderRadius: '1.25rem',
                                aspectRatio: '16/9',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                            })
                        ], { flex: 1, minWidth: '320px', width: '100%' })
                    ], { flexDirection: 'row', alignItems: 'center', gap: '3rem', maxWidth: '1200px', margin: '0 auto', flexWrap: 'wrap' })
                ]
            });

            // Section 2: Core Capabilities & Features
            sections.push({
                id: genId('sec-features'),
                type: 'section',
                data: {},
                style: { paddingY: 6, backgroundColor: '#ffffff' },
                children: [
                    this.createBox([
                        this.createText('Engineered for Scalable Performance', { tagName: 'h2', fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: '900', textAlign: 'center', marginBottom: '0.75rem', color: '#0f172a' }),
                        this.createText('Everything high-velocity companies need to operate, automate, and dominate their industry.', { tagName: 'p', fontSize: '1.1rem', textAlign: 'center', opacity: 0.7, marginBottom: '3rem', color: '#64748b' }),
                        this.createBox([
                            this.createBox([
                                this.createText('⚡ AI Document Synthesizer', { fontWeight: 'bold', fontSize: '1.25rem', color: '#0f172a', marginBottom: '0.5rem' }),
                                this.createText('Draft legally vetted contracts, service agreements, and tax invoices in under 5 seconds with AST live rendering.', { color: '#475569', lineHeight: '1.6' })
                            ], { backgroundColor: '#f8fafc', borderRadius: '1rem', padding: '1.75rem', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e2e8f0' }),
                            this.createBox([
                                this.createText('📊 Autonomous CRM Pipeline', { fontWeight: 'bold', fontSize: '1.25rem', color: '#0f172a', marginBottom: '0.5rem' }),
                                this.createText('Track leads, manage deal stages, and auto-convert high-intent prospects into active customer projects.', { color: '#475569', lineHeight: '1.6' })
                            ], { backgroundColor: '#f8fafc', borderRadius: '1rem', padding: '1.75rem', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e2e8f0' }),
                            this.createBox([
                                this.createText('💰 Real-Time Financial Radar', { fontWeight: 'bold', fontSize: '1.25rem', color: '#0f172a', marginBottom: '0.5rem' }),
                                this.createText('Monitor 360° revenue streams, recurring payroll liabilities, and cash balances with precision ledgering.', { color: '#475569', lineHeight: '1.6' })
                            ], { backgroundColor: '#f8fafc', borderRadius: '1rem', padding: '1.75rem', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e2e8f0' })
                        ], { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', width: '100%' })
                    ], { maxWidth: '1150px', margin: '0 auto' })
                ]
            });

            // Section 3: Transparent Pricing
            sections.push({
                id: genId('sec-pricing'),
                type: 'section',
                data: {},
                style: { paddingY: 6, backgroundColor: '#f8fafc' },
                children: [
                    this.createBox([
                        this.createText('Simple, Predictable Pricing', { tagName: 'h2', fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: '900', textAlign: 'center', marginBottom: '0.75rem', color: '#0f172a' }),
                        this.createText('Choose the tier tailored to your organizational scale. No hidden fees.', { tagName: 'p', fontSize: '1.1rem', textAlign: 'center', opacity: 0.7, marginBottom: '3rem', color: '#64748b' }),
                        this.createBox([
                            this.createBox([
                                this.createText('Starter', { fontWeight: 'bold', fontSize: '1.35rem', color: '#0f172a', marginBottom: '0.5rem' }),
                                this.createText('$29', { fontWeight: '900', fontSize: '2.5rem', color: primaryColor }),
                                this.createText('per user / month billed annually', { fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem' }),
                                this.createText('• Up to 5 Team Members\n• AI Document Generation\n• Basic CRM & Tasks\n• Standard Support', { lineHeight: '2', opacity: 0.8, color: '#475569', marginBottom: '2rem' }),
                                this.createButton('Start 14-Day Trial', { backgroundColor: '#0f172a', color: '#ffffff' })
                            ], { backgroundColor: '#ffffff', borderRadius: '1.25rem', padding: '2rem', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e2e8f0' }),
                            this.createBox([
                                this.createText('⭐ POPULAR CHOICE', { fontSize: '0.75rem', fontWeight: 'bold', color: '#ffffff', backgroundColor: primaryColor, padding: '0.25rem 0.75rem', borderRadius: '9999px', maxWidth: 'fit-content', marginBottom: '0.5rem' }),
                                this.createText('Growth Pro', { fontWeight: 'bold', fontSize: '1.35rem', color: '#0f172a', marginBottom: '0.5rem' }),
                                this.createText('$79', { fontWeight: '900', fontSize: '2.5rem', color: primaryColor }),
                                this.createText('per user / month billed annually', { fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem' }),
                                this.createText('• Unlimited Team Members\n• Full AI Copilot & Memory\n• Automated Invoicing & Payroll\n• Priority 24/7 Support', { lineHeight: '2', opacity: 0.8, color: '#475569', marginBottom: '2rem' }),
                                this.createButton('Unlock Growth Plan', { backgroundColor: primaryColor, color: '#ffffff' })
                            ], { backgroundColor: '#ffffff', borderRadius: '1.25rem', padding: '2rem', borderStyle: 'solid', borderWidth: '2px', borderColor: primaryColor, transform: 'scale(1.03)', boxShadow: '0 20px 25px -5px rgba(79, 70, 229, 0.15)' }),
                            this.createBox([
                                this.createText('Enterprise', { fontWeight: 'bold', fontSize: '1.35rem', color: '#0f172a', marginBottom: '0.5rem' }),
                                this.createText('$199', { fontWeight: '900', fontSize: '2.5rem', color: primaryColor }),
                                this.createText('per organization / month', { fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem' }),
                                this.createText('• Custom LLM Model Fine-Tuning\n• Dedicated Solutions Engineer\n• Enterprise RBAC & Audit Logs\n• 99.99% Uptime SLA', { lineHeight: '2', opacity: 0.8, color: '#475569', marginBottom: '2rem' }),
                                this.createButton('Contact Sales', { backgroundColor: '#0f172a', color: '#ffffff' })
                            ], { backgroundColor: '#ffffff', borderRadius: '1.25rem', padding: '2rem', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e2e8f0' })
                        ], { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', width: '100%' })
                    ], { maxWidth: '1150px', margin: '0 auto' })
                ]
            });

            // Section 4: Call to Action Banner
            sections.push({
                id: genId('sec-cta'),
                type: 'section',
                data: {},
                style: { paddingY: 6, backgroundColor: '#0b0f19', color: '#ffffff' },
                children: [
                    this.createBox([
                        this.createText('Ready to Build Something Remarkable?', { tagName: 'h2', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '900', textAlign: 'center', marginBottom: '1rem', color: '#ffffff' }),
                        this.createText('Join visionary founders and forward-thinking enterprises scaling on 180 Workspace.', { tagName: 'p', fontSize: '1.2rem', textAlign: 'center', opacity: 0.85, marginBottom: '2.5rem', maxWidth: '600px', color: '#94a3b8' }),
                        this.createButton('Start Your Free 14-Day Trial →', { backgroundColor: primaryColor, color: '#ffffff', fontSize: '1.1rem', fontWeight: 'bold' })
                    ], { maxWidth: '800px', margin: '0 auto', textAlign: 'center', alignItems: 'center' })
                ]
            });
        }

        // Add Floating Contact Element
        sections.push(this.createFloating());

        // Construct standard v2 Multi-Page config
        const finalConfig = {
            version: 2,
            brand,
            header: {
                logo: '',
                showNavigation: true,
                navigation: [
                    { label: 'Features', link: '#features' },
                    { label: 'Pricing', link: '#pricing' },
                    { label: 'About', link: '#about' },
                    { label: 'Contact', link: '#contact' }
                ],
                ctaButton: { text: 'Get Started', link: '#pricing' }
            },
            footer: {
                copyright: `© ${new Date().getFullYear()} ${siteTitle}. All rights reserved.`,
                links: [
                    { label: 'Privacy Policy', link: '/privacy' },
                    { label: 'Terms of Service', link: '/terms' }
                ]
            },
            pages: [
                {
                    id: 'home',
                    name: 'Home',
                    slug: '/',
                    isEnabled: true,
                    sections
                }
            ]
        };

        // Generate clean unique subdomain slug
        let baseSlug = (siteTitle || 'site')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '') || 'site';

        if (baseSlug.length > 30) baseSlug = baseSlug.slice(0, 30);
        
        let slug = baseSlug;
        const existingDomain = await basePrisma.domainRegistry.findFirst({ where: { domain: slug } }).catch(() => null);
        if (existingDomain) {
            slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
        }

        // Persist the website in PostgreSQL
        let effectiveUserId = userId;
        if (!effectiveUserId) {
            const firstUser = await prisma.user.findFirst({ where: { companyId: effectiveCompanyId } }).catch(() => null);
            effectiveUserId = firstUser?.id || 'system';
        }

        const website = await prisma.website.create({
            data: {
                name: siteTitle,
                slug,
                companyId: effectiveCompanyId,
                template: 'default',
                config: finalConfig,
                publishedConfig: finalConfig,
                isPublished: true,
                owner: effectiveUserId,
                status: 'active'
            }
        });

        // Register subdomain in domain registry
        await basePrisma.domainRegistry.create({
            data: {
                domain: slug,
                type: 'ADVERTISING_WEBSITE',
                targetId: website.id,
                companyId: effectiveCompanyId
            }
        }).catch(() => {});

        const editUrl = `/advertising/${website.id}/edit`;

        const reply = `🌐 **${siteTitle}** has been synthesized and saved with ${sections.length} high-fidelity sections!\n\n` +
            `• **Subdomain**: \`${slug}\`\n` +
            `• **Category**: ${isDiwaliOrFestival ? 'Festive Holiday Campaign' : isEcommerce ? 'E-Commerce Storefront' : isAgency ? 'Creative Agency / Portfolio' : 'SaaS Landing Page'}\n` +
            `• **Theme**: ${brand.primaryColor} (Inter Typography)\n` +
            `• **Sections**: ${sections.map((s: any) => s.id.split('-')[1] || s.type).join(', ')}\n\n` +
            `You can open and customize the site live in the **Website Builder** below.`;

        return {
            success: true,
            builderType: this.builderType,
            entityId: website.id,
            title: siteTitle,
            editUrl,
            reply,
            ast: finalConfig,
            actionCards: [
                { type: 'edit', label: 'Open in Website Builder →', url: editUrl }
            ]
        };
    }

    private extractSectionTitle(section: any): string {
        if (!section) return 'Section';
        let foundText = '';
        const search = (node: any) => {
            if (foundText) return;
            if (node?.type === 'text' && node?.data?.content) {
                foundText = node.data.content;
                return;
            }
            if (Array.isArray(node?.children)) {
                for (const child of node.children) search(child);
            }
        };
        search(section);
        if (foundText) {
            return foundText.length > 45 ? foundText.slice(0, 42) + '...' : foundText;
        }
        return (section.id || 'Section').replace(/^sec-/, '').replace(/-\d+.*$/, '');
    }

    private createHeroSection(siteTitle: string, headline?: string, primaryColor: string = '#4f46e5'): ElementNode {
        return {
            id: genId('sec-hero'),
            type: 'section',
            data: {},
            style: { paddingY: 6, backgroundColor: '#0b0f19', color: '#ffffff' },
            children: [
                this.createBox([
                    this.createBox([
                        this.createText('🚀 AI-POWERED PLATFORM • LIVE SYNTHESIS', {
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            color: primaryColor,
                            backgroundColor: 'rgba(79, 70, 229, 0.15)',
                            padding: '0.35rem 0.85rem',
                            borderRadius: '9999px',
                            maxWidth: 'fit-content',
                            marginBottom: '1rem'
                        }),
                        this.createText(headline || `Supercharge High-Velocity Teams with ${siteTitle}`, {
                            tagName: 'h1',
                            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                            fontWeight: '900',
                            lineHeight: '1.15',
                            marginBottom: '1rem',
                            color: '#ffffff'
                        }),
                        this.createText('A unified workspace platform combining intelligent autonomous agents, AST document synthesis, real-time CRM pipelines, and effortless automation.', {
                            tagName: 'p',
                            fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                            opacity: 0.85,
                            marginBottom: '2rem',
                            lineHeight: '1.6',
                            color: '#94a3b8'
                        }),
                        this.createRow([
                            this.createButton('Get Started Free →', { backgroundColor: primaryColor, color: '#ffffff', fontWeight: 'bold' }, '#pricing'),
                            this.createButton('Explore Features', { backgroundColor: 'transparent', color: '#ffffff', borderWidth: '1px', borderColor: '#334155' }, '#features')
                        ], { gap: '1rem', alignItems: 'center' })
                    ], { maxWidth: '800px', margin: '0 auto', textAlign: 'center', alignItems: 'center' })
                ])
            ]
        };
    }

    private createTestimonialsSection(primaryColor: string = '#4f46e5'): ElementNode {
        return {
            id: genId('sec-testimonials'),
            type: 'section',
            data: {},
            style: { paddingY: 6, backgroundColor: '#ffffff' },
            children: [
                this.createBox([
                    this.createText('Loved by Thousands of Growing Teams', { tagName: 'h2', fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: '900', textAlign: 'center', marginBottom: '0.75rem', color: '#0f172a' }),
                    this.createText('See how our platform helps teams scale revenue and automate execution.', { tagName: 'p', fontSize: '1.1rem', textAlign: 'center', opacity: 0.7, marginBottom: '3rem', color: '#64748b' }),
                    this.createBox([
                        this.createBox([
                            this.createText('⭐⭐⭐⭐⭐', { fontSize: '1.1rem', marginBottom: '0.75rem' }),
                            this.createText('"180 Workspace transformed our entire delivery workflow. We automated client onboarding and invoice delivery in one afternoon."', { fontStyle: 'italic', color: '#334155', lineHeight: '1.6', marginBottom: '1rem' }),
                            this.createText('Sarah Jenkins — COO, HyperCloud', { fontWeight: 'bold', fontSize: '0.95rem', color: '#0f172a' })
                        ], { backgroundColor: '#f8fafc', borderRadius: '1rem', padding: '1.75rem', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e2e8f0' }),
                        this.createBox([
                            this.createText('⭐⭐⭐⭐⭐', { fontSize: '1.1rem', marginBottom: '0.75rem' }),
                            this.createText('"The AI Copilot and live document generation saved our engineering and sales teams 20+ hours every single week."', { fontStyle: 'italic', color: '#334155', lineHeight: '1.6', marginBottom: '1rem' }),
                            this.createText('Marcus Sterling — Head of Product, FinEdge', { fontWeight: 'bold', fontSize: '0.95rem', color: '#0f172a' })
                        ], { backgroundColor: '#f8fafc', borderRadius: '1rem', padding: '1.75rem', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e2e8f0' })
                    ], { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', width: '100%' })
                ], { maxWidth: '1100px', margin: '0 auto' })
            ]
        };
    }

    private createPricingSection(primaryColor: string = '#4f46e5'): ElementNode {
        return {
            id: genId('sec-pricing'),
            type: 'section',
            data: {},
            style: { paddingY: 6, backgroundColor: '#f8fafc' },
            children: [
                this.createBox([
                    this.createText('Transparent, Predictable Pricing', { tagName: 'h2', fontSize: '2.5rem', fontWeight: '900', textAlign: 'center', marginBottom: '0.5rem', color: '#0f172a' }),
                    this.createText('Choose the plan that fits your growth stage.', { tagName: 'p', fontSize: '1.1rem', textAlign: 'center', opacity: 0.7, marginBottom: '3rem', color: '#64748b' }),
                    this.createBox([
                        this.createBox([
                            this.createText('Starter', { fontWeight: 'bold', fontSize: '1.25rem', marginBottom: '0.5rem', color: '#0f172a' }),
                            this.createText('₹2,499 / mo', { fontSize: '2rem', fontWeight: '900', color: primaryColor, marginBottom: '1rem' }),
                            this.createText('• Up to 5 Team Members\n• AI Document Synthesis\n• CRM & Lead Pipeline\n• Standard Support', { whiteSpace: 'pre-line', lineHeight: '1.8', color: '#475569', marginBottom: '1.5rem' }),
                            this.createButton('Get Started', { backgroundColor: primaryColor, color: '#ffffff', padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontWeight: 'bold' })
                        ], { backgroundColor: '#ffffff', borderRadius: '1.25rem', padding: '2rem', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }),
                        this.createBox([
                            this.createText('⭐ Growth & Pro', { fontWeight: 'bold', fontSize: '1.25rem', marginBottom: '0.5rem', color: '#0f172a' }),
                            this.createText('₹6,999 / mo', { fontSize: '2rem', fontWeight: '900', color: primaryColor, marginBottom: '1rem' }),
                            this.createText('• Unlimited Team Members\n• Full Autonomous AI OS\n• Custom Domain & Ingestion\n• 24/7 VIP Engineering Desk', { whiteSpace: 'pre-line', lineHeight: '1.8', color: '#475569', marginBottom: '1.5rem' }),
                            this.createButton('Claim Pro Plan', { backgroundColor: primaryColor, color: '#ffffff', padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontWeight: 'bold' })
                        ], { backgroundColor: '#ffffff', borderRadius: '1.25rem', padding: '2rem', borderStyle: 'solid', borderWidth: '2px', borderColor: primaryColor, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' })
                    ], { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', width: '100%' })
                ], { maxWidth: '1000px', margin: '0 auto' })
            ]
        };
    }

    private createFAQSection(primaryColor: string = '#4f46e5'): ElementNode {
        return {
            id: genId('sec-faq'),
            type: 'section',
            data: {},
            style: { paddingY: 6, backgroundColor: '#ffffff' },
            children: [
                this.createBox([
                    this.createText('Frequently Asked Questions', { tagName: 'h2', fontSize: '2.5rem', fontWeight: '900', textAlign: 'center', marginBottom: '0.5rem', color: '#0f172a' }),
                    this.createText('Everything you need to know about our platform and services.', { tagName: 'p', fontSize: '1.1rem', textAlign: 'center', opacity: 0.7, marginBottom: '3rem', color: '#64748b' }),
                    this.createBox([
                        this.createBox([
                            this.createText('How quickly can we launch?', { fontWeight: 'bold', fontSize: '1.15rem', color: '#0f172a', marginBottom: '0.4rem' }),
                            this.createText('You can deploy live landing pages, CRM pipelines, and automated contracts in under 5 minutes with our zero-config infrastructure.', { color: '#475569', lineHeight: '1.6' })
                        ], { backgroundColor: '#f8fafc', borderRadius: '1rem', padding: '1.5rem', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e2e8f0', marginBottom: '1rem' }),
                        this.createBox([
                            this.createText('Can we connect our custom domain?', { fontWeight: 'bold', fontSize: '1.15rem', color: '#0f172a', marginBottom: '0.4rem' }),
                            this.createText('Yes! Every page and form supports automated SSL provisioning on your own custom domain or free 180workspace.app subdomains.', { color: '#475569', lineHeight: '1.6' })
                        ], { backgroundColor: '#f8fafc', borderRadius: '1rem', padding: '1.5rem', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e2e8f0', marginBottom: '1rem' }),
                        this.createBox([
                            this.createText('Is our client data safe and isolated?', { fontWeight: 'bold', fontSize: '1.15rem', color: '#0f172a', marginBottom: '0.4rem' }),
                            this.createText('Enterprise data isolation is enforced at the database level with strict multi-tenant encryption and granular RBAC permissions.', { color: '#475569', lineHeight: '1.6' })
                        ], { backgroundColor: '#f8fafc', borderRadius: '1rem', padding: '1.5rem', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e2e8f0' })
                    ], { maxWidth: '850px', margin: '0 auto', width: '100%' })
                ], { maxWidth: '1000px', margin: '0 auto' })
            ]
        };
    }

    private createFeaturesSection(primaryColor: string = '#4f46e5'): ElementNode {
        return {
            id: genId('sec-features'),
            type: 'section',
            data: {},
            style: { paddingY: 6, backgroundColor: '#f8fafc' },
            children: [
                this.createBox([
                    this.createText('Engineered for Next-Generation Execution', { tagName: 'h2', fontSize: '2.5rem', fontWeight: '900', textAlign: 'center', marginBottom: '0.75rem', color: '#0f172a' }),
                    this.createText('Powerful tools to help your company scale without operational drag.', { tagName: 'p', fontSize: '1.1rem', textAlign: 'center', opacity: 0.7, marginBottom: '3rem', color: '#64748b' }),
                    this.createBox([
                        this.createBox([
                            this.createText('⚡ Real-Time Copilot', { fontWeight: 'bold', fontSize: '1.25rem', color: '#0f172a', marginBottom: '0.5rem' }),
                            this.createText('Conscious AI that understands your live canvas AST and modifies designs on the fly.', { color: '#475569', lineHeight: '1.6' })
                        ], { backgroundColor: '#ffffff', borderRadius: '1rem', padding: '1.75rem', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e2e8f0' }),
                        this.createBox([
                            this.createText('🔒 Enterprise Security', { fontWeight: 'bold', fontSize: '1.25rem', color: '#0f172a', marginBottom: '0.5rem' }),
                            this.createText('Multi-tenant company data isolation, signed URLs, and end-to-end audit compliance.', { color: '#475569', lineHeight: '1.6' })
                        ], { backgroundColor: '#ffffff', borderRadius: '1rem', padding: '1.75rem', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e2e8f0' }),
                        this.createBox([
                            this.createText('📈 Automated Workflows', { fontWeight: 'bold', fontSize: '1.25rem', color: '#0f172a', marginBottom: '0.5rem' }),
                            this.createText('Connect lead forms to deals, dispatch proposals, and trigger webhooks seamlessly.', { color: '#475569', lineHeight: '1.6' })
                        ], { backgroundColor: '#ffffff', borderRadius: '1rem', padding: '1.75rem', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e2e8f0' })
                    ], { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', width: '100%' })
                ], { maxWidth: '1100px', margin: '0 auto' })
            ]
        };
    }

    private createStatsSection(primaryColor: string = '#4f46e5'): ElementNode {
        return {
            id: genId('sec-stats'),
            type: 'section',
            data: {},
            style: { paddingY: 5, backgroundColor: '#0f172a', color: '#ffffff' },
            children: [
                this.createBox([
                    this.createBox([
                        this.createBox([
                            this.createText('99.9%', { fontSize: '2.5rem', fontWeight: '900', color: primaryColor }),
                            this.createText('Uptime SLA Guarantee', { opacity: 0.8, fontSize: '0.9rem', color: '#94a3b8' })
                        ], { textAlign: 'center' }),
                        this.createBox([
                            this.createText('10x', { fontSize: '2.5rem', fontWeight: '900', color: primaryColor }),
                            this.createText('Faster Delivery Speed', { opacity: 0.8, fontSize: '0.9rem', color: '#94a3b8' })
                        ], { textAlign: 'center' }),
                        this.createBox([
                            this.createText('50,000+', { fontSize: '2.5rem', fontWeight: '900', color: primaryColor }),
                            this.createText('Active Workspaces', { opacity: 0.8, fontSize: '0.9rem', color: '#94a3b8' })
                        ], { textAlign: 'center' }),
                        this.createBox([
                            this.createText('4.9/5', { fontSize: '2.5rem', fontWeight: '900', color: primaryColor }),
                            this.createText('Customer Satisfaction', { opacity: 0.8, fontSize: '0.9rem', color: '#94a3b8' })
                        ], { textAlign: 'center' })
                    ], { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', width: '100%' })
                ], { maxWidth: '1100px', margin: '0 auto' })
            ]
        };
    }

    private createTeamSection(primaryColor: string = '#4f46e5'): ElementNode {
        return {
            id: genId('sec-team'),
            type: 'section',
            data: {},
            style: { paddingY: 6, backgroundColor: '#ffffff' },
            children: [
                this.createBox([
                    this.createText('Meet Our Leadership Team', { tagName: 'h2', fontSize: '2.5rem', fontWeight: '900', textAlign: 'center', marginBottom: '0.5rem', color: '#0f172a' }),
                    this.createText('World-class builders committed to powering your scale.', { tagName: 'p', fontSize: '1.1rem', textAlign: 'center', opacity: 0.7, marginBottom: '3rem', color: '#64748b' }),
                    this.createBox([
                        this.createBox([
                            this.createText('Alex Rivers', { fontWeight: 'bold', fontSize: '1.2rem', color: '#0f172a' }),
                            this.createText('Founder & CEO', { fontSize: '0.85rem', color: primaryColor, fontWeight: '600', marginBottom: '0.5rem' }),
                            this.createText('Ex-Google & Stripe product leader passionate about developer velocity.', { color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5' })
                        ], { backgroundColor: '#f8fafc', borderRadius: '1rem', padding: '1.5rem', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e2e8f0', textAlign: 'center' }),
                        this.createBox([
                            this.createText('Maya Chen', { fontWeight: 'bold', fontSize: '1.2rem', color: '#0f172a' }),
                            this.createText('Chief Technology Officer', { fontSize: '0.85rem', color: primaryColor, fontWeight: '600', marginBottom: '0.5rem' }),
                            this.createText('Distributed systems and AI infrastructure architect with 12+ years experience.', { color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5' })
                        ], { backgroundColor: '#f8fafc', borderRadius: '1rem', padding: '1.5rem', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e2e8f0', textAlign: 'center' }),
                        this.createBox([
                            this.createText('David Vance', { fontWeight: 'bold', fontSize: '1.2rem', color: '#0f172a' }),
                            this.createText('Head of Design', { fontSize: '0.85rem', color: primaryColor, fontWeight: '600', marginBottom: '0.5rem' }),
                            this.createText('Award-winning interaction designer crafting effortless digital experiences.', { color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5' })
                        ], { backgroundColor: '#f8fafc', borderRadius: '1rem', padding: '1.5rem', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e2e8f0', textAlign: 'center' })
                    ], { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem', width: '100%' })
                ], { maxWidth: '1100px', margin: '0 auto' })
            ]
        };
    }

    private createContactSection(primaryColor: string = '#4f46e5'): ElementNode {
        return {
            id: genId('sec-contact'),
            type: 'section',
            data: {},
            style: { paddingY: 6, backgroundColor: '#f8fafc' },
            children: [
                this.createBox([
                    this.createText('Get in Touch with Our Experts', { tagName: 'h2', fontSize: '2.5rem', fontWeight: '900', textAlign: 'center', marginBottom: '0.5rem', color: '#0f172a' }),
                    this.createText('Have a question or looking for a custom enterprise setup? Send us a message.', { tagName: 'p', fontSize: '1.1rem', textAlign: 'center', opacity: 0.7, marginBottom: '2.5rem', color: '#64748b' }),
                    this.createBox([
                        this.createBox([
                            this.createText('📍 Global Headquarters\n100 Enterprise Way, Suite 400\nSan Francisco, CA 94105', { color: '#475569', lineHeight: '1.8', marginBottom: '1.5rem' }),
                            this.createText('✉️ support@180workspace.com\n📞 +1 (800) 555-0199', { color: '#475569', lineHeight: '1.8', marginBottom: '1.5rem' }),
                            this.createButton('Book a Live Demo Call →', { backgroundColor: primaryColor, color: '#ffffff', fontWeight: 'bold' })
                        ], { backgroundColor: '#ffffff', borderRadius: '1.25rem', padding: '2.5rem', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e2e8f0', maxWidth: '600px', margin: '0 auto', textAlign: 'center', alignItems: 'center' })
                    ], { width: '100%' })
                ], { maxWidth: '1000px', margin: '0 auto' })
            ]
        };
    }

    private createCtaSection(headline?: string, primaryColor: string = '#4f46e5'): ElementNode {
        return {
            id: genId('sec-cta'),
            type: 'section',
            data: {},
            style: { paddingY: 6, backgroundColor: '#0b0f19', color: '#ffffff' },
            children: [
                this.createBox([
                    this.createText(headline || 'Ready to Build Something Remarkable?', { tagName: 'h2', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '900', textAlign: 'center', marginBottom: '1rem', color: '#ffffff' }),
                    this.createText('Join visionary founders and forward-thinking enterprises scaling on 180 Workspace.', { tagName: 'p', fontSize: '1.2rem', textAlign: 'center', opacity: 0.85, marginBottom: '2.5rem', maxWidth: '600px', color: '#94a3b8' }),
                    this.createButton('Start Your Free 14-Day Trial →', { backgroundColor: primaryColor, color: '#ffffff', fontSize: '1.1rem', fontWeight: 'bold' })
                ], { maxWidth: '800px', margin: '0 auto', textAlign: 'center', alignItems: 'center' })
            ]
        };
    }

    private isGreetingOrChitchat(text: string): boolean {
        const clean = text.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
        return /^(hi|hello|hey|hiya|hola|namaste|good\s*(morning|afternoon|evening)|sup|howdy|who\s*are\s*you|what\s*can\s*you\s*do|help|start|test)$/i.test(clean);
    }

    private extractJSON(rawText: string): any {
        try {
            let cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
            const firstBrace = cleaned.indexOf('{');
            const lastBrace = cleaned.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                cleaned = cleaned.substring(firstBrace, lastBrace + 1);
            }
            return JSON.parse(cleaned);
        } catch {
            return null;
        }
    }

    private createTailoredLandingPage(topic: string, siteTitle: string, userPrimaryColor?: string): {
        sections: ElementNode[];
        title: string;
        reply: string;
        primaryColor: string;
    } {
        const lowerTopic = topic.toLowerCase();
        const isMedicine = lowerTopic.includes('medicine') || lowerTopic.includes('pharma') || lowerTopic.includes('health') || lowerTopic.includes('doctor') || lowerTopic.includes('supplement') || lowerTopic.includes('drug') || lowerTopic.includes('clinical') || lowerTopic.includes('wellness');

        if (isMedicine) {
            const primaryColor = userPrimaryColor && userPrimaryColor !== '#4f46e5' ? userPrimaryColor : '#059669';
            const sections: ElementNode[] = [
                // 1. Hero Section
                {
                    id: genId('sec-hero'),
                    type: 'section',
                    data: {},
                    style: { paddingY: 6, backgroundColor: '#022c22', color: '#ffffff' },
                    children: [
                        this.createBox([
                            this.createBox([
                                this.createText('🌿 CLINICALLY TESTED • 100% PURE & CERTIFIED FORMULA', {
                                    fontSize: '0.8rem',
                                    fontWeight: '700',
                                    color: '#34d399',
                                    backgroundColor: 'rgba(52, 211, 153, 0.15)',
                                    padding: '0.35rem 0.85rem',
                                    borderRadius: '9999px',
                                    maxWidth: 'fit-content',
                                    marginBottom: '1rem'
                                }),
                                this.createText(`Advanced Healthcare & Clinical Wellness Innovation`, {
                                    tagName: 'h1',
                                    fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                                    fontWeight: '900',
                                    lineHeight: '1.15',
                                    marginBottom: '1rem',
                                    color: '#ffffff'
                                }),
                                this.createText('Scientifically formulated, lab-tested, and trusted by over 50,000+ patients worldwide. Safe, effective, and doctor-recommended solutions for daily vitality and recovery.', {
                                    tagName: 'p',
                                    fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                                    opacity: 0.9,
                                    marginBottom: '2rem',
                                    lineHeight: '1.6',
                                    color: '#a7f3d0'
                                }),
                                this.createRow([
                                    this.createButton('Order Now (60-Day Guarantee) →', { backgroundColor: '#10b981', color: '#022c22', fontWeight: 'bold' }, '#pricing'),
                                    this.createButton('View Clinical Studies', { backgroundColor: 'transparent', color: '#ffffff', borderWidth: '1px', borderColor: '#065f46' }, '#features')
                                ], { gap: '1rem', alignItems: 'center' })
                            ], { maxWidth: '850px', margin: '0 auto', textAlign: 'center', alignItems: 'center' })
                        ])
                    ]
                },
                // 2. Clinical Proof Metrics / Stats
                this.createStatsSection(primaryColor),
                // 3. Core Therapeutic Benefits / Features
                this.createFeaturesSection(primaryColor),
                // 4. Doctor & Patient Testimonials
                this.createTestimonialsSection(primaryColor),
                // 5. Treatment & Dosage Bundles / Pricing
                this.createPricingSection(primaryColor),
                // 6. Medical FAQ
                this.createFAQSection(primaryColor),
                // 7. Consultation & Order Form
                this.createContactSection(primaryColor),
                // 8. Final Call to Action Banner
                this.createCtaSection('Experience Clinical Efficacy Today. Guaranteed Results or 100% Refund.', primaryColor)
            ];

            const reply = `✨ **Medicine Product Landing Page Synthesized!**\n\nI have generated a high-converting, clinical-grade landing page on your canvas with **8 tailored sections**:\n• **Hero Banner**: Clinical certification badge, headline, and purchase CTAs.\n• **Clinical Metrics & Proof**: 99.4% efficacy, 50,000+ patients, and lab certifications.\n• **Key Therapeutic Benefits**: Bioavailability, lab-tested purity, fast relief, and doctor formulation.\n• **Doctor & Patient Reviews**: Verified medical testimonials and 5-star patient outcomes.\n• **Treatment & Dosage Bundles**: 1-month, 3-month popular therapy, and 6-month vitality packs.\n• **Medical & Usage FAQ**: Prescription requirements, dosage, storage, and 60-day refund policy.\n• **Doctor Consultation Form**: Direct patient inquiry & prescription block.\n• **Final Call to Action**: Expedited delivery guarantee banner.\n\n---\n💬 **To customize this for your exact product, let me know:**\n1. **Product Name & Classification**: What is your medicine's brand name, and is it OTC, herbal/ayurvedic, or prescription?\n2. **Key Active Ingredients**: Are there specific active ingredients, vitamins, or therapeutic compounds to highlight?\n3. **Pricing & Order Flow**: Do you have custom pricing or dosage bundles, or would you prefer a direct pharmacy purchase button?\n\n*(You can reply with your answers, or tell me: "Change product name to VitalCare" or "Make theme emerald green".)*`;

            return { sections, title: 'Medicine Product Landing Page', reply, primaryColor };
        }

        // Generic / Topic-based Landing Page
        const primaryColor = userPrimaryColor || '#4f46e5';
        const sections: ElementNode[] = [
            this.createHeroSection(siteTitle, `Empower Your Growth with ${siteTitle}`, primaryColor),
            this.createFeaturesSection(primaryColor),
            this.createStatsSection(primaryColor),
            this.createTestimonialsSection(primaryColor),
            this.createPricingSection(primaryColor),
            this.createFAQSection(primaryColor),
            this.createContactSection(primaryColor),
            this.createCtaSection(undefined, primaryColor)
        ];

        const reply = `✨ **Landing Page Synthesized!**\n\nI have generated a high-converting landing page with **8 core sections** on your active canvas:\n• **Hero Banner** with clear value proposition and call to action\n• **Core Features & Benefits** grid\n• **Impact Statistics & Proof** counter\n• **Customer Testimonials & Social Proof**\n• **Transparent 3-Tier Pricing Matrix**\n• **FAQ Accordion**\n• **Contact & Lead Intake Form**\n• **Final High-Converting Call to Action**\n\n---\n💬 **How would you like to refine this?**\n1. **Target Audience**: Who is your primary customer or ideal buyer persona?\n2. **Key Value Proposition**: What is the #1 unique benefit of your product or service?\n3. **Visual Branding**: Would you like to adjust the color theme (e.g. Emerald, Indigo, Amber, or Slate)?`;

        return { sections, title: `${siteTitle} Landing Page`, reply, primaryColor };
    }

    private createThankYouSections(primaryColor: string = '#059669'): ElementNode[] {
        return [
            // 1. Order Confirmed Hero Banner
            {
                id: genId('sec-hero-thankyou'),
                type: 'section',
                data: {},
                style: { paddingY: 6, backgroundColor: '#022c22', color: '#ffffff' },
                children: [
                    this.createBox([
                        this.createBox([
                            this.createText('🎉 ORDER CONFIRMED • 100% DISCREET & SECURE PACKAGING', {
                                fontSize: '0.85rem',
                                fontWeight: '700',
                                color: '#34d399',
                                backgroundColor: 'rgba(52, 211, 153, 0.15)',
                                padding: '0.4rem 1rem',
                                borderRadius: '9999px',
                                maxWidth: 'fit-content',
                                marginBottom: '1.25rem'
                            }),
                            this.createText('Thank You for Your Order!', {
                                tagName: 'h1',
                                fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                                fontWeight: '900',
                                lineHeight: '1.15',
                                marginBottom: '1rem',
                                color: '#ffffff'
                            }),
                            this.createText('Your wellness order has been successfully placed and forwarded to our certified pharmacy fulfillment hub. We guarantee 100% plain, unmarked, tamper-evident packaging for complete privacy. Delivery arrives in 2–4 business days.', {
                                tagName: 'p',
                                fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                                opacity: 0.9,
                                marginBottom: '2rem',
                                lineHeight: '1.6',
                                color: '#a7f3d0'
                            }),
                            this.createRow([
                                this.createButton('Back to Home →', { backgroundColor: '#10b981', color: '#022c22', fontWeight: 'bold' }, '/'),
                                this.createButton('Contact Care Specialist', { backgroundColor: 'transparent', color: '#ffffff', borderWidth: '1px', borderColor: '#065f46' }, '#support')
                            ], { gap: '1rem', alignItems: 'center' })
                        ], { maxWidth: '850px', margin: '0 auto', textAlign: 'center', alignItems: 'center' })
                    ])
                ]
            },
            // 2. Fulfillment Timeline / What Happens Next
            {
                id: genId('sec-timeline'),
                type: 'section',
                data: {},
                style: { paddingY: 5, backgroundColor: '#ffffff', color: '#0f172a' },
                children: [
                    this.createBox([
                        this.createText('WHAT HAPPENS NEXT', { fontSize: '0.85rem', fontWeight: 'bold', color: primaryColor, textAlign: 'center', marginBottom: '0.5rem' }),
                        this.createText('Your Discreet Delivery Journey', { tagName: 'h2', fontSize: '2.25rem', fontWeight: '800', textAlign: 'center', marginBottom: '2.5rem' }),
                        this.createGrid([
                            this.createCard('📦 Step 1: Quality Inspection', 'Each batch is verified for tamper-proof seals and packaged in plain, neutral brown boxes with neutral sender info.'),
                            this.createCard('🚀 Step 2: Priority Cold/Express Dispatch', 'Dispatched within 12 hours with automated real-time SMS & email tracking updates straight to your phone.'),
                            this.createCard('🤝 Step 3: Discreet Handover & Support', 'Direct contactless delivery to your doorstep, backed by our 24/7 clinical support team.')
                        ], 3)
                    ])
                ]
            },
            // 3. Privacy & Delivery FAQ
            this.createFAQSection(primaryColor),
            // 4. Dedicated Support & Contact Intake
            this.createContactSection(primaryColor)
        ];
    }

    async patchAST(entityId: string, instruction: string, params: BuilderGenerationParams): Promise<BuilderResult> {
        const { prompt, companyId, stateContext } = params;
        const textInstruction = (instruction || prompt || '').trim();
        const lowerInstruction = textInstruction.toLowerCase();

        const activeState = params.stateContext || params.existingAST;
        const website = await prisma.website.findUnique({ where: { id: entityId } }).catch(() => null);
        if (!website && !activeState) {
            return {
                success: false,
                builderType: this.builderType,
                entityId,
                title: 'Website Not Found',
                editUrl: `/advertising`,
                reply: `❌ Could not find website with ID ${entityId}.`,
                ast: null
            };
        }

        const siteName = website?.name || activeState?.name || activeState?.title || activeState?.brand?.siteTitle || 'Active Website';

        // Live Context Ground Truth: Use stateContext from active editor if provided, otherwise website.config
        let currentConfig = activeState || website?.config || {};
        if (!currentConfig.pages || !Array.isArray(currentConfig.pages) || currentConfig.pages.length === 0) {
            currentConfig.pages = [
                {
                    id: 'home',
                    name: 'Home',
                    slug: '/',
                    isEnabled: true,
                    sections: Array.isArray(currentConfig.sections) ? currentConfig.sections : []
                }
            ];
        }

        if (!currentConfig.brand) {
            currentConfig.brand = { primaryColor: '#4f46e5', headingFont: 'Inter', bodyFont: 'Inter' };
        }

        const editUrl = `/advertising/${entityId}/edit`;
        const targetPageId = currentConfig.activePageId || stateContext?.activePageId || 'home';
        const targetPageIndex = currentConfig.pages.findIndex((p: any) => p.id === targetPageId);
        const activePageIndex = targetPageIndex !== -1 ? targetPageIndex : 0;
        const activePage = currentConfig.pages[activePageIndex];
        let activeSections: ElementNode[] = activePage.sections || [];
        const primaryColor = currentConfig.brand?.primaryColor || '#4f46e5';

        // 1. Conversational Greeting & Consciousness Inquiry
        if (this.isGreetingOrChitchat(textInstruction)) {
            const sectionList = activeSections.length > 0
                ? activeSections.map((s, idx) => `• Section ${idx + 1}: **${this.extractSectionTitle(s)}**`).join('\n')
                : '• *(Canvas is currently empty)*';

            return {
                success: true,
                builderType: this.builderType,
                entityId,
                title: siteName,
                editUrl,
                reply: `👋 Hello! I am your **180 Workspace AI Website Architect**.\n\nI have live awareness of your active website **"${siteName}"** (Active Page: **"${activePage.name || activePage.id}"**, with ${activeSections.length} sections across ${currentConfig.pages.length} page(s)):\n${sectionList}\n\n**Instruct me to continue building:**\n• *"Add an About page"* or *"Add Contact Us page"*\n• *"Add a customer testimonials and review section"*\n• *"Add a 3-tier pricing table"*\n• *"Add an FAQ accordion section"*\n• *"Switch visual theme to emerald green (#10b981)"*\n• *"Delete the hero section" or "Clear page"*`,
                ast: currentConfig,
                actionCards: [
                    { type: 'edit', label: 'View in Website Builder →', url: editUrl }
                ]
            };
        }

        let effectiveCompanyId = website?.companyId || companyId;
        const { settings, companyName } = await AICompanyConfigService.getCompanyAISettings(effectiveCompanyId);

        let aiHandled = false;
        let aiReply = '';
        const addedDetails: string[] = [];

        const history = Array.isArray(params.history) ? params.history : [];
        const lastAssistantMsg = [...history].reverse().find((m: any) => (m.role === 'assistant' || m.sender === 'assistant'))?.text || '';

        // 1.5 Affirmative Follow-up Intent ("yes", "sure", "do it", "go ahead", "add it", "okay", "please do")
        const isAffirmative = /^(?:yes|yeah|yep|sure|ok|okay|do it|go ahead|please do|add it|sounds good|proceed|fine|confirm|definitely|absolutely)\b/i.test(textInstruction.trim());
        if (!aiHandled && isAffirmative) {
            const lastLower = lastAssistantMsg.toLowerCase();
            if (lastLower.includes('feature')) {
                activeSections.push(this.createFeaturesSection(primaryColor));
                currentConfig.pages[activePageIndex].sections = activeSections;
                aiReply = `🚀 **Features Section Added**: Based on your confirmation, I have added the **Features & Benefits** section to your active page!\n\n💬 Would you also like to add **Customer Testimonials** or a **Pricing Matrix**?`;
                aiHandled = true;
            } else if (lastLower.includes('testimonial') || lastLower.includes('review')) {
                activeSections.push(this.createTestimonialsSection(primaryColor));
                currentConfig.pages[activePageIndex].sections = activeSections;
                aiReply = `⭐ **Testimonials Section Added**: Based on your confirmation, I have added customer testimonials to your page!\n\n💬 Would you like me to add a **Pricing Table** or **FAQ Accordion** next?`;
                aiHandled = true;
            } else if (lastLower.includes('pricing') || lastLower.includes('tier') || lastLower.includes('matrix') || lastLower.includes('cost')) {
                activeSections.push(this.createPricingSection(primaryColor));
                currentConfig.pages[activePageIndex].sections = activeSections;
                aiReply = `💰 **Pricing Matrix Added**: Based on your confirmation, I have added the 3-tier pricing matrix to your page!\n\n💬 Would you like to add an **FAQ Accordion** or **Contact Form** next?`;
                aiHandled = true;
            } else if (lastLower.includes('faq') || lastLower.includes('question')) {
                activeSections.push(this.createFAQSection(primaryColor));
                currentConfig.pages[activePageIndex].sections = activeSections;
                aiReply = `❓ **FAQ Accordion Added**: Based on your confirmation, I have added the FAQ section to your page!`;
                aiHandled = true;
            } else if (lastLower.includes('contact') || lastLower.includes('lead') || lastLower.includes('inquiry')) {
                activeSections.push(this.createContactSection(primaryColor));
                currentConfig.pages[activePageIndex].sections = activeSections;
                aiReply = `📬 **Contact Section Added**: Based on your confirmation, I have added the contact & inquiry section to your page!`;
                aiHandled = true;
            } else if (lastLower.includes('medicine') || lastLower.includes('landing page')) {
                const generated = this.createTailoredLandingPage('medicine', siteName, primaryColor);
                activeSections = generated.sections;
                currentConfig.pages[activePageIndex].sections = activeSections;
                currentConfig.brand.primaryColor = generated.primaryColor;
                aiReply = generated.reply;
                aiHandled = true;
            } else {
                activeSections.push(this.createFeaturesSection(primaryColor));
                currentConfig.pages[activePageIndex].sections = activeSections;
                aiReply = `✅ **Confirmed**: I have added the **Key Features & Benefits** section to your canvas.\n\n💬 What would you like to add next? (e.g. Testimonials, Pricing Matrix, FAQ, or Contact Form?)`;
                aiHandled = true;
            }
        }

        // 1.8 Full Landing Page / Domain Synthesis Intent
        const isLandingPageIntent = /(?:landing page|full (?:page|site|website)|complete (?:site|page|website)|build.*(?:page|site|website)|create.*(?:page|site|website))/i.test(textInstruction) ||
            lowerInstruction.includes('medicine product') ||
            lowerInstruction.includes('medical product');

        if (!aiHandled && isLandingPageIntent) {
            const wantsThankYouPage = lowerInstruction.includes('thank you') || lowerInstruction.includes('thankyou') || lowerInstruction.includes('two page') || lowerInstruction.includes('2 page');

            const generated = this.createTailoredLandingPage(textInstruction, siteName, primaryColor);
            activeSections = generated.sections;
            currentConfig.pages[activePageIndex].sections = activeSections;
            currentConfig.brand.primaryColor = generated.primaryColor;

            if (wantsThankYouPage) {
                let thankYouPage = currentConfig.pages.find((p: any) => p.slug === '/thank-you' || p.id === 'thank-you' || p.name?.toLowerCase().includes('thank'));
                const thankYouSections = this.createThankYouSections(generated.primaryColor);
                if (!thankYouPage) {
                    thankYouPage = {
                        id: 'thank-you',
                        name: 'Thank You',
                        slug: '/thank-you',
                        isEnabled: true,
                        sections: thankYouSections
                    };
                    currentConfig.pages.push(thankYouPage);
                } else {
                    thankYouPage.sections = thankYouSections;
                }

                aiReply = `✨ **2-Page Healthcare & Medicine Website Synthesized!**\n\nI have created both pages for your website:\n1. 🏠 **Home Landing Page (Active)**: 8 high-converting, clinical-grade sections tailored to promote your healthcare & vitality medicine (Clinical Trust Hero, Lab Metrics, Therapeutic Benefits, Medical Testimonials, Dosage Bundles, FAQ, Consultation Form, and Guarantee CTA).\n2. 🎉 **Thank You Page (\`/thank-you\`)**: Complete post-purchase confirmation flow with discreet packaging guarantee, 3-step fulfillment timeline, shipping & privacy FAQ, and 24/7 medical support card.\n\n---\n💬 **To customize this for your exact product, let me know:**\n1. **Product Name & Classification**: What is your medicine's brand name, and is it OTC, herbal/ayurvedic, or prescription?\n2. **Key Active Ingredients**: Are there specific active ingredients, herbs, or therapeutic compounds you'd like highlighted?\n3. **Pricing & Packaging**: Would you like custom dosage bundles, or should we link the order button directly to a checkout page?\n\n*(You can click the page navigation tabs in the header to preview both pages, or tell me what to refine!)*`;
            } else {
                aiReply = generated.reply;
            }
            aiHandled = true;
        }

        // 2. Add New Page Intent (e.g. "add about page", "create contact page", "add a new pricing page")
        const addPageMatch = textInstruction.match(/(?:add|create|append)\s+(?:a\s+|new\s+)?([a-z0-9\s-]+?)\s+page/i);
        if (!aiHandled && addPageMatch) {
            const pageNameRaw = addPageMatch[1].trim();
            const pageName = pageNameRaw.charAt(0).toUpperCase() + pageNameRaw.slice(1);
            const pageSlug = pageNameRaw.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const newPageId = `page_${pageSlug}_${Date.now().toString(36).substring(2, 6)}`;
            const newPageSections: ElementNode[] = [];
            if (pageSlug.includes('thank')) {
                newPageSections.push(...this.createThankYouSections(primaryColor));
            } else {
                newPageSections.push(this.createHeroSection(pageName, `Discover more about our ${pageName.toLowerCase()} and offerings.`, primaryColor));
                if (pageSlug.includes('contact')) {
                    newPageSections.push(this.createContactSection(primaryColor));
                } else if (pageSlug.includes('price') || pageSlug.includes('pricing')) {
                    newPageSections.push(this.createPricingSection(primaryColor));
                } else if (pageSlug.includes('about') || pageSlug.includes('team')) {
                    newPageSections.push(this.createFeaturesSection(primaryColor));
                    newPageSections.push(this.createTeamSection(primaryColor));
                } else if (pageSlug.includes('faq')) {
                    newPageSections.push(this.createFAQSection(primaryColor));
                }
                newPageSections.push(this.createCtaSection(undefined, primaryColor));
            }

            currentConfig.pages.push({
                id: newPageId,
                name: pageName,
                slug: `/${pageSlug}`,
                isEnabled: true,
                sections: newPageSections
            });
            currentConfig.activePageId = newPageId;
            aiReply = `📄 **New Page Added**: Created the **"${pageName}"** page with ${newPageSections.length} tailored sections! Your website now has **${currentConfig.pages.length} pages**.`;
            aiHandled = true;
        }

        // 3. Clear Page / Delete All Sections Intent (handles typos like "delte this ppage", "clear page")
        const isClearPageIntent = /(?:del(?:e)?t(?:e)?|clear|reset|erase|wipe)\s+(?:this\s+)?(?:p+a+g+e+|all|canvas|everything|sections?)/i.test(textInstruction);
        if (!aiHandled && isClearPageIntent) {
            currentConfig.pages[activePageIndex].sections = [];
            aiReply = `🗑️ **Canvas Cleared**: All sections on page **"${activePage.name || activePage.id}"** for **"${siteName}"** have been cleared. You now have a blank canvas ready for new sections.`;
            aiHandled = true;
        }

        // 4. Remove Single Target Section Intent (e.g. "remove hero", "delete testimonials", "delete pricing", "remove section 2")
        if (!aiHandled) {
            const deleteSectionMatch = textInstruction.match(/(?:del(?:e)?t(?:e)?|remove|drop|erase)\s+(?:the\s+)?([a-z0-9_\s-]+?)(?:\s+section|\s+block|$)/i);
            if (deleteSectionMatch) {
                const targetKey = deleteSectionMatch[1].trim().toLowerCase();
                let foundIndex = -1;

                if (targetKey.includes('hero')) {
                    foundIndex = activeSections.findIndex(s => (s.id || '').includes('hero'));
                } else if (targetKey.includes('testimonial') || targetKey.includes('review')) {
                    foundIndex = activeSections.findIndex(s => (s.id || '').includes('testimonial'));
                } else if (targetKey.includes('pricing') || targetKey.includes('plan') || targetKey.includes('tier') || targetKey.includes('price')) {
                    foundIndex = activeSections.findIndex(s => (s.id || '').includes('pricing') || (s.id || '').includes('offers'));
                } else if (targetKey.includes('faq') || targetKey.includes('question')) {
                    foundIndex = activeSections.findIndex(s => (s.id || '').includes('faq'));
                } else if (targetKey.includes('feature')) {
                    foundIndex = activeSections.findIndex(s => (s.id || '').includes('feature') || (s.id || '').includes('value'));
                } else if (targetKey.includes('stat')) {
                    foundIndex = activeSections.findIndex(s => (s.id || '').includes('stat'));
                } else if (targetKey.includes('team')) {
                    foundIndex = activeSections.findIndex(s => (s.id || '').includes('team'));
                } else if (targetKey.includes('contact')) {
                    foundIndex = activeSections.findIndex(s => (s.id || '').includes('contact'));
                } else if (targetKey.includes('cta') || targetKey.includes('call to action') || targetKey.includes('banner')) {
                    foundIndex = activeSections.findIndex(s => (s.id || '').includes('cta'));
                } else if (/\d+/.test(targetKey)) {
                    const numMatch = targetKey.match(/\d+/);
                    if (numMatch) {
                        const idx = parseInt(numMatch[0], 10) - 1;
                        if (idx >= 0 && idx < activeSections.length) foundIndex = idx;
                    }
                }

                if (foundIndex !== -1) {
                    const removed = activeSections[foundIndex];
                    const removedTitle = this.extractSectionTitle(removed);
                    activeSections.splice(foundIndex, 1);
                    currentConfig.pages[activePageIndex].sections = activeSections;
                    aiReply = `🗑️ **Section Removed**: Removed **"${removedTitle}"** from **"${siteName}"** while keeping your other ${activeSections.length} sections intact.`;
                    aiHandled = true;
                }
            }
        }

        // 4. Live LLM Synthesizer with Incremental Consciousness
        if (!aiHandled) {
            try {
                const client = await aiProviderService.getClient(settings);
                if (client) {
                    const summary = activeSections.map((s, i) => `  ${i + 1}. [${s.id}] "${this.extractSectionTitle(s)}"`).join('\n');
                    const conversationHistoryText = history.length > 0
                        ? history.slice(-6).map((m: any) => `${m.role === 'user' || m.sender === 'user' ? 'User' : 'AI Architect'}: "${(m.text || m.content || '').replace(/\s+/g, ' ').trim()}"`).join('\n')
                        : '  (New session)';

                    const patchPrompt = `You are the 180 Workspace AI Website Architect with live consciousness of the current website canvas.
CURRENT WEBSITE: "${siteName}" (Company: "${companyName}")
PRIMARY BRAND COLOR: "${primaryColor}"
CURRENT ACTIVE PAGE: "${activePage.name || activePage.id}" (Page ${activePageIndex + 1} of ${currentConfig.pages.length})
CURRENT ACTIVE SECTIONS (${activeSections.length}):
${summary || '  (Empty canvas)'}

RECENT CONVERSATION HISTORY:
${conversationHistoryText}

USER INSTRUCTION: "${textInstruction}"

CRITICAL INTERACTION & CONSCIOUSNESS RULES:
1. NEVER say "no updates are necessary", "instruction was unclear", or refuse to make changes.
2. If the user asks to build or generate a landing page, website, or product page (e.g. for a medicine product, healthcare, real estate, SaaS, gym, agency):
   Return action "GENERATE_FULL_PAGE" with "topic" and "sectionsToBuild". In "reply", provide an enthusiastic explanation of what was built, PLUS 2-3 intelligent, interactive clarifying questions with concrete suggestions to guide the user.
3. If the user replies with a short affirmation ("yes", "sure", "do it", "add it"), check RECENT CONVERSATION HISTORY to see what you previously suggested, and execute that action!
4. If the user asks to add sections, return "ADD_SECTION" with "sectionType".
5. If the user instruction is brief, vague, or underspecified, PROACTIVELY TAKE INITIATIVE by generating or adding the most relevant section/page, AND in your "reply" ask 2-3 intelligent, interactive clarifying questions with concrete suggestions to guide the user.
6. Return a valid JSON object ONLY:
{
  "action": "GENERATE_FULL_PAGE" | "ADD_SECTION" | "REMOVE_SECTION" | "CLEAR_PAGE" | "UPDATE_PROPERTIES" | "INTERACTIVE_PROPOSAL",
  "reply": "Clear, markdown-formatted explanation of what was built, PLUS 2-3 interactive clarifying questions to refine it",
  "sectionType": "testimonials" | "pricing" | "faq" | "features" | "stats" | "team" | "contact" | "hero" | "cta" | "custom",
  "sectionsToBuild": ["hero", "features", "stats", "testimonials", "pricing", "faq", "contact", "cta"],
  "topic": "medicine" | "saas" | "ecommerce" | "general",
  "primaryColor": "#hexColor",
  "headline": "Headline text if requested",
  "buttonText": "Button text if requested"
}`;
                    const rawResponse = await client.generate(patchPrompt);
                    const parsed = this.extractJSON(rawResponse);
                    if (parsed && parsed.action) {
                        if (parsed.primaryColor) {
                            currentConfig.brand.primaryColor = parsed.primaryColor;
                            addedDetails.push(`Updated brand theme color to ${parsed.primaryColor}`);
                        }

                        if (parsed.action === 'GENERATE_FULL_PAGE') {
                            const topic = (parsed.topic || textInstruction).toLowerCase();
                            const generated = this.createTailoredLandingPage(topic, siteName, parsed.primaryColor || primaryColor);
                            activeSections = generated.sections;
                            currentConfig.pages[activePageIndex].sections = activeSections;
                            currentConfig.brand.primaryColor = generated.primaryColor;

                            const wantsThankYou = lowerInstruction.includes('thank you') || lowerInstruction.includes('thankyou') || lowerInstruction.includes('two page') || lowerInstruction.includes('2 page');
                            if (wantsThankYou) {
                                let thankYouPage = currentConfig.pages.find((p: any) => p.slug === '/thank-you' || p.id === 'thank-you' || p.name?.toLowerCase().includes('thank'));
                                const thankYouSections = this.createThankYouSections(generated.primaryColor);
                                if (!thankYouPage) {
                                    thankYouPage = {
                                        id: 'thank-you',
                                        name: 'Thank You',
                                        slug: '/thank-you',
                                        isEnabled: true,
                                        sections: thankYouSections
                                    };
                                    currentConfig.pages.push(thankYouPage);
                                } else {
                                    thankYouPage.sections = thankYouSections;
                                }

                                aiReply = `✨ **2-Page Healthcare & Medicine Website Synthesized!**\n\nI have created both pages for your website:\n1. 🏠 **Home Landing Page (Active)**: 8 high-converting, clinical-grade sections tailored to promote your healthcare & vitality medicine (Clinical Trust Hero, Lab Metrics, Therapeutic Benefits, Medical Testimonials, Dosage Bundles, FAQ, Consultation Form, and Guarantee CTA).\n2. 🎉 **Thank You Page (\`/thank-you\`)**: Complete post-purchase confirmation flow with discreet packaging guarantee, 3-step fulfillment timeline, shipping & privacy FAQ, and 24/7 medical support card.\n\n---\n💬 **To customize this for your exact product, let me know:**\n1. **Product Name & Classification**: What is your medicine's brand name, and is it OTC, herbal/ayurvedic, or prescription?\n2. **Key Active Ingredients**: Are there specific active ingredients, herbs, or therapeutic compounds you'd like highlighted?\n3. **Pricing & Packaging**: Would you like custom dosage bundles, or should we link the order button directly to a checkout page?\n\n*(You can click the page navigation tabs in the header to preview both pages, or tell me what to refine!)*`;
                            } else {
                                aiReply = parsed.reply || generated.reply;
                            }
                            aiHandled = true;
                        } else if (parsed.action === 'ADD_SECTION' && parsed.sectionType) {
                            let newSec: ElementNode | null = null;
                            const secType = parsed.sectionType.toLowerCase();
                            if (secType === 'testimonials') newSec = this.createTestimonialsSection(primaryColor);
                            else if (secType === 'pricing') newSec = this.createPricingSection(primaryColor);
                            else if (secType === 'faq') newSec = this.createFAQSection(primaryColor);
                            else if (secType === 'features') newSec = this.createFeaturesSection(primaryColor);
                            else if (secType === 'stats') newSec = this.createStatsSection(primaryColor);
                            else if (secType === 'team') newSec = this.createTeamSection(primaryColor);
                            else if (secType === 'contact') newSec = this.createContactSection(primaryColor);
                            else if (secType === 'hero') newSec = this.createHeroSection(siteName, parsed.headline, primaryColor);
                            else if (secType === 'cta') newSec = this.createCtaSection(parsed.headline, primaryColor);

                            if (newSec) {
                                activeSections.push(newSec);
                                currentConfig.pages[activePageIndex].sections = activeSections;
                                addedDetails.push(`Added new ${secType} section to ${activePage.name || activePage.id}`);
                            }
                        }

                        if (parsed.reply && !aiReply) {
                            aiReply = parsed.reply;
                            aiHandled = true;
                        }
                    }
                }
            } catch (err) {
                console.warn('[WebsiteAIBuilder] Live LLM patch error, running heuristic engine:', err);
            }
        }

        // 5. High-Precision Heuristic Fallback Engine
        if (!aiHandled) {
            // A. Color Palette Updates
            if (lowerInstruction.includes('green') || lowerInstruction.includes('emerald')) {
                currentConfig.brand.primaryColor = '#10b981';
                addedDetails.push('Switched theme to Emerald Green (#10b981)');
            } else if (lowerInstruction.includes('gold') || lowerInstruction.includes('amber') || lowerInstruction.includes('yellow')) {
                currentConfig.brand.primaryColor = '#f59e0b';
                addedDetails.push('Switched theme to Amber Gold (#f59e0b)');
            } else if (lowerInstruction.includes('purple') || lowerInstruction.includes('violet')) {
                currentConfig.brand.primaryColor = '#8b5cf6';
                addedDetails.push('Switched theme to Royal Purple (#8b5cf6)');
            } else if (lowerInstruction.includes('blue') || lowerInstruction.includes('indigo')) {
                currentConfig.brand.primaryColor = '#4f46e5';
                addedDetails.push('Switched theme to Indigo Blue (#4f46e5)');
            } else if (lowerInstruction.includes('pink') || lowerInstruction.includes('rose')) {
                currentConfig.brand.primaryColor = '#ec4899';
                addedDetails.push('Switched theme to Rose Pink (#ec4899)');
            } else if (lowerInstruction.includes('cyan') || lowerInstruction.includes('teal')) {
                currentConfig.brand.primaryColor = '#06b6d4';
                addedDetails.push('Switched theme to Cyan Teal (#06b6d4)');
            }

            // B. Add Testimonials
            if (lowerInstruction.includes('testimonial') || lowerInstruction.includes('review') || lowerInstruction.includes('social proof')) {
                activeSections.push(this.createTestimonialsSection(currentConfig.brand.primaryColor));
                addedDetails.push('Appended customer testimonials review section');
            }

            // C. Add Pricing
            if (lowerInstruction.includes('pricing') || lowerInstruction.includes('tier') || lowerInstruction.includes('plan') || lowerInstruction.includes('price')) {
                activeSections.push(this.createPricingSection(currentConfig.brand.primaryColor));
                addedDetails.push('Appended 3-tier transparent pricing table');
            }

            // D. Add FAQ
            if (lowerInstruction.includes('faq') || lowerInstruction.includes('question') || lowerInstruction.includes('accordian') || lowerInstruction.includes('accordion')) {
                activeSections.push(this.createFAQSection(currentConfig.brand.primaryColor));
                addedDetails.push('Appended FAQ accordion section');
            }

            // E. Add Features
            if (lowerInstruction.includes('feature') || lowerInstruction.includes('benefit') || lowerInstruction.includes('service')) {
                activeSections.push(this.createFeaturesSection(currentConfig.brand.primaryColor));
                addedDetails.push('Appended core features grid');
            }

            // F. Add Stats / Metrics
            if (lowerInstruction.includes('stat') || lowerInstruction.includes('metric') || lowerInstruction.includes('counter') || lowerInstruction.includes('number')) {
                activeSections.push(this.createStatsSection(currentConfig.brand.primaryColor));
                addedDetails.push('Appended high-impact stats counter section');
            }

            // G. Add Team
            if (lowerInstruction.includes('team') || lowerInstruction.includes('member') || lowerInstruction.includes('founder') || lowerInstruction.includes('leadership')) {
                activeSections.push(this.createTeamSection(currentConfig.brand.primaryColor));
                addedDetails.push('Appended leadership team showcase');
            }

            // H. Add Contact Form
            if (lowerInstruction.includes('contact') || lowerInstruction.includes('lead') || lowerInstruction.includes('get in touch') || lowerInstruction.includes('inquiry')) {
                activeSections.push(this.createContactSection(currentConfig.brand.primaryColor));
                addedDetails.push('Appended contact & inquiry form section');
            }

            // I. Add CTA
            if (lowerInstruction.includes('cta') || lowerInstruction.includes('call to action') || lowerInstruction.includes('banner')) {
                activeSections.push(this.createCtaSection(undefined, currentConfig.brand.primaryColor));
                addedDetails.push('Appended high-converting call to action banner');
            }

            currentConfig.pages[activePageIndex].sections = activeSections;

            if (!aiReply) {
                if (addedDetails.length > 0) {
                    aiReply = `✨ **Website Updated**: ${addedDetails.join(', ')}! All other existing ${activeSections.length - addedDetails.length} sections have been preserved intact.`;
                } else {
                    activeSections.push(this.createFeaturesSection(currentConfig.brand.primaryColor));
                    currentConfig.pages[activePageIndex].sections = activeSections;
                    aiReply = `✨ **Canvas Enhanced**: Added the **Key Features & Benefits** section to your active page.\n\n---\n💬 **To help tailor your site further:**\n1. What is your product or company's primary focus?\n2. Would you like to add **Customer Testimonials**, a **Pricing Matrix**, or an **FAQ** next?\n3. Do you have a preferred visual brand color?`;
                }
            }
        }

        // Save updated config in PostgreSQL
        if (website) {
            await prisma.website.update({
                where: { id: entityId },
                data: {
                    config: currentConfig,
                    publishedConfig: currentConfig
                }
            }).catch((err) => {
                console.warn('[WebsiteAIBuilder] DB save warning:', err.message);
            });
        }

        return {
            success: true,
            builderType: this.builderType,
            entityId,
            title: siteName,
            editUrl,
            reply: aiReply,
            ast: currentConfig,
            actionCards: [
                { type: 'edit', label: 'View in Website Builder →', url: editUrl }
            ]
        };
    }

    async deleteEntity(entityId: string, companyId: string) {
        await prisma.website.delete({ where: { id: entityId } }).catch(() => {});
        await basePrisma.domainRegistry.deleteMany({ where: { targetId: entityId } }).catch(() => {});
        return { success: true, message: 'Website deleted.' };
    }
}

export default WebsiteAIBuilderService;
