# Website Builder — Production Audit & Plan (2026-10-02)

Scope: Advertising → Websites. Editor `apps/frontend/app/(platform)/(advertising-app)/advertising/[id]/edit/**`,
public renderer `apps/frontend/app/sites/[domain]/[[...slug]]/**`, backend `apps/backend/src/api/v1/advertising/websites/**`,
service `packages/domains/advertising/src/websites/websites.service.ts`, AI `packages/domains/ai/src/builders/website-ai-builder.service.ts`.

Rule: **no feature is removed.** Things get fixed, merged or made faster. Only code that is never called gets deleted.

## 1. Audit findings (ranked)

### P0: Correctness, security and data
| # | Finding | Where |
|---|---|---|
| S1 | **Cross-tenant IDOR**: `getWebsite/updateWebsite/deleteWebsite/getWebsitePixels/createWebsitePixel/getWebsiteStats` use `findUnique/update/delete` by `id`. The tenant extension does not scope these, so any authenticated user can read, edit or delete any company's site. | websites.service.ts |
| S2 | `getWebsite` attaches `prisma.company.findFirst()` (whichever company comes first, not the owner). AI `compileAST` falls back to "first company" when `companyId` is missing. | websites.service.ts, website-ai-builder.service.ts |
| S3 | AI `patchAST` loads the website by `findUnique({id})`, so it is not tenant scoped. | website-ai-builder.service.ts |
| D1 | New sites are created with legacy v1 sections (`hero/services/about/contact`). `BuilderElement` returns `null` for those types, so **a new site renders blank**. The v1→v2 migration in the editor keeps the same unrenderable types. | websites.service.ts `createWebsite`, edit/page.tsx `fetchWebsite` |
| D2 | Placeholder data on live sites: the footer prints `123 Business Avenue` / `email@example.com` when the brand has none. Seed config has `hello@example.com`, `1-800-000-0000`. | sites/page.tsx, websites.service.ts |
| D3 | Hardcoded fallbacks: `'http://localhost:4002'` in the editor's beforeunload flush. The public resolver tries localhost ports **serially, with no timeout**, in production, and runs twice per request (metadata + page). | edit/page.tsx, sites/page.tsx |
| A1 | **Initial "AI" generation calls no model**: keyword → hardcoded template (diwali/shop/agency), plus Unsplash stock URLs and invented copy. It still charges 20 AI credits. `patchAST` has a live LLM path but falls back to canned "heuristic" output on error, so failures look like success. | website-ai-builder.service.ts, ai.controller.ts |

### P0: Responsiveness (the core complaint)
| # | Finding |
|---|---|
| R1 | All element styles are **inline** (`style={...}`), so they cannot carry media queries. Responsiveness is faked two incompatible ways: (a) in the editor a JS flag `viewMode==='mobile'` rewrites styles; (b) on the live site `viewMode` is always `'desktop'` and a global `@media (max-width:767px)` block with `!important` overrides everything. **Editor preview ≠ real phone.** |
| R2 | No per-device values. A user cannot set a different font size, padding, alignment, column width, or visibility for tablet or mobile. There is no tablet logic at all; it is treated as desktop. |
| R3 | Blanket mobile rules destroy intent: every row and flex box is forced to a column (even small inline icon or button rows), every column gets `padding 1rem !important`, and every h1/h2 is clamped to the same size. |
| R4 | Live header has no mobile menu: the nav `flex-wrap`s into a tall block that covers the page under `sticky`. |
| R5 | `background-attachment: fixed` on the page root breaks on iOS (jank, zoomed images). |
| R6 | Media uses `objectFit: cover` + `height:100%` with no aspect ratio, so images collapse or crop unpredictably. No `loading="lazy"`, no `sizes`/`decoding`, no width/height, which hurts CLS. |
| R7 | Button anchor is hard-wired `width:100%; min-width:120px`, so buttons always stretch full width on desktop as well. |

### P1: Performance
| # | Finding |
|---|---|
| P1 | The public site renders through the **editor component** (`'use client'`, dnd-kit `useSortable` per node, framer-motion, hls.js). All of that ships to every visitor. The published site should be a lean render path with no editor code. |
| P2 | `hls.js` is imported eagerly even when no video exists. The Hls instance is never destroyed (leak on re-render). Video always autoplays. |
| P3 | Editor history stores a **full deep clone of the config per edit, unbounded**. `commitConfig` also deep-clones on every keystroke. Memory grows without limit on long sessions. |
| P4 | The keydown effect re-subscribes on every config change. `JSON.stringify(config)` runs on every render in the autosave effect. |
| P5 | Google Font `@import` inside a `<style>` in body, which blocks render. Should be `<link rel=preconnect>` + stylesheet, and only the weights in use. |

### P1: UX of the editor
| # | Finding |
|---|---|
| U1 | Dead code in edit/page.tsx: `MediaCarousel`, `ImageEditor`, `VideoEditor`, `FakeLeadForm` (0 usages). ~300 lines. |
| U2 | Device toggle only changes the frame width. Editing in mobile mode silently edits the desktop value. Fix: device-aware property editing with a visible "editing Mobile overrides" badge and a per-property reset. |
| U3 | Margin drag handles are mouse-only (`onMouseDown`), with no touch or pointer support. Toolbar buttons are 24px (below the 44px target). |
| U4 | Section deletion asks for confirmation ("cannot be undone") although undo exists. Element deletion asks for none. Make both consistent: no modal, undo toast. |
| U5 | No keyboard shortcuts beyond undo/redo/delete (missing: duplicate Ctrl+D, Esc to deselect, arrow keys to select parent/child). No layers/navigator tree to select deeply nested nodes. |
| U6 | Empty-state placeholders render inside rows on mobile preview, inflating height. |

## 2. Target architecture: responsive style compiler

**One source of truth, identical in editor and on the live site.**

### Schema contract (additive and backward compatible; every agent must follow this)
```ts
// edit/types.ts
export type Breakpoint = 'desktop' | 'tablet' | 'mobile';
export interface ElementNode {
  ...existing fields
  /** Per-device style overrides, merged over `style` (desktop = base). Cascades desktop → tablet → mobile. */
  responsive?: { tablet?: Record<string, any>; mobile?: Record<string, any> };
  /** Hide on specific devices. */
  hiddenOn?: { desktop?: boolean; tablet?: boolean; mobile?: boolean };
}
```
- Breakpoints: **tablet ≤ 1024px, mobile ≤ 767px**, implemented with **CSS container queries**
  (`@container site (max-width: …)`). The site root and the editor canvas frame both get
  `container-type:inline-size; container-name:site`, so the editor frame width triggers exactly the CSS a real phone gets.
- `responsive-styles.ts` (new, in `edit/`) compiles a node tree into one `<style>` string. Each node gets class `n-<id>`.
  It emits base styles, then tablet and mobile overrides. **Smart mobile defaults** apply only when the user has not set an
  explicit mobile value: rows/flex-row boxes stack, columns go 100%, large font sizes become fluid `clamp()`, large horizontal
  padding is capped. Explicit `responsive.mobile` always wins. Escape hatch: `responsive.mobile.flexDirection: 'row'`
  keeps a row horizontal on phones.
- Inline `style` stays only for transient editor state (dnd transform, live margin-drag preview).
- Values are sanitized on output: CSS property whitelist; strip `;{}<>` from values.

### Render paths
- `BuilderElement` (editor) and a new lean **`SiteRenderer`** (public: no dnd-kit, no editor controls; framer-motion only
  when a node has animation; hls.js lazy-imported) share the same element markup and the compiled CSS.
- The public page drops the `!important` mobile block. It adds a mobile hamburger nav, removes fake footer data, and
  removes the `background-attachment: fixed` iOS bug.

## 3. Work breakdown (file-disjoint agents)

| Agent | Owns (only these files) | Deliverables |
|---|---|---|
| **A: Responsive engine + live site** | `edit/types.ts`, `edit/BuilderElement.tsx`, `edit/_components/elements/**`, new `edit/responsive-styles.ts` (+ unit test in `apps/frontend/tests/unit/`), `app/sites/**` | R1–R7, P1, P2, P5, D2 (footer), D3 (resolver: React `cache()`, env-only base list, 3s timeout, parallel/first-success). Export `SITE_ROOT_CLASS` / `<ResponsiveStyles nodes>` for the editor canvas. |
| **B: Backend + AI** | `packages/domains/advertising/src/websites/**`, `apps/backend/src/api/v1/advertising/websites/**`, `packages/domains/ai/src/builders/website-ai-builder.service.ts`, `generateWebsite`/`patchWebsite` in `apps/backend/src/api/v1/ai/ai.controller.ts` | S1–S3 (`findFirst/updateMany/deleteMany` with `{id, companyId}`, companyId from `req.user`), D1 (create v2 element-tree seed that actually renders, no fake contact data), A1 (real LLM generation emitting the ElementNode schema incl. `responsive` and `hiddenOn`, validated; typed `AI_NOT_CONFIGURED`; deduct credits only on success; no canned fallback on LLM failure). Rebuild packages to `dist/`. |
| **C: Editor UX** | `edit/page.tsx`, `edit/SettingsSidebar.tsx`, `edit/PropertyPanel.tsx`, `edit/_components/properties/**`, `edit/ElementFactory.ts`, other `edit/*Modal.tsx` | U1–U6, P3, P4, D1 (editor-side v1→v2 migration maps legacy types to real element trees via ElementFactory), D3 (beforeunload uses the api client base, no localhost literal). Device-aware editing: in tablet/mobile mode PropertyPanel writes `responsive.<bp>.<key>`, shows an override badge and reset, and offers "Hide on this device". Wrap the canvas in the site container root from Agent A. History capped at 100 entries. |

**Integration (lead, after agents finish):** typecheck the frontend and touched packages, run unit tests, check that the
editor mobile frame and a real 375px viewport render the same, and update this doc's status.

## 4. Status (2026-10-02, uncommitted)
- [x] A: Responsive engine + live site. `edit/responsive-styles.ts` (container queries, `getEffectiveStyle`, `<ResponsiveStyles>`),
  server-rendered `sites/**/SiteElement.tsx`, `SiteMobileNav.tsx`, resolver uses `cache()`, env-only bases, 3s timeout.
- [x] B: Backend + AI. Tenant-scoped WebsitesService (`companyId` first arg), v2 `default-config.ts`, LLM generation +
  `sanitizeGeneratedWebsite`, typed errors (`AI_NOT_CONFIGURED` 503, `WEBSITE_NOT_FOUND` 404, `DOMAIN_TAKEN` 409…),
  credits deducted only on success. Templates only via `mode:'template'`.
- [x] C: Editor UX. Device-aware PropertyPanel (`responsive.<bp>.*`, override badges/reset, hiddenOn), Layers tab,
  history cap 100 with path-copy updates, undo toasts, shortcuts, legacy `migrateLegacySection`, dead code removed.
- [x] Integration fixes (lead):
  - AI patches save as a draft (`config` only); the reply tells the user to Publish.
  - CreateWebsiteModal: fixed broken string quoting (the hero badge contained raw code), added `version: 2` (pages were
    being discarded), removed fake email/phone/address, and converts sections to element trees at create time.
  - Editor and live site accept unversioned multi-page configs. The live site migrates legacy sections at render time.
  - Legacy migration with no items yields an empty grid/FAQ, never sample cards or prices.
- Verified: frontend `tsc` 0 errors; jest 20/20; ai sanitizer 11/11; default-config 5/5; advertising+ai packages `tsc`
  clean and rebuilt to dist.
- **Browser-verified 2026-10-02** (local dev, throwaway test company; test site deleted afterwards):
  - Live site at 390/834/1280px: the row stacks only at 390; h1 is 36/41.7/64px; zero horizontal overflow.
    The hamburger appears only below 768px, its links are 44px, and it is opaque (fixed a see-through panel caused by
    the translucent default header colour).
  - Editor phone frame (394px) matches the live phone: same stacking, h1 36px, h3 23.76 vs 23.6px.
  - In Mobile view, a font-size edit saved as `responsive.mobile.fontSize` while desktop `style` stayed unchanged.
    The live HTML puts it inside `@container site (max-width:767px)`.
  - Tenant isolation over HTTP: user B gets 404 on GET/PATCH/DELETE/pixels for A's site. In the UI, another company's
    site shows the "Couldn't open this website" screen with retry + back.
- Not verified: floating elements on a physical iOS device, and AI generation with a live provider key.
- Known gap: the editor's header shows the nav links in phone view, while the live site shows the hamburger.

### Open decisions / follow-ups
1. The public resolver serves the **draft** `config` when `isPublished` is false (`websites.service.ts` `publicGetWebsite`).
   Should unpublished sites be hidden? That could take down live sites that never pressed Publish, so it needs an owner decision.
2. Websites with `companyId = NULL` (legacy) now return 404 to everyone. They need a data backfill (no migration was run).
3. `ai-chat.service.ts` and `providers/websites.provider.ts` call `compile('website')`; they now surface typed errors when no AI key is set.
4. In tablet/mobile view, PropertyPanel shows explicit overrides only, not the automatic smart mobile defaults.
