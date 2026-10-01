/**
 * Default v2 website config for a newly created site.
 *
 * Sections are real element trees built only from the renderer's element types
 * (section | box | row | column | text | media | button | line | code | floating), so a new site renders
 * immediately in the editor and on the live site. The copy uses only the website name and honest,
 * editable prompts: no invented contact details, metrics or testimonials.
 */

export type WebsiteElementType = 'section' | 'box' | 'row' | 'column' | 'text' | 'media' | 'button' | 'line' | 'code' | 'floating';

export interface WebsiteElementNode {
    id: string;
    type: WebsiteElementType;
    data: Record<string, any>;
    style: Record<string, any>;
    responsive?: { tablet?: Record<string, any>; mobile?: Record<string, any> };
    hiddenOn?: { desktop?: boolean; tablet?: boolean; mobile?: boolean };
    children?: WebsiteElementNode[];
    name?: string;
}

let seq = 0;
const genId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const node = (
    type: WebsiteElementType,
    data: Record<string, any>,
    style: Record<string, any>,
    children?: WebsiteElementNode[],
    extra: Partial<WebsiteElementNode> = {}
): WebsiteElementNode => ({ id: genId(type), type, data, style, ...(children ? { children } : {}), ...extra });

const text = (content: string, style: Record<string, any>, extra: Partial<WebsiteElementNode> = {}) =>
    node('text', { content }, { boxSizing: 'border-box', ...style }, undefined, extra);

const box = (children: WebsiteElementNode[], style: Record<string, any> = {}) =>
    node('box', {}, { display: 'flex', flexDirection: 'column', boxSizing: 'border-box', maxWidth: '100%', ...style }, children);

const section = (name: string, children: WebsiteElementNode[], style: Record<string, any> = {}) =>
    node('section', {}, { paddingY: 6, ...style }, children, { name });

export function buildDefaultWebsiteConfig(rawName: string, primaryColor = '#4f46e5') {
    const name = (rawName || '').trim() || 'My Website';

    const hero = section('Hero', [
        box([
            text(name, {
                tagName: 'h1',
                fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                fontWeight: '800',
                lineHeight: '1.15',
                textAlign: 'center',
                marginBottom: '1rem',
            }, { responsive: { mobile: { fontSize: '2.25rem' } } }),
            text(`Welcome to ${name}.`, {
                tagName: 'p',
                fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                textAlign: 'center',
                opacity: 0.8,
            }),
        ], { alignItems: 'center', width: '800px', margin: '0 auto' }),
    ]);

    const about = section('About', [
        box([
            text(`About ${name}`, {
                tagName: 'h2',
                fontSize: 'clamp(2rem, 4vw, 2.75rem)',
                fontWeight: '800',
                textAlign: 'center',
                marginBottom: '1rem',
            }, { responsive: { mobile: { fontSize: '1.75rem' } } }),
            text('Tell visitors who you are and what you do.', {
                tagName: 'p',
                fontSize: '1.125rem',
                textAlign: 'center',
                opacity: 0.75,
            }),
        ], { alignItems: 'center', width: '800px', margin: '0 auto' }),
    ], { backgroundColor: 'rgba(0,0,0,0.03)' });

    const contact = section('Contact', [
        box([
            text('Get in touch', {
                tagName: 'h2',
                fontSize: 'clamp(2rem, 4vw, 2.75rem)',
                fontWeight: '800',
                textAlign: 'center',
                marginBottom: '1rem',
            }, { responsive: { mobile: { fontSize: '1.75rem' } } }),
            text('Add your email, phone number or a contact form here.', {
                tagName: 'p',
                fontSize: '1.125rem',
                textAlign: 'center',
                opacity: 0.75,
            }),
        ], { alignItems: 'center', width: '800px', margin: '0 auto' }),
    ]);

    return {
        version: 2,
        brand: {
            primaryColor,
            secondaryColor: '#ffffff',
            textColor: '#111827',
            headingFont: 'Inter',
            bodyFont: 'Inter',
            fontFamily: 'Inter',
            headerFooterTheme: 'light',
            bgType: 'color',
            bgValue: '#ffffff',
        },
        header: {
            logo: '',
            showNavigation: true,
            navigation: [] as Array<{ label: string; link: string }>,
        },
        footer: {
            copyright: `© ${new Date().getFullYear()} ${name}. All rights reserved.`,
            links: [] as Array<{ label: string; link: string }>,
        },
        pages: [
            {
                id: 'home',
                name: 'Home',
                slug: '/',
                isEnabled: true,
                sections: [hero, about, contact],
            },
        ],
    };
}
