import {
    compileResponsiveCss,
    nodeClassName,
    sanitizeCssValue,
    formatCssValue,
    getEffectiveStyle,
    normalizeStyle,
    SITE_ROOT_CLASS,
} from '../../app/(platform)/(advertising-app)/advertising/[id]/edit/responsive-styles';
import type { ElementNode } from '../../app/(platform)/(advertising-app)/advertising/[id]/edit/types';

const node = (id: string, type: any, style: any = {}, extra: Partial<ElementNode> = {}): ElementNode =>
    ({ id, type, data: {}, style, ...extra }) as ElementNode;

/** Returns the rule body for `selector` inside the given section ('base' | 'tablet' | 'mobile'). */
function ruleIn(css: string, section: 'base' | 'tablet' | 'mobile', selector: string): string | null {
    const tabletAt = css.indexOf('@container site (max-width: 1024px)');
    const mobileAt = css.indexOf('@container site (max-width: 767px)');
    const end = (i: number) => (i < 0 ? css.length : i);
    const chunk = section === 'base'
        ? css.slice(0, Math.min(end(tabletAt), end(mobileAt)))
        : section === 'tablet'
            ? (tabletAt < 0 ? '' : css.slice(tabletAt, end(mobileAt)))
            : (mobileAt < 0 ? '' : css.slice(mobileAt));
    const esc = selector.replace(/[.*+?^${}()|[\]\\>]/g, '\\$&');
    const m = chunk.match(new RegExp(`(?:^|[{}])${esc}\\{([^}]*)\\}`));
    return m ? m[1] : null;
}

describe('responsive-styles compiler', () => {
    it('sanitizes ids into class names', () => {
        expect(nodeClassName('abc-123')).toBe('n-abc-123');
        expect(nodeClassName('a b.c<d>')).toBe('n-a_b_c_d_');
    });

    it('emits the site root container rule', () => {
        const css = compileResponsiveCss([]);
        expect(css).toContain(`.${SITE_ROOT_CLASS}{container-type:inline-size;container-name:site;}`);
    });

    it('converts camelCase to kebab, formats numbers like React and decomposes padding', () => {
        const css = compileResponsiveCss([node('t1', 'text', { padding: '1rem 2rem', lineHeight: 1.6, marginTop: 8, zIndex: 3, paddingX: 3 })]);
        const base = ruleIn(css, 'base', '.n-t1')!;
        expect(base).toContain('padding-top:1rem');
        expect(base).toContain('padding-left:2rem'); // shorthand fills longhands before paddingX
        expect(base).toContain('line-height:1.6');
        expect(base).toContain('margin-top:8px');
        expect(base).toContain('z-index:3');
        expect(base).toContain('max-width:100%');
        expect(base).toContain('box-sizing:border-box');
    });

    it('treats numeric paddingX/Y as rem', () => {
        const css = compileResponsiveCss([node('s1', 'section', { paddingY: 4, paddingX: 2 })]);
        const base = ruleIn(css, 'base', '.n-s1')!;
        expect(base).toContain('padding-top:4rem');
        expect(base).toContain('padding-left:2rem');
    });

    it('drops non-whitelisted properties and strips dangerous characters', () => {
        const css = compileResponsiveCss([node('x', 'box', { color: 'red;}</style><script>', behavior: 'url(x)', tagName: 'h1' })]);
        expect(css).not.toContain('<');
        expect(css).not.toContain('behavior');
        expect(css).not.toContain('tag-name');
        expect(ruleIn(css, 'base', '.n-x')).toContain('color:red/stylescript');
        expect(sanitizeCssValue('a;b{c}d<e>f')).toBe('abcdef');
        expect(sanitizeCssValue('url("data:image/png;base64,AAA")')).toBe('url("data:image/png;base64,AAA")');
        expect(sanitizeCssValue('url("unterminated')).toBe('');
        expect(formatCssValue('opacity', 0.5)).toBe('0.5');
        expect(formatCssValue('width', 0)).toBe('0');
        expect(formatCssValue('width', 10)).toBe('10px');
    });

    it('makes large fonts fluid on desktop with container units', () => {
        const css = compileResponsiveCss([node('h', 'text', { fontSize: '48px' })]);
        expect(ruleIn(css, 'base', '.n-h')).toMatch(/font-size:clamp\(1\.65rem, 4cqi \+ 0\.5rem, 3rem\)/);
        const small = compileResponsiveCss([node('p', 'text', { fontSize: '16px' })]);
        expect(ruleIn(small, 'base', '.n-p')).toContain('font-size:16px');
    });

    it('emits tablet and mobile overrides in container queries (cascade desktop → tablet → mobile)', () => {
        const css = compileResponsiveCss([node('t', 'text', { color: 'red' }, { responsive: { tablet: { color: 'green' }, mobile: { color: 'blue', fontSize: '40px' } } })]);
        expect(ruleIn(css, 'base', '.n-t')).toContain('color:red');
        expect(ruleIn(css, 'tablet', '.n-t')).toContain('color:green');
        const mobile = ruleIn(css, 'mobile', '.n-t')!;
        expect(mobile).toContain('color:blue');
        expect(mobile).toContain('font-size:40px'); // explicit mobile value is used as-is
        expect(css.indexOf('@container site (max-width: 1024px)')).toBeLessThan(css.indexOf('@container site (max-width: 767px)'));
    });

    it('stacks rows on mobile and makes their columns full width', () => {
        const row = node('r', 'row', {}, { children: [node('c1', 'column'), node('c2', 'column')] });
        const css = compileResponsiveCss([row]);
        expect(ruleIn(css, 'base', '.n-r')).toContain('flex-direction:row');
        expect(ruleIn(css, 'mobile', '.n-r')).toContain('flex-direction:column');
        expect(ruleIn(css, 'mobile', '.n-c1')).toContain('width:100%');
    });

    it('keeps a row horizontal on mobile when explicitly requested', () => {
        const row = node('r', 'row', {}, { responsive: { mobile: { flexDirection: 'row' } }, children: [node('c1', 'column')] });
        const css = compileResponsiveCss([row]);
        expect(ruleIn(css, 'mobile', '.n-r')).toContain('flex-direction:row');
        expect(ruleIn(css, 'mobile', '.n-c1') || '').not.toContain('width:100%');
    });

    it('keeps small inline groups (button rows) horizontal but wrapping', () => {
        const box = node('b', 'box', { display: 'flex', flexDirection: 'row' }, { children: [node('b1', 'button'), node('b2', 'button')] });
        const mobile = ruleIn(compileResponsiveCss([box]), 'mobile', '.n-b')!;
        expect(mobile).not.toContain('flex-direction:column');
        expect(mobile).toContain('flex-wrap:wrap');
    });

    it('caps large horizontal padding on mobile unless set explicitly', () => {
        const css = compileResponsiveCss([node('s', 'section', { paddingX: 6, paddingY: 8 })]);
        const mobile = ruleIn(css, 'mobile', '.n-s')!;
        expect(mobile).toContain('padding-left:1rem');
        expect(mobile).toContain('padding-top:2.5rem');
        const explicit = compileResponsiveCss([node('s', 'section', { paddingX: 6 }, { responsive: { mobile: { paddingLeft: '3rem' } } })]);
        expect(ruleIn(explicit, 'mobile', '.n-s')).toContain('padding-left:3rem');
    });

    it('handles hiddenOn per device', () => {
        const css = compileResponsiveCss([node('h', 'box', {}, { hiddenOn: { mobile: true } })]);
        expect(ruleIn(css, 'base', '.n-h')).not.toContain('display:none');
        expect(ruleIn(css, 'mobile', '.n-h')).toContain('display:none');
        const desk = compileResponsiveCss([node('d', 'text', {}, { hiddenOn: { desktop: true } })]);
        expect(ruleIn(desk, 'base', '.n-d')).toContain('display:none');
        expect(ruleIn(desk, 'tablet', '.n-d')).toContain('display:block');
        const editor = compileResponsiveCss([node('h', 'box', {}, { hiddenOn: { mobile: true } })], { showHidden: true });
        expect(ruleIn(editor, 'mobile', '.n-h')).toContain('filter:grayscale(1) opacity(0.45)');
    });

    it('splits button wrapper/anchor styles and does not force full width on desktop', () => {
        const css = compileResponsiveCss([node('btn', 'button', { backgroundColor: '#f00', marginTop: '1rem' })], { brand: { primaryColor: '#123456' } });
        const wrap = ruleIn(css, 'base', '.n-btn')!;
        const anchor = ruleIn(css, 'base', '.n-btn>a.site-btn')!;
        expect(wrap).toContain('width:fit-content');
        expect(wrap).toContain('margin-top:1rem');
        expect(anchor).toContain('background-color:#f00');
        expect(ruleIn(css, 'mobile', '.n-btn')).toContain('width:100%');
        const brandDefault = compileResponsiveCss([node('b2', 'button')], { brand: { primaryColor: '#123456' } });
        expect(ruleIn(brandDefault, 'base', '.n-b2>a.site-btn')).toContain('background-color:#123456');
    });

    it('keeps media aspect ratio instead of collapsing', () => {
        const css = compileResponsiveCss([node('m', 'media', { aspectRatio: '16/9', height: 'auto' })]);
        expect(ruleIn(css, 'base', '.n-m')).toContain('aspect-ratio:16/9');
        expect(css).toMatch(/\.n-m>img,\.n-m>video\{[^}]*height:100%/);
        const natural = compileResponsiveCss([node('m2', 'media', {})]);
        expect(natural).toMatch(/\.n-m2>img,\.n-m2>video\{[^}]*height:auto/);
    });

    it('honours user maxWidth without overflowing', () => {
        const css = compileResponsiveCss([node('w', 'box', { maxWidth: '500px' })]);
        expect(ruleIn(css, 'base', '.n-w')).toContain('max-width:min(500px, 100%)');
    });

    it('never crashes on legacy/unknown/malformed nodes', () => {
        expect(() => compileResponsiveCss([null as any, { id: 'hero1', type: 'hero', data: {} } as any, { type: 'box' } as any, node('ok', 'text', null as any)])).not.toThrow();
        expect(compileResponsiveCss(undefined)).toContain(SITE_ROOT_CLASS);
    });

    it('getEffectiveStyle cascades and normalizeStyle keeps legacy semantics', () => {
        const n = node('e', 'box', { color: 'a', gap: 1 }, { responsive: { tablet: { color: 'b' }, mobile: { gap: 2 } } });
        expect(getEffectiveStyle(n, 'desktop')).toEqual({ color: 'a', gap: 1 });
        expect(getEffectiveStyle(n, 'tablet')).toEqual({ color: 'b', gap: 1 });
        expect(getEffectiveStyle(n, 'mobile')).toEqual({ color: 'b', gap: 2 });
        const legacy = normalizeStyle({ padding: '1rem', paddingX: 2 }) as any;
        expect(legacy.paddingTop).toBe('1rem');
        expect(legacy.maxWidth).toBe('100%');
    });
});
