import { ElementNode, ElementType } from './types';

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const createBox = (children: ElementNode[] = [], style: any = {}): ElementNode => ({
    id: generateId('box'),
    type: 'box',
    data: {},
    style: {
        display: 'flex',
        flexDirection: 'column',
        borderWidth: '0px',
        borderColor: '#000000',
        borderStyle: 'solid',
        borderRadius: '0px',
        ...style
    },
    children
});

export const createRow = (children: ElementNode[] = [], style: any = {}): ElementNode => ({
    id: generateId('row'),
    type: 'row',
    data: {},
    style: {
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        ...style
    },
    children
});

export const createColumn = (children: ElementNode[] = [], style: any = {}): ElementNode => ({
    id: generateId('column'),
    type: 'column',
    data: {},
    style: {
        display: 'flex',
        flexDirection: 'column',
        ...style
    },
    children
});

export const createText = (content: string, style: any = {}): ElementNode => ({
    id: generateId('text'),
    type: 'text',
    data: { content },
    style
});

export const createMedia = (mediaUrl: string, style: any = {}): ElementNode => ({
    id: generateId('media'),
    type: 'media',
    data: { imageUrl: mediaUrl }, // imageUrl holds both for simplicity, or we can use generic mediaUrl
    style
});

export const createButton = (content: string, style: any = {}): ElementNode => ({
    id: generateId('button'),
    type: 'button',
    data: { content, link: '#' },
    style: { padding: '0.75em 1.5em', ...style }
});

export const createLine = (style: any = {}): ElementNode => ({
    id: generateId('line'),
    type: 'line',
    data: {},
    style: { direction: 'horizontal', thickness: '2px', backgroundColor: '#e5e7eb', ...style }
});

export const createCode = (html: string = '', style: any = {}): ElementNode => ({
    id: generateId('code'),
    type: 'code',
    data: { html },
    style
});

export const createFloating = (children: ElementNode[] = [], data: any = {}, style: any = {}): ElementNode => ({
    id: generateId('floating'),
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
    children
});

export function getDefaultElementForType(type: ElementType | string, currencySymbol: string): ElementNode {
    const id = generateId('sec');

    // Pre-built sections carry `data.preset` so the editor can recognise them (e.g. one video section per page).
    switch (type) {
        case 'floating':
            return createFloating();
        case 'hero':
            return {
                id,
                type: 'section',
                data: { preset: 'hero' },
                style: { paddingY: 6, backgroundColor: 'transparent' },
                children: [
                    createBox([
                        createText('Catchy Headline', {
                            tagName: 'h1',
                            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                            fontWeight: '900',
                            lineHeight: '1.2',
                            marginBottom: '1rem'
                        }),
                        createText('Supporting text for your hero section.', {
                            tagName: 'p',
                            fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                            opacity: 0.8,
                            marginBottom: '2rem'
                        }),
                        createButton('Get Started', { backgroundColor: '#4f46e5', color: 'white', borderRadius: '0.5rem' }),
                        createBox([
                            createMedia('', { width: '100%', height: 'auto', borderRadius: '1.5rem', aspectRatio: '16/9' })
                        ], { padding: 0, flex: 1, minWidth: '300px', width: '100%' })
                    ], { flexDirection: 'row', alignItems: 'center', gap: 'clamp(2rem, 5vw, 4rem)', padding: '0', flexWrap: 'wrap' })
                ]
            };

        case 'about':
            return {
                id,
                type: 'section',
                data: { preset: 'about' },
                style: { paddingY: 6 },
                children: [
                    createBox([
                        createText('About Us', { tagName: 'h2', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '900', textAlign: 'center', marginBottom: '1rem' }),
                        createText('Our story and journey started here.', { tagName: 'p', fontSize: 'clamp(1rem, 2vw, 1.25rem)', textAlign: 'center', opacity: 0.7 })
                    ], { alignItems: 'center', maxWidth: '100%', width: '800px', margin: '0 auto' })
                ]
            };

        case 'grid':
            return {
                id,
                type: 'section',
                data: { preset: 'grid' },
                style: { paddingY: 6, backgroundColor: 'rgba(0,0,0,0.05)' },
                children: [
                    createBox([
                        createText('Our Offerings', { tagName: 'h2', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '900', textAlign: 'center', marginBottom: '1rem' }),
                        createText('What we offer.', { tagName: 'p', fontSize: 'clamp(1rem, 2vw, 1.25rem)', textAlign: 'center', opacity: 0.7, marginBottom: '3rem' }),
                        createBox([
                            createBox([
                                createMedia('', { width: '100%', height: 'auto', aspectRatio: '4/3', borderRadius: '0.5rem' }),
                                createText('Item 1', { fontWeight: 'bold', fontSize: '1.25rem' }),
                                createText('Description of item 1', { opacity: 0.7 }),
                                createText(`${currencySymbol}99.00`, { fontWeight: 'bold' }),
                                createButton('Buy Now')
                            ], { backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', gap: '0.5rem' }),
                            createBox([
                                createMedia('', { width: '100%', height: 'auto', aspectRatio: '4/3', borderRadius: '0.5rem' }),
                                createText('Item 2', { fontWeight: 'bold', fontSize: '1.25rem' }),
                                createText('Description of item 2', { opacity: 0.7 }),
                                createText(`${currencySymbol}149.00`, { fontWeight: 'bold' }),
                                createButton('Buy Now')
                            ], { backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', gap: '0.5rem' }),
                        ], { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'clamp(1rem, 3vw, 2rem)', width: '100%' })
                    ], { padding: 0, gap: '0' })
                ]
            };

        case 'portfolio':
            return {
                id,
                type: 'section',
                data: { preset: 'portfolio' },
                style: { paddingY: 6 },
                children: [
                    createBox([
                        createText('Our Portfolio', { tagName: 'h2', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '900', textAlign: 'center', marginBottom: '3rem' }),
                        createBox([
                            createBox([
                                createMedia('', { width: '100%', height: 'auto', aspectRatio: '4/3', borderRadius: '0.5rem' }),
                                createText('Project 1', { fontWeight: 'bold', fontSize: '1.5rem' }),
                                createText('Project Description', { opacity: 0.7 })
                            ], { flex: '1 1 350px', maxWidth: '500px', width: '100%', gap: '0.5rem' }),
                            createBox([
                                createMedia('', { width: '100%', height: 'auto', aspectRatio: '4/3', borderRadius: '0.5rem' }),
                                createText('Project 2', { fontWeight: 'bold', fontSize: '1.5rem' }),
                                createText('Project Description', { opacity: 0.7 })
                            ], { flex: '1 1 350px', maxWidth: '500px', width: '100%', gap: '0.5rem' })
                        ], { flexDirection: 'row', flexWrap: 'wrap', gap: 'clamp(1.5rem, 4vw, 3rem)', justifyContent: 'center' })
                    ], { padding: 0, gap: '0' })
                ]
            };

        case 'row':
            return createRow();
        case 'column':
            return createColumn();
        case 'box':
            return createBox();
        case 'text':
            return createText('Custom text block here.');
        case 'media':
            return createMedia('');
        case 'button':
            return createButton('Click Me');
        case 'line':
            return createLine();
        case 'code':
            return createCode();

        case 'product':
            return createBox([
                createMedia('', { width: '100%', height: 'auto', aspectRatio: '4/3', borderRadius: '0.5rem' }),
                createText('Product/Service Name', { fontWeight: 'bold', fontSize: '1.25rem' }),
                createText('Description of the offering...', { opacity: 0.7 }),
                createText(`${currencySymbol}99.00`, { fontWeight: 'bold' }),
                createButton('Buy Now')
            ], { flex: '1 1 250px', backgroundColor: '#ffffff', borderRadius: '1rem', padding: '1.5rem', gap: '0.5rem', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e5e7eb' });

        case 'portfolio-element':
            return createBox([
                createMedia('', { width: '100%', height: 'auto', aspectRatio: '4/3', borderRadius: '0.5rem' }),
                createText('Project Name', { fontWeight: 'bold', fontSize: '1.5rem' }),
                createText('Project Description', { opacity: 0.7 })
            ], { flex: '1 1 350px', maxWidth: '500px', width: '100%', gap: '0.5rem', backgroundColor: '#ffffff', borderRadius: '1rem', padding: '1rem', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e5e7eb' });


        case 'faq':
            return {
                id,
                type: 'section',
                data: { preset: 'faq' },
                style: { paddingY: 6 },
                children: [
                    createBox([
                        createText('Frequently Asked Questions', { tagName: 'h2', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '900', textAlign: 'center', marginBottom: '2rem' }),
                        ...faqItems([
                            { question: 'What do you offer?', answer: 'Describe your main products or services here.' },
                            { question: 'How do I get started?', answer: 'Explain the first step a new customer should take.' },
                        ])
                    ], { maxWidth: '100%', width: '800px', margin: '0 auto', gap: '1rem' })
                ]
            };

        case 'contact':
            return {
                id,
                type: 'section',
                data: { preset: 'contact' },
                style: { paddingY: 6 },
                children: [
                    createBox([
                        createText('Get in Touch', { tagName: 'h2', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '900', textAlign: 'center', marginBottom: '1rem' }),
                        createText('Tell visitors how they can reach you.', { tagName: 'p', fontSize: 'clamp(1rem, 2vw, 1.25rem)', textAlign: 'center', opacity: 0.7, marginBottom: '2rem' }),
                        createButton('Contact Us', { backgroundColor: '#4f46e5', color: 'white', borderRadius: '0.5rem' })
                    ], { alignItems: 'center', maxWidth: '100%', width: '800px', margin: '0 auto' })
                ]
            };

        case 'video':
            return {
                id,
                type: 'section',
                data: { preset: 'video' },
                style: { paddingY: 6 },
                children: [
                    createBox([
                        createText('Watch Our Story', { tagName: 'h2', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '900', textAlign: 'center', marginBottom: '2rem' }),
                        { ...createMedia('', { width: '100%', height: 'auto', borderRadius: '1rem', aspectRatio: '16/9' }), data: { imageUrl: '', videoUrl: '' } }
                    ], { alignItems: 'center', maxWidth: '100%', width: '960px', margin: '0 auto' })
                ]
            };

        default:
            return {
                id,
                type: 'section',
                data: {},
                style: { paddingY: 6 },
                children: [createBox()]
            };
    }
}

function faqItems(items: { question?: string; answer?: string }[]): ElementNode[] {
    return items.map((item) => createBox([
        createText(item.question || 'Question', { fontWeight: 'bold', fontSize: '1.125rem' }),
        createText(item.answer || 'Answer', { opacity: 0.75 })
    ], { padding: '1.25rem', gap: '0.5rem', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e5e7eb', borderRadius: '0.75rem' }));
}

/** Section types the editor knows how to render. Anything else at the root is a legacy (v1) section. */
const RENDERABLE_ROOT_TYPES = new Set(['box', 'text', 'media', 'button', 'line', 'section', 'row', 'column', 'image', 'code', 'floating']);

const asText = (v: any): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined);

/** Replace the content of the n-th text node (depth-first) in a tree. */
function setNthText(node: ElementNode, n: number, content: string | undefined): void {
    if (!content) return;
    let i = 0;
    const walk = (x: ElementNode): boolean => {
        if (x.type === 'text') {
            if (i === n) { x.data = { ...x.data, content }; return true; }
            i++;
        }
        return !!x.children?.some(walk);
    };
    walk(node);
}

function firstOfType(node: ElementNode, type: string): ElementNode | undefined {
    if (node.type === type) return node;
    for (const c of node.children || []) {
        const f = firstOfType(c, type);
        if (f) return f;
    }
    return undefined;
}

/**
 * Convert a legacy v1 section (`{ type: 'hero' | 'services' | 'about' | 'faq' | 'contact' | ..., data }`) into a
 * renderable element tree, keeping whatever copy the legacy section carried. Renderable nodes pass through untouched.
 * Contact details (email/phone) are NOT injected as text; they belong in the brand/footer settings.
 */
export function migrateLegacySection(section: any, currencySymbol: string): ElementNode {
    if (!section || RENDERABLE_ROOT_TYPES.has(section.type)) return section;
    const d = section.data || {};
    const legacyType = String(section.type || '');
    const preset = legacyType === 'services' || legacyType === 'benefits' ? 'grid' : legacyType;
    const node = getDefaultElementForType(preset, currencySymbol);
    node.id = section.id || node.id;
    node.data = { ...(node.data || {}), preset: legacyType };

    const items: any[] = Array.isArray(d.items) ? d.items : [];
    switch (preset) {
        case 'hero': {
            setNthText(node, 0, asText(d.title) || asText(d.headline));
            setNthText(node, 1, asText(d.subtitle) || asText(d.description));
            const btn = firstOfType(node, 'button');
            if (btn && asText(d.buttonText)) btn.data = { ...btn.data, content: d.buttonText };
            const media = firstOfType(node, 'media');
            if (media && asText(d.imageUrl)) media.data = { ...media.data, imageUrl: d.imageUrl };
            break;
        }
        case 'about':
            setNthText(node, 0, asText(d.title));
            setNthText(node, 1, asText(d.content) || asText(d.subtitle) || asText(d.description));
            break;
        case 'grid': {
            setNthText(node, 0, asText(d.title));
            setNthText(node, 1, asText(d.subtitle) || asText(d.description));
            // No legacy items → empty grid, never the preset's sample cards/prices (this output can render on live sites).
            const grid = node.children?.[0]?.children?.[2];
            if (grid) grid.children = [];
            if (items.length) {
                if (grid) {
                    grid.children = items.map((it: any) => createBox([
                        createText(asText(it?.title) || 'Item', { fontWeight: 'bold', fontSize: '1.25rem' }),
                        createText(asText(it?.description) || '', { opacity: 0.7 })
                    ], { backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', gap: '0.5rem' }));
                }
            }
            break;
        }
        case 'faq': {
            setNthText(node, 0, asText(d.title));
            const faqBox = node.children?.[0];
            if (faqBox) faqBox.children = [faqBox.children![0]];
            if (items.length) {
                const box = faqBox;
                if (box) box.children = [box.children![0], ...faqItems(items.map((it: any) => ({ question: asText(it?.question) || asText(it?.title), answer: asText(it?.answer) || asText(it?.description) })))];
            }
            break;
        }
        case 'contact':
            setNthText(node, 0, asText(d.title));
            setNthText(node, 1, asText(d.subtitle) || asText(d.description));
            break;
        case 'video': {
            const media = firstOfType(node, 'media');
            if (media && asText(d.videoUrl)) media.data = { ...media.data, videoUrl: d.videoUrl };
            setNthText(node, 0, asText(d.title));
            break;
        }
        default: {
            // Unknown legacy type: keep any title/content as text so nothing the user wrote is lost.
            const texts = [asText(d.title), asText(d.subtitle), asText(d.content)].filter(Boolean) as string[];
            if (texts.length) node.children = [createBox(texts.map((t, i) => createText(t, i === 0 ? { tagName: 'h2', fontWeight: '900', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)' } : {})), { maxWidth: '100%', width: '800px', margin: '0 auto', gap: '1rem' })];
        }
    }
    return node;
}
