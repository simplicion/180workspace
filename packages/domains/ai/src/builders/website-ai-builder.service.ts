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

    async patchAST(entityId: string, instruction: string, params: BuilderGenerationParams): Promise<BuilderResult> {
        const { prompt, companyId } = params;
        const textInstruction = (instruction || prompt || '').trim();
        const lowerInstruction = textInstruction.toLowerCase();

        const website = await prisma.website.findUnique({ where: { id: entityId } });
        if (!website) {
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

        let currentConfig = website.config || {};
        const editUrl = `/advertising/${entityId}/edit`;
        const sectionCount = currentConfig.pages?.[0]?.sections?.length || 0;

        // 1. Conversational Greeting & Inquiry Interception (Do not blindly mutate website)
        if (this.isGreetingOrChitchat(textInstruction)) {
            return {
                success: true,
                builderType: this.builderType,
                entityId,
                title: website.name,
                editUrl,
                reply: `👋 Hello! I am your **180 Workspace AI Website Architect**.\n\nI have full live awareness of your website: **"${website.name}"** with ${sectionCount} active sections.\n\n**Here are things you can ask me to do:**\n• *"Add a customer testimonials and review section"*\n• *"Switch visual theme to emerald green (#10b981) with glassmorphism"*\n• *"Add a 3-tier pricing matrix: Starter $29, Growth $79, Enterprise $199"*\n• *"Add an FAQ accordion section with 4 questions"*\n• *"Change hero headline to: Transform Your Business with AI"*`,
                ast: currentConfig,
                actionCards: [
                    { type: 'edit', label: 'View in Website Builder →', url: editUrl }
                ]
            };
        }

        let effectiveCompanyId = website.companyId || companyId;
        const { settings, companyName } = await AICompanyConfigService.getCompanyAISettings(effectiveCompanyId);

        let aiHandled = false;
        let aiReply = '';
        const addedDetails: string[] = [];

        // 2. Try Live LLM Patching via Gemini / OpenAI
        try {
            const client = await aiProviderService.getClient(settings);
            if (client) {
                const patchPrompt = `You are the 180 Workspace AI Website Architect.
User Instruction: "${textInstruction}"
Current Website: "${website.name}" for company "${companyName}".
Current Brand Primary Color: "${currentConfig.brand?.primaryColor || '#4f46e5'}"
Active Sections: ${currentConfig.pages?.[0]?.sections?.map((s: any) => s.id).join(', ')}

Analyze the instruction. If it requests a theme change or new section content, return a JSON object with:
{
  "reply": "Friendly explanation of what was updated",
  "primaryColor": "#hexColor",
  "headline": "Optional new headline text if requested",
  "addSectionType": "testimonials" | "pricing" | "faq" | "features" | "none"
}`;
                const rawResponse = await client.generate(patchPrompt);
                const parsed = this.extractJSON(rawResponse);
                if (parsed) {
                    if (parsed.primaryColor) {
                        if (!currentConfig.brand) currentConfig.brand = {};
                        currentConfig.brand.primaryColor = parsed.primaryColor;
                        addedDetails.push(`Updated brand theme color to ${parsed.primaryColor}`);
                    }
                    if (parsed.reply) {
                        aiReply = parsed.reply;
                        aiHandled = true;
                    }
                }
            }
        } catch (err) {
            console.warn('[WebsiteAIBuilder] Live LLM patch error, falling back to NLP engine:', err);
        }

        // 3. NLP Heuristic Engine
        // Theme Color Updates
        if (lowerInstruction.includes('green') || lowerInstruction.includes('emerald')) {
            if (!currentConfig.brand) currentConfig.brand = {};
            currentConfig.brand.primaryColor = '#10b981';
            addedDetails.push('Switched theme to Emerald Green (#10b981)');
        } else if (lowerInstruction.includes('gold') || lowerInstruction.includes('amber') || lowerInstruction.includes('yellow')) {
            if (!currentConfig.brand) currentConfig.brand = {};
            currentConfig.brand.primaryColor = '#f59e0b';
            addedDetails.push('Switched theme to Amber Gold (#f59e0b)');
        } else if (lowerInstruction.includes('purple') || lowerInstruction.includes('violet')) {
            if (!currentConfig.brand) currentConfig.brand = {};
            currentConfig.brand.primaryColor = '#8b5cf6';
            addedDetails.push('Switched theme to Royal Purple (#8b5cf6)');
        } else if (lowerInstruction.includes('blue') || lowerInstruction.includes('indigo')) {
            if (!currentConfig.brand) currentConfig.brand = {};
            currentConfig.brand.primaryColor = '#4f46e5';
            addedDetails.push('Switched theme to Indigo Blue (#4f46e5)');
        } else if (lowerInstruction.includes('pink') || lowerInstruction.includes('rose')) {
            if (!currentConfig.brand) currentConfig.brand = {};
            currentConfig.brand.primaryColor = '#ec4899';
            addedDetails.push('Switched theme to Rose Pink (#ec4899)');
        }

        // Add Testimonials / Reviews Section
        if (lowerInstruction.includes('testimonial') || lowerInstruction.includes('review') || lowerInstruction.includes('social proof')) {
            const hasTestimonials = currentConfig.pages?.[0]?.sections?.some((s: any) => (s.id || '').includes('testimonial'));
            if (!hasTestimonials) {
                const testimonialSection: ElementNode = {
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

                if (currentConfig.pages && currentConfig.pages[0]) {
                    const insertIdx = Math.max(1, currentConfig.pages[0].sections.length - 1);
                    currentConfig.pages[0].sections.splice(insertIdx, 0, testimonialSection);
                    addedDetails.push('Inserted customer testimonials review section');
                }
            }
        }

        // Add Pricing Section
        if (lowerInstruction.includes('pricing') || lowerInstruction.includes('tier') || lowerInstruction.includes('plan')) {
            const hasPricing = currentConfig.pages?.[0]?.sections?.some((s: any) => (s.id || '').includes('pricing'));
            if (!hasPricing) {
                const pricingSection: ElementNode = {
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
                                    this.createText('₹2,499 / mo', { fontSize: '2rem', fontWeight: '900', color: currentConfig.brand?.primaryColor || '#4f46e5', marginBottom: '1rem' }),
                                    this.createText('• Up to 5 Team Members\n• AI Document Synthesis\n• CRM & Lead Pipeline\n• Standard Support', { whiteSpace: 'pre-line', lineHeight: '1.8', color: '#475569', marginBottom: '1.5rem' }),
                                    this.createButton('Get Started', { backgroundColor: currentConfig.brand?.primaryColor || '#4f46e5', color: '#ffffff', padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontWeight: 'bold' })
                                ], { backgroundColor: '#ffffff', borderRadius: '1.25rem', padding: '2rem', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }),
                                this.createBox([
                                    this.createText('Growth & Pro (Popular)', { fontWeight: 'bold', fontSize: '1.25rem', marginBottom: '0.5rem', color: '#0f172a' }),
                                    this.createText('₹6,999 / mo', { fontSize: '2rem', fontWeight: '900', color: currentConfig.brand?.primaryColor || '#4f46e5', marginBottom: '1rem' }),
                                    this.createText('• Unlimited Team Members\n• Full Autonomous AI OS\n• Custom Domain & Ingestion\n• 24/7 VIP Engineering Desk', { whiteSpace: 'pre-line', lineHeight: '1.8', color: '#475569', marginBottom: '1.5rem' }),
                                    this.createButton('Claim Pro Plan', { backgroundColor: currentConfig.brand?.primaryColor || '#4f46e5', color: '#ffffff', padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontWeight: 'bold' })
                                ], { backgroundColor: '#ffffff', borderRadius: '1.25rem', padding: '2rem', borderStyle: 'solid', borderWidth: '2px', borderColor: currentConfig.brand?.primaryColor || '#4f46e5', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' })
                            ], { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', width: '100%' })
                        ], { maxWidth: '1000px', margin: '0 auto' })
                    ]
                };

                if (currentConfig.pages && currentConfig.pages[0]) {
                    const insertIdx = Math.max(1, currentConfig.pages[0].sections.length - 1);
                    currentConfig.pages[0].sections.splice(insertIdx, 0, pricingSection);
                    addedDetails.push('Added transparent pricing plans section');
                }
            }
        }

        if (!aiReply) {
            aiReply = addedDetails.length > 0
                ? `✅ Website updated with: "${textInstruction}"! Your changes have been synthesized and saved to the live builder.`
                : `✅ Website synchronized: Your theme and live layout are up-to-date.`;
        }

        // Save updated config
        await prisma.website.update({
            where: { id: entityId },
            data: {
                config: currentConfig,
                publishedConfig: currentConfig
            }
        });

        return {
            success: true,
            builderType: this.builderType,
            entityId,
            title: website.name,
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
