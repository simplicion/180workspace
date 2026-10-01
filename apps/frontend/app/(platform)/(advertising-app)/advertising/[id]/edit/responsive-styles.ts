/**
 * Responsive style compiler for the website builder.
 *
 * One source of truth for the editor canvas and the live site: a node tree is compiled into a single CSS string.
 * Every node gets the class `n-<sanitized id>`. Desktop (`node.style`) is the base; `responsive.tablet` and
 * `responsive.mobile` are emitted inside container queries on the site root, so the editor frame width triggers
 * exactly the CSS a real device gets. Pure and framework-agnostic (no hooks), safe in server components.
 */
import React from 'react';
import type { Breakpoint, ElementNode } from './types';

export type { Breakpoint };

export const SITE_CONTAINER_NAME = 'site';
/** Class for the element whose width is "the device" (live-site root, editor canvas frame). */
export const SITE_ROOT_CLASS = 'site-root';
export const BREAKPOINT_MAX: { tablet: number; mobile: number } = { tablet: 1024, mobile: 767 };
export const SITE_ROOT_CSS = `.${SITE_ROOT_CLASS}{container-type:inline-size;container-name:${SITE_CONTAINER_NAME};}`;
/** Inline equivalent of SITE_ROOT_CLASS, for wrappers that cannot rely on the stylesheet being present. */
export const SITE_ROOT_STYLE: React.CSSProperties = { containerType: 'inline-size', containerName: SITE_CONTAINER_NAME } as React.CSSProperties;

type Style = Record<string, any>;
type Decls = Record<string, string>;

// ─── Sanitizing ────────────────────────────────────────────────────────────

/** `n-<id>` with every character outside [A-Za-z0-9_-] replaced. */
export function nodeClassName(id: unknown): string {
    return `n-${String(id ?? '').replace(/[^A-Za-z0-9_-]/g, '_') || 'x'}`;
}

/** Same list React uses for unitless numeric values. */
const UNITLESS = new Set([
    'animationIterationCount', 'aspectRatio', 'borderImageOutset', 'borderImageSlice', 'borderImageWidth', 'columnCount',
    'columns', 'flex', 'flexGrow', 'flexPositive', 'flexShrink', 'flexNegative', 'flexOrder', 'gridArea', 'gridRow',
    'gridRowEnd', 'gridRowSpan', 'gridRowStart', 'gridColumn', 'gridColumnEnd', 'gridColumnSpan', 'gridColumnStart',
    'fontWeight', 'lineClamp', 'lineHeight', 'opacity', 'order', 'orphans', 'scale', 'tabSize', 'widows', 'zIndex', 'zoom',
]);

const ALLOWED = new Set([
    // layout
    'display', 'position', 'top', 'right', 'bottom', 'left', 'inset', 'zIndex', 'float', 'clear', 'overflow', 'overflowX',
    'overflowY', 'visibility', 'boxSizing', 'isolation', 'order', 'verticalAlign',
    // sizing
    'width', 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight', 'aspectRatio',
    // spacing
    'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    // flex / grid
    'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'flexDirection', 'flexWrap', 'flexFlow', 'alignItems', 'alignContent',
    'alignSelf', 'justifyContent', 'justifyItems', 'justifySelf', 'placeItems', 'placeContent', 'placeSelf', 'gap', 'rowGap',
    'columnGap', 'gridTemplateColumns', 'gridTemplateRows', 'gridTemplateAreas', 'gridArea', 'gridColumn', 'gridRow',
    'gridAutoFlow', 'gridAutoColumns', 'gridAutoRows',
    // typography
    'color', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'wordSpacing', 'textAlign',
    'textDecoration', 'textDecorationColor', 'textDecorationStyle', 'textDecorationThickness', 'textUnderlineOffset',
    'textTransform', 'textShadow', 'textIndent', 'textOverflow', 'whiteSpace', 'wordBreak', 'overflowWrap', 'hyphens',
    'fontVariant', 'WebkitTextFillColor', 'WebkitTextStroke', 'WebkitLineClamp', 'WebkitBoxOrient', 'lineClamp',
    // background / border / effects
    'background', 'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat',
    'backgroundAttachment', 'backgroundClip', 'backgroundOrigin', 'backgroundBlendMode', 'WebkitBackgroundClip',
    'border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft', 'borderWidth', 'borderStyle', 'borderColor',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderTopStyle', 'borderRightStyle',
    'borderBottomStyle', 'borderLeftStyle', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
    'borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius',
    'outline', 'outlineColor', 'outlineStyle', 'outlineWidth', 'outlineOffset', 'boxShadow', 'opacity', 'filter',
    'backdropFilter', 'WebkitBackdropFilter', 'mixBlendMode', 'transform', 'transformOrigin', 'transition', 'cursor',
    'objectFit', 'objectPosition', 'clipPath', 'scrollMarginTop', 'pointerEvents', 'userSelect',
]);

function toKebab(key: string): string {
    const k = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
    return /^(webkit|moz)-/.test(k) ? `-${k}` : k.startsWith('ms-') ? `-${k}` : k;
}

/**
 * Strips `;{}<>` (and backslashes/newlines) from a CSS value. A `;` is kept only inside a quoted string
 * (e.g. `url("data:image/png;base64,…")`), where it cannot end the declaration. Unbalanced quotes → value dropped.
 */
export function sanitizeCssValue(value: string): string {
    let out = '';
    let quote: string | null = null;
    for (const ch of String(value)) {
        if (ch === '{' || ch === '}' || ch === '<' || ch === '>' || ch === '\\' || ch === '\n' || ch === '\r') continue;
        if (quote) {
            if (ch === quote) quote = null;
            out += ch;
            continue;
        }
        if (ch === '"' || ch === "'") { quote = ch; out += ch; continue; }
        if (ch === ';') continue;
        out += ch;
    }
    if (quote) return '';
    return out.trim();
}

/** Formats a style value like React does (numbers → px unless unitless). Returns null when not emittable. */
export function formatCssValue(key: string, value: unknown): string | null {
    if (value === null || value === undefined || typeof value === 'boolean') return null;
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) return null;
        return UNITLESS.has(key) || value === 0 ? String(value) : `${value}px`;
    }
    if (typeof value !== 'string') return null;
    const clean = sanitizeCssValue(value);
    return clean === '' ? null : clean;
}

// ─── Value helpers ─────────────────────────────────────────────────────────

/** px equivalent of a px/rem/em/unitless-number value, or null. */
function toPx(v: unknown): number | null {
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (typeof v !== 'string') return null;
    const m = v.trim().match(/^(-?\d*\.?\d+)(px|rem|em)?$/);
    if (!m) return null;
    const n = parseFloat(m[1]);
    return m[2] === 'rem' || m[2] === 'em' ? n * 16 : n;
}

function capSpacing(v: unknown, maxRem: number): string | undefined {
    const px = toPx(v);
    if (px === null || Math.abs(px) <= maxRem * 16) return undefined;
    return `${px < 0 ? '-' : ''}${maxRem}rem`;
}

/** Large font sizes become fluid (`clamp`, container-relative `cqi`). Small or already-fluid values are returned as-is. */
export function toFluidFontSize(val: any): any {
    if (val === null || val === undefined || val === '') return val;
    if (typeof val === 'number') {
        if (val <= 24) return val;
        const minRem = Math.max(1.25, parseFloat((val * 0.55 / 16).toFixed(2)));
        return `clamp(${minRem}rem, 4cqi + 0.5rem, ${parseFloat((val / 16).toFixed(2))}rem)`;
    }
    const str = String(val).trim();
    if (/clamp|calc|vw|cq|min\(|max\(/.test(str)) return str;
    const n = parseFloat(str);
    if (Number.isNaN(n)) return str;
    if (str.endsWith('px')) {
        if (n <= 24) return str;
        const minRem = Math.max(1.25, parseFloat((n * 0.55 / 16).toFixed(2)));
        return `clamp(${minRem}rem, 4cqi + 0.5rem, ${parseFloat((n / 16).toFixed(2))}rem)`;
    }
    if (str.endsWith('rem') || str.endsWith('em')) {
        const unit = str.endsWith('rem') ? 'rem' : 'em';
        if (n <= 1.5) return str;
        const minV = Math.max(1.25, parseFloat((n * 0.6).toFixed(2)));
        return `clamp(${minV}${unit}, 4cqi + 0.5${unit}, ${n}${unit})`;
    }
    return str;
}

function isLargeFont(v: unknown): boolean {
    const px = toPx(v);
    return px !== null && px > 24;
}

function splitBox(value: unknown): [string, string, string, string] {
    const p = typeof value === 'number' ? `${value}px` : String(value).trim();
    const parts = p.split(/\s+/);
    if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
    if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
    if (parts.length === 3) return [parts[0], parts[1], parts[2], parts[1]];
    return [parts[0], parts[1], parts[2], parts[3]];
}

const axisVal = (v: any) => (typeof v === 'number' ? `${v}rem` : v);

/**
 * Expands shorthands into longhands: `padding`/`margin` → 4 sides (explicit longhands win),
 * `paddingX/Y`, `marginX/Y` (numbers = rem). Drops null/undefined/'' values.
 */
function expandStyle(raw: Style | undefined | null): Style {
    const s: Style = {};
    if (!raw || typeof raw !== 'object') return s;
    for (const [k, v] of Object.entries(raw)) {
        if (v === null || v === undefined || v === '') continue;
        s[k] = v;
    }
    for (const prop of ['padding', 'margin'] as const) {
        const T = `${prop}Top`, R = `${prop}Right`, B = `${prop}Bottom`, L = `${prop}Left`;
        if (s[prop] !== undefined) {
            const [t, r, b, l] = splitBox(s[prop]);
            delete s[prop];
            if (s[T] === undefined) s[T] = t;
            if (s[R] === undefined) s[R] = r;
            if (s[B] === undefined) s[B] = b;
            if (s[L] === undefined) s[L] = l;
        }
        const Y = `${prop}Y`, X = `${prop}X`;
        if (s[Y] !== undefined) {
            if (s[T] === undefined) s[T] = axisVal(s[Y]);
            if (s[B] === undefined) s[B] = axisVal(s[Y]);
            delete s[Y];
        }
        if (s[X] !== undefined) {
            if (s[L] === undefined) s[L] = axisVal(s[X]);
            if (s[R] === undefined) s[R] = axisVal(s[X]);
            delete s[X];
        }
    }
    return s;
}

/** Merged raw style of a node at a breakpoint (desktop → tablet → mobile cascade). */
export function getEffectiveStyle(node: Pick<ElementNode, 'style' | 'responsive'> | null | undefined, bp: Breakpoint = 'desktop'): Style {
    if (!node) return {};
    const base = { ...(node.style || {}) };
    if (bp === 'desktop') return base;
    const tablet = { ...base, ...(node.responsive?.tablet || {}) };
    if (bp === 'tablet') return tablet;
    return { ...tablet, ...(node.responsive?.mobile || {}) };
}

// ─── Backward-compatible inline normalizer ─────────────────────────────────

/**
 * Legacy inline normalizer (kept for compatibility). Decomposes padding/margin shorthands, converts numeric
 * paddingX/Y and marginX/Y to rem, makes large fonts fluid and forces `maxWidth:100%`, `boxSizing:border-box`.
 * `isMobileView` additionally caps horizontal spacing. New code should use compiled classes instead.
 */
export function normalizeStyle(rawStyle: any = {}, isMobileView: boolean = false): React.CSSProperties {
    if (!rawStyle) return {};
    const style: any = { ...rawStyle };
    if (style.fontSize) style.fontSize = toFluidFontSize(style.fontSize);
    if (style.padding !== undefined) {
        const [t, r, b, l] = splitBox(style.padding);
        delete style.padding;
        if (style.paddingTop === undefined) style.paddingTop = t;
        if (style.paddingRight === undefined) style.paddingRight = r;
        if (style.paddingBottom === undefined) style.paddingBottom = b;
        if (style.paddingLeft === undefined) style.paddingLeft = l;
    }
    if (style.paddingY !== undefined) {
        if (style.paddingTop === undefined) style.paddingTop = axisVal(style.paddingY);
        if (style.paddingBottom === undefined) style.paddingBottom = axisVal(style.paddingY);
        delete style.paddingY;
    }
    if (style.paddingX !== undefined) {
        if (style.paddingLeft === undefined) style.paddingLeft = axisVal(style.paddingX);
        if (style.paddingRight === undefined) style.paddingRight = axisVal(style.paddingX);
        delete style.paddingX;
    }
    if (style.margin !== undefined && ['marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginY', 'marginX'].some((k) => style[k] !== undefined)) {
        const [t, r, b, l] = splitBox(style.margin);
        delete style.margin;
        if (style.marginTop === undefined) style.marginTop = t;
        if (style.marginRight === undefined) style.marginRight = r;
        if (style.marginBottom === undefined) style.marginBottom = b;
        if (style.marginLeft === undefined) style.marginLeft = l;
    }
    if (style.marginY !== undefined) {
        if (style.marginTop === undefined) style.marginTop = axisVal(style.marginY);
        if (style.marginBottom === undefined) style.marginBottom = axisVal(style.marginY);
        delete style.marginY;
    }
    if (style.marginX !== undefined) {
        if (style.marginLeft === undefined) style.marginLeft = axisVal(style.marginX);
        if (style.marginRight === undefined) style.marginRight = axisVal(style.marginX);
        delete style.marginX;
    }
    if (isMobileView) {
        style.paddingLeft = capSpacing(style.paddingLeft, 1) ?? style.paddingLeft;
        style.paddingRight = capSpacing(style.paddingRight, 1) ?? style.paddingRight;
        style.marginLeft = capSpacing(style.marginLeft, 0.5) ?? style.marginLeft;
        style.marginRight = capSpacing(style.marginRight, 0.5) ?? style.marginRight;
    }
    style.maxWidth = '100%';
    style.boxSizing = 'border-box';
    return style;
}

// ─── Per-type routing and defaults ─────────────────────────────────────────

/** Keys that stay on the button wrapper; every other button style key styles the inner `<a>`. */
const BUTTON_WRAPPER_KEYS = new Set([
    'display', 'width', 'minWidth', 'maxWidth', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'alignSelf',
    'justifySelf', 'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'order', 'position', 'top', 'right', 'bottom', 'left',
    'zIndex', 'opacity', 'transform', 'gridColumn', 'gridRow', 'gridArea',
]);
/** Line color/thickness/direction are rendered by the inner rule element (see LineElement). */
const LINE_DROP_KEYS = new Set(['backgroundColor', 'borderStyle', 'thickness', 'direction']);
/** Floating anchoring is computed inline from `data.position` (fixed on the site, absolute in the editor). */
const FLOATING_DROP_KEYS = new Set(['offsetX', 'offsetY', 'top', 'right', 'bottom', 'left', 'zIndex', 'position']);
const MEDIA_CHILD_KEYS = new Set(['objectFit', 'objectPosition']);

interface Routed { main: Style; anchor: Style; mediaChild: Style }

function route(type: string, s: Style): Routed {
    const r: Routed = { main: {}, anchor: {}, mediaChild: {} };
    for (const [k, v] of Object.entries(s)) {
        if (type === 'button') (BUTTON_WRAPPER_KEYS.has(k) ? r.main : r.anchor)[k] = v;
        else if (type === 'line') { if (!LINE_DROP_KEYS.has(k)) r.main[k] = v; }
        else if (type === 'floating') { if (!FLOATING_DROP_KEYS.has(k)) r.main[k] = v; }
        else if (type === 'media' || type === 'image') (MEDIA_CHILD_KEYS.has(k) ? r.mediaChild : r.main)[k] = v;
        else r.main[k] = v;
    }
    return r;
}

function defaultDisplay(type: string): string {
    if (type === 'row' || type === 'column' || type === 'box' || type === 'floating' || type === 'line') return 'flex';
    if (type === 'button') return 'inline-block';
    return 'block';
}

/** Base defaults (applied under user styles) and forced values (applied over user styles). */
function typeDefaults(node: ElementNode, s: Style, brand: any): { defaults: Routed; forced: Style } {
    const d: Routed = { main: {}, anchor: {}, mediaChild: {} };
    const forced: Style = {};
    switch (node.type) {
        case 'section':
            Object.assign(d.main, { display: 'block', width: '100%', position: 'relative' });
            if (!s.backgroundColor || s.backgroundColor === 'transparent') forced.backgroundColor = '#ffffff';
            break;
        case 'row':
            Object.assign(d.main, { width: '100%', flexWrap: 'wrap', alignItems: 'stretch', flexDirection: 'row' });
            forced.display = 'flex';
            break;
        case 'column':
            Object.assign(d.main, { flex: '1 1 0%', minWidth: 0 });
            forced.display = 'flex';
            forced.flexDirection = 'column';
            break;
        case 'box':
            Object.assign(d.main, { display: 'flex', width: '100%' });
            break;
        case 'text':
            Object.assign(d.main, { width: '100%', lineHeight: '1.4', overflowWrap: 'break-word', wordBreak: 'break-word' });
            break;
        case 'media':
        case 'image':
            Object.assign(d.main, { width: '100%', overflow: 'hidden', position: 'relative' });
            Object.assign(d.mediaChild, { display: 'block', width: '100%', maxWidth: '100%', objectFit: 'cover', borderRadius: 'inherit' });
            break;
        case 'button':
            Object.assign(d.main, { display: 'inline-block', width: 'fit-content', position: 'relative', textAlign: 'center' });
            Object.assign(d.anchor, {
                fontSize: '1rem', fontFamily: 'inherit', backgroundColor: brand?.primaryColor || '#4f46e5', color: '#ffffff',
                borderColor: 'transparent', borderWidth: '0px', borderStyle: 'solid', paddingTop: '0.75rem',
                paddingBottom: '0.75rem', paddingLeft: '1.5rem', paddingRight: '1.5rem', borderRadius: '0.5rem',
                fontWeight: 'bold', textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
                justifyContent: 'center', textAlign: 'center', minHeight: '44px', minWidth: 'min(120px, 100%)', width: '100%',
            });
            break;
        case 'line': {
            const vertical = s.direction === 'vertical';
            Object.assign(d.main, vertical
                ? { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: 'auto', minWidth: '24px', paddingLeft: '0.5rem', paddingRight: '0.5rem' }
                : { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: 'auto', minHeight: '24px', paddingTop: '0.5rem', paddingBottom: '0.5rem' });
            break;
        }
        case 'floating':
            Object.assign(d.main, { display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: '0.5rem' });
            break;
        case 'code':
            Object.assign(d.main, { width: '100%', position: 'relative' });
            break;
        default:
            break;
    }
    return { defaults: d, forced };
}

// ─── Declaration building ──────────────────────────────────────────────────

function finalize(s: Style, opts: { fluidFont: boolean; maxWidthFallback?: boolean }): Decls {
    const out: Decls = {};
    for (const [k, raw] of Object.entries(s)) {
        if (!ALLOWED.has(k)) continue;
        let v: any = raw;
        if (k === 'fontSize' && opts.fluidFont) v = toFluidFontSize(v);
        let formatted = formatCssValue(k, v);
        if (formatted === null) continue;
        if (k === 'maxWidth' && formatted !== '100%' && formatted !== 'none' && !/^min\(/.test(formatted)) {
            formatted = `min(${formatted}, 100%)`;
        }
        out[toKebab(k)] = formatted;
    }
    if (opts.maxWidthFallback && out['max-width'] === undefined) out['max-width'] = '100%';
    return out;
}

function declsToCss(selector: string, d: Decls): string {
    const body = Object.entries(d).map(([k, v]) => `${k}:${v}`).join(';');
    return body ? `${selector}{${body}}` : '';
}

const has = (s: Style, ...keys: string[]) => keys.some((k) => s[k] !== undefined && s[k] !== null && s[k] !== '');

function isSmallMedia(n: ElementNode): boolean {
    if (n.type !== 'media' && n.type !== 'image') return false;
    const w = toPx(n.style?.width);
    return w !== null && w <= 96;
}

/** Whether a flex box's children are "inline-ish" (button groups, icon + label) and should stay horizontal on phones. */
function keepsRowOnMobile(node: ElementNode): boolean {
    const kids = Array.isArray(node.children) ? node.children.filter(Boolean) : [];
    if (kids.length === 0) return false;
    if (kids.every((c) => c.type === 'button' || c.type === 'line' || isSmallMedia(c))) return true;
    return kids.some(isSmallMedia) && kids.every((c) => c.type === 'text' || c.type === 'button' || isSmallMedia(c));
}

function isRowDirection(display: unknown, dir: unknown): boolean {
    const flexy = display === 'flex' || display === 'inline-flex';
    if (!flexy) return false;
    return dir === undefined || dir === 'row' || dir === 'row-reverse';
}

/** Whether a horizontal row/box is turned into a vertical stack on mobile (drives its children's defaults). */
function stacksOnMobile(node: ElementNode): boolean {
    if (node.type !== 'row' && node.type !== 'box') return false;
    const explicitM = expandStyle(node.responsive?.mobile);
    const effT = expandStyle(getEffectiveStyle(node, 'tablet'));
    if (explicitM.flexDirection !== undefined) return !String(explicitM.flexDirection).startsWith('row');
    if (node.type === 'row') return !String(effT.flexDirection || 'row').startsWith('column');
    if (!isRowDirection(effT.display ?? 'flex', effT.flexDirection)) return false;
    return !keepsRowOnMobile(node);
}

/** Smart mobile defaults; only for keys the user has not set explicitly in `responsive.mobile`. */
function mobileDefaults(node: ElementNode, effT: Style, explicitM: Style, parentStacks: boolean): Style {
    const d: Style = {};
    const set = (k: string, v: any) => { if (v !== undefined && !has(explicitM, k)) d[k] = v; };
    const type = node.type;

    if (type === 'row' || type === 'box') {
        const display = effT.display ?? 'flex';
        if (type === 'row' || isRowDirection(display, effT.flexDirection)) {
            if (type === 'box' && keepsRowOnMobile(node)) set('flexWrap', 'wrap');
            else set('flexDirection', String(effT.flexDirection || '').endsWith('reverse') ? 'column-reverse' : 'column');
        }
        const wPx = toPx(effT.width);
        if ((typeof effT.width === 'string' && effT.width.trim().endsWith('%')) || (wPx !== null && wPx > 320)) set('width', '100%');
    }

    if (type === 'column' && parentStacks) {
        set('width', '100%');
        set('maxWidth', '100%');
        set('flex', '1 1 100%');
    } else if (parentStacks && type !== 'floating') {
        // Children of a stacked parent: px flex-basis becomes a *height* basis in a column → let content decide.
        if (typeof effT.flex === 'string' && /\d(px|rem|em)/.test(effT.flex)) set('flex', '1 1 auto');
        if (typeof effT.flexBasis === 'string' && /\d(px|rem|em)/.test(effT.flexBasis)) set('flexBasis', 'auto');
        if (typeof effT.width === 'string' && /^\d*\.?\d+%$/.test(effT.width.trim()) && parseFloat(effT.width) < 100) set('width', '100%');
    }

    // Spacing caps (horizontal only, plus section vertical padding).
    if (type !== 'button' && type !== 'floating') {
        set('paddingLeft', capSpacing(effT.paddingLeft, 1));
        set('paddingRight', capSpacing(effT.paddingRight, 1));
    }
    if (type !== 'floating') {
        set('marginLeft', capSpacing(effT.marginLeft, 0.5));
        set('marginRight', capSpacing(effT.marginRight, 0.5));
    }
    if (type === 'section') {
        set('paddingTop', capSpacing(effT.paddingTop, 2.5));
        set('paddingBottom', capSpacing(effT.paddingBottom, 2.5));
    }
    const minW = toPx(effT.minWidth);
    if (minW !== null && minW > 300) set('minWidth', 0);

    if (type === 'text' && isLargeFont(effT.fontSize) && !has(explicitM, 'lineHeight')) {
        const lh = effT.lineHeight;
        const unitless = typeof lh === 'number' || (typeof lh === 'string' && /^\d*\.?\d+$/.test(lh.trim()));
        if (lh === undefined || (unitless && parseFloat(String(lh)) > 1.3)) set('lineHeight', '1.25');
    }
    if (effT.backgroundAttachment === 'fixed') set('backgroundAttachment', 'scroll'); // iOS
    if (type === 'button') set('width', '100%');
    return d;
}

export interface CompileOptions {
    /** Brand (for the default button colour). */
    brand?: any;
    /** Editor mode: hidden-on-device nodes are dimmed instead of removed so they stay selectable. */
    showHidden?: boolean;
    /** Prepend the site-root container rule (default true). */
    includeRoot?: boolean;
}

interface Buckets { base: string[]; tablet: string[]; mobile: string[] }

function compileNode(node: ElementNode, opts: CompileOptions, parentStacks: boolean, out: Buckets, seen: Set<string>) {
    if (!node || typeof node !== 'object' || node.id === undefined || node.id === null) return;
    const cls = nodeClassName(node.id);
    if (seen.has(cls)) return;
    seen.add(cls);
    const type = String(node.type || '');
    const sel = `.${cls}`;
    const anchorSel = `${sel}>a.site-btn`;
    const mediaSel = `${sel}>img,${sel}>video`;

    // ── Base (desktop)
    const base = expandStyle(node.style);
    const { defaults, forced } = typeDefaults(node, base, opts.brand);
    const rBase = route(type, base);
    const baseMain: Style = { ...defaults.main, ...rBase.main, ...forced, boxSizing: 'border-box' };
    const baseAnchor: Style = { ...defaults.anchor, ...rBase.anchor };
    const hasBoxHeight = (s: Style) => (s.height !== undefined && s.height !== 'auto') || s.aspectRatio !== undefined;
    const baseMedia: Style = { ...defaults.mediaChild, ...rBase.mediaChild, height: hasBoxHeight(base) ? '100%' : 'auto' };

    const hidden = node.hiddenOn || {};
    const displayAt = (s: Style) => String(forced.display ?? s.display ?? defaultDisplay(type));
    const hiddenDecl = (hide: boolean, effective: Style): Style => {
        if (opts.showHidden) {
            return hide ? { filter: 'grayscale(1) opacity(0.45)' } : { filter: effective.filter ?? 'none' };
        }
        return { display: hide ? 'none' : displayAt(effective) };
    };
    if (hidden.desktop) Object.assign(baseMain, hiddenDecl(true, base));

    out.base.push(declsToCss(sel, finalize(baseMain, { fluidFont: true, maxWidthFallback: true })));
    if (type === 'button') out.base.push(declsToCss(anchorSel, finalize(baseAnchor, { fluidFont: true, maxWidthFallback: true })));
    if (type === 'media' || type === 'image') out.base.push(declsToCss(mediaSel, finalize(baseMedia, { fluidFont: false })));

    // ── Tablet (explicit overrides only)
    const tab = expandStyle(node.responsive?.tablet);
    const effT = expandStyle(getEffectiveStyle(node, 'tablet'));
    const rTab = route(type, tab);
    const tabMain: Style = { ...rTab.main };
    for (const k of Object.keys(forced)) if (k in tabMain) tabMain[k] = forced[k];
    if (hidden.tablet || hidden.desktop) Object.assign(tabMain, hiddenDecl(!!hidden.tablet, effT));
    out.tablet.push(declsToCss(sel, finalize(tabMain, { fluidFont: true })));
    if (type === 'button') out.tablet.push(declsToCss(anchorSel, finalize(rTab.anchor, { fluidFont: true })));
    if (type === 'media' || type === 'image') {
        const m: Style = { ...rTab.mediaChild };
        if (hasBoxHeight(effT) !== hasBoxHeight(base)) m.height = hasBoxHeight(effT) ? '100%' : 'auto';
        out.tablet.push(declsToCss(mediaSel, finalize(m, { fluidFont: false })));
    }

    // ── Mobile (smart defaults, then explicit overrides win)
    const mob = expandStyle(node.responsive?.mobile);
    const effM = expandStyle(getEffectiveStyle(node, 'mobile'));
    const smart = mobileDefaults(node, effT, mob, parentStacks);
    const rSmart = route(type, smart);
    const rMob = route(type, mob);
    const mobMain: Style = { ...rSmart.main, ...rMob.main };
    for (const k of Object.keys(forced)) if (k in mobMain) mobMain[k] = forced[k];
    if (hidden.mobile || hidden.tablet || hidden.desktop) Object.assign(mobMain, hiddenDecl(!!hidden.mobile, effM));
    out.mobile.push(declsToCss(sel, finalize(mobMain, { fluidFont: false })));
    if (type === 'button') {
        const a: Style = { ...rSmart.anchor, ...rMob.anchor };
        out.mobile.push(declsToCss(anchorSel, finalize(a, { fluidFont: false })));
    }
    if (type === 'media' || type === 'image') {
        const m: Style = { ...rMob.mediaChild };
        if (hasBoxHeight(effM) !== hasBoxHeight(effT)) m.height = hasBoxHeight(effM) ? '100%' : 'auto';
        out.mobile.push(declsToCss(mediaSel, finalize(m, { fluidFont: false })));
    }

    const kids = Array.isArray(node.children) ? node.children : [];
    if (kids.length) {
        const stacks = stacksOnMobile(node);
        for (const child of kids) compileNode(child, opts, stacks, out, seen);
    }
}

/**
 * Compiles a node tree into one CSS string: base rules, then
 * `@container site (max-width:1024px)` (tablet) and `@container site (max-width:767px)` (mobile).
 */
export function compileResponsiveCss(nodes: ElementNode[] | ElementNode | null | undefined, opts: CompileOptions = {}): string {
    const list = Array.isArray(nodes) ? nodes : nodes ? [nodes] : [];
    const out: Buckets = { base: [], tablet: [], mobile: [] };
    const seen = new Set<string>();
    for (const n of list) compileNode(n, opts, false, out, seen);
    const join = (a: string[]) => a.filter(Boolean).join('');
    const tablet = join(out.tablet);
    const mobile = join(out.mobile);
    return [
        opts.includeRoot === false ? '' : SITE_ROOT_CSS,
        join(out.base),
        tablet ? `@container ${SITE_CONTAINER_NAME} (max-width: ${BREAKPOINT_MAX.tablet}px){${tablet}}` : '',
        mobile ? `@container ${SITE_CONTAINER_NAME} (max-width: ${BREAKPOINT_MAX.mobile}px){${mobile}}` : '',
    ].join('');
}

export interface ResponsiveStylesProps extends CompileOptions {
    nodes: ElementNode[] | null | undefined;
}

/** `<style>` with the compiled CSS for `nodes`. Render it inside (or next to) the element carrying SITE_ROOT_CLASS. */
export function ResponsiveStyles({ nodes, brand, showHidden, includeRoot }: ResponsiveStylesProps): React.ReactElement | null {
    const css = compileResponsiveCss(nodes, { brand, showHidden, includeRoot });
    if (!css) return null;
    return React.createElement('style', { 'data-site-styles': '', dangerouslySetInnerHTML: { __html: css } });
}
