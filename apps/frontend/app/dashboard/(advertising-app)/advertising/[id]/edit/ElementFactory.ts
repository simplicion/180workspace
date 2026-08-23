import { ElementNode, ElementType } from './types';

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const createBox = (children: ElementNode[] = [], style: any = {}): ElementNode => ({
    id: generateId('box'),
    type: 'box',
    data: {},
    style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        padding: '1rem',
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
        gap: '1rem',
        padding: '1rem',
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
        gap: '1rem',
        padding: '1rem',
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

export function getDefaultElementForType(type: ElementType | string, currencySymbol: string): ElementNode {
    const id = generateId('sec');

    switch (type) {
        case 'hero':
            return {
                id,
                type: 'section',
                data: {},
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
                data: {},
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
                data: {},
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
                data: {},
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
            ], { backgroundColor: '#ffffff', borderRadius: '1rem', padding: '1.5rem', gap: '0.5rem', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e5e7eb' });

        case 'portfolio-element':
            return createBox([
                createMedia('', { width: '100%', height: 'auto', aspectRatio: '4/3', borderRadius: '0.5rem' }),
                createText('Project Name', { fontWeight: 'bold', fontSize: '1.5rem' }),
                createText('Project Description', { opacity: 0.7 })
            ], { flex: '1 1 350px', maxWidth: '500px', width: '100%', gap: '0.5rem', backgroundColor: '#ffffff', borderRadius: '1rem', padding: '1rem', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e5e7eb' });


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
