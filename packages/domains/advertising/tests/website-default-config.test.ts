/**
 * Default v2 config for new websites (D1/D2).
 * Run: npx tsx --test --test-force-exit packages/domains/advertising/tests/website-default-config.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDefaultWebsiteConfig } from '../src/websites/default-config';

const ALLOWED = new Set(['section', 'box', 'row', 'column', 'text', 'media', 'button', 'line', 'code', 'floating']);

function walk(node: any, fn: (n: any) => void) {
    fn(node);
    for (const c of node.children || []) walk(c, fn);
}

test('default config is v2 with brand, header, footer and an enabled home page', () => {
    const cfg = buildDefaultWebsiteConfig('Acme Bakery');
    assert.equal(cfg.version, 2);
    assert.ok(cfg.brand && cfg.brand.primaryColor);
    assert.ok(cfg.header && Array.isArray(cfg.header.navigation));
    assert.ok(cfg.footer && cfg.footer.copyright.includes('Acme Bakery'));
    assert.equal(cfg.pages.length, 1);
    const [home] = cfg.pages;
    assert.deepEqual({ id: home.id, name: home.name, slug: home.slug, isEnabled: home.isEnabled }, { id: 'home', name: 'Home', slug: '/', isEnabled: true });
    assert.ok(home.sections.length >= 2);
    assert.ok(!('sections' in cfg), 'no legacy top-level v1 sections');
});

test('sections are real element trees using only renderable types, with unique ids', () => {
    const cfg = buildDefaultWebsiteConfig('Acme Bakery');
    const ids: string[] = [];
    for (const section of cfg.pages[0].sections) {
        assert.equal(section.type, 'section');
        assert.ok((section.children || []).length > 0);
        walk(section, (n) => {
            assert.ok(ALLOWED.has(n.type), `type ${n.type} is not renderable`);
            assert.ok(typeof n.id === 'string' && n.id.length > 0);
            assert.ok(n.data && typeof n.data === 'object');
            assert.ok(n.style && typeof n.style === 'object');
            ids.push(n.id);
        });
    }
    assert.equal(new Set(ids).size, ids.length);
});

test('uses the website name and contains no fake contact data', () => {
    const cfg = buildDefaultWebsiteConfig('Acme Bakery');
    const json = JSON.stringify(cfg);
    assert.ok(json.includes('Acme Bakery'));
    assert.ok(!/example\.com/i.test(json));
    assert.ok(!/1-800/.test(json));
    assert.ok(!/@[a-z0-9-]+\.[a-z]/i.test(json), 'no email addresses');
    assert.ok(!/123 Business/i.test(json));
});

test('large headings carry mobile overrides', () => {
    const cfg = buildDefaultWebsiteConfig('Acme');
    let h1: any = null;
    walk(cfg.pages[0].sections[0], (n) => { if (n.type === 'text' && n.style.tagName === 'h1') h1 = n; });
    assert.ok(h1, 'hero has an h1');
    assert.equal(h1.data.content, 'Acme');
    assert.ok(h1.responsive?.mobile?.fontSize);
});

test('blank name falls back to a neutral title', () => {
    const cfg = buildDefaultWebsiteConfig('   ');
    assert.ok(cfg.footer.copyright.includes('My Website'));
});
