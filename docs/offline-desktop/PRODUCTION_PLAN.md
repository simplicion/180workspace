# 180 Workspace: desktop app and offline support, production plan

Living document. Status legend used throughout:

| Mark | Meaning |
|---|---|
| ✅ | Implemented **and exercised by a test that was actually run** (test named) |
| 🟡 | Implemented, but **not yet exercised** (needs a real browser, OS, Rust build, or production deploy) |
| ⬜ | **Not implemented.** Planned; phase and reason given |

Nothing in this document claims more than that. The first Rust compile, the first production build and the first real-browser run are all still ahead.

## 1. Product decisions (from the product owner)

1. **One desktop app for the whole platform**, not one per feature.
2. **All media processing (FFmpeg, editing, GPU, local files) is desktop-only.** Browsers show a "download the app" screen.
3. **Offline screens promote the app.** An offline browser user is told the desktop app is what makes the platform usable offline.

## 2. What exists now

| Area | State |
|---|---|
| Sync API `POST /sync/push`, `GET /sync/pull` (tasks, projects, clients, leads, leave requests) | ✅ |
| Client outbox, coalescing, temp-id remap, engine, conflict UI | ✅ |
| Offline reads: policy-driven HTTP cache across 8 modules, local task query, overlay of offline edits on cached lists | ✅ |
| Offline availability table for every module (§10), sensitive data never cached | ✅ |
| Browser gate for video editing, offline banner, `offline.html`, service worker, per-module offline screen | ✅ code; 🟡 not seen rendered |
| **Native media pipeline**: timeline → FFmpeg plan, allowlist validator, ffprobe parser (§11) | ✅ tested against the real FFmpeg |
| Editor uses it: native import, real probe, native export with progress/cancel, honest fallback | ✅ unit-tested with IPC mocked; 🟡 not run in the real desktop app |
| Tauri desktop shell, secure native commands (pick, probe, transcode, render, cancel) | 🟡 **never compiled** |
| Desktop device tokens (register, renew, revoke, device cap) | ✅ tested; enforcement is **off** until you turn it on |
| `SERVER_VIDEO_PROCESSING` switch (store videos as uploaded, no FFmpeg on the API server) | ✅ tested; default **on** (no change until flipped) |
| Release workflow | 🟡 never run |

### Tests that were run

| Suite | Result | Command |
|---|---|---|
| Backend: sync policy, `/sync/push` (real Express + loopback), device tokens, upload middleware switch | 33/33 | `cd apps/backend && npx tsx --test --test-force-exit src/api/v1/sync/*.test.ts src/api/v1/desktop/*.test.ts src/system-configs/middleware/system/central-upload.test.ts` |
| Frontend unit (sync logic, policies, module table, overlay, render plan + validator, ffprobe parser, desktop client, editor bridge, device token) | 135/135 | `cd apps/frontend && npx jest tests/unit` |
| Frontend integration: real outbox/engine/interceptors on in-memory IndexedDB, v1→v2 migration | 21/21 | needs `fake-indexeddb`, see header of `tests/integration/offline-stack.integration.ts` |
| Frontend integration: render plans run through the **real ffmpeg/ffprobe**, checked by pixel, audio level, size and duration | 9/9 | `cd apps/frontend && npx tsx tests/integration/native-render-plan.integration.ts` |
| Frontend type-check | 0 errors | `npx tsc --noEmit -p tsconfig.json` |
| Rust unit tests (deep links, filter-graph validator against a fixture built by the TypeScript builder, argument builder, progress parser) | written, **not run** | `cargo test --lib` in `apps/desktop-app/src-tauri` |

## 3. Defects found in the existing code, and what was done

| # | Defect | Fix |
|---|---|---|
| 1 | `/sync/batch` returned `applied` for every non-task entity without writing anything; the client then deleted them from the outbox (**silent data loss**) | Removed. Unsupported entities are `rejected` and stay visible |
| 2 | `/sync/batch` used the global Prisma client and bypassed `requireManager` / `requireAccess`: **any employee could create or delete tasks REST forbids**; `/delta` returned every tenant's tasks | Replay goes through the real REST routes with the caller's own token; reads use tenant-scoped `req.prisma` and mirror REST visibility |
| 3 | Any failed write was queued generically, including payments, AI and auth; a fake HTTP 200 was returned; entity id came from `url.split('/').pop()` | Strict allowlist (`queue-policy.ts`); everything else fails with a clear message |
| 4 | `offlineApi` enqueued **before** the request and never removed the mutation on success, so **every online create was replayed a second time** | `offlineApi` is now a thin wrapper; one queueing path |
| 5 | Idempotency was an in-memory `Map` keyed globally | Redis ledger keyed by company + user + id (8-day TTL) |
| 6 | **Offline with an expired access token logged the user out** (any refresh failure wiped tokens); same in two other HTTP clients and RTK | Only a definitive 400/401/403 from the refresh endpoint ends the session |
| 7 | **App start offline was impossible** (`/api/init` failed, `user`/`company` stayed null) | `/api/init` is cached and served offline |
| 8 | `AddEmployeeDrawer` queued the **plaintext password** in IndexedDB | Removed offline support for account create/edit |
| 9 | Batch containing a parent CREATE and a dependent (`projectId: temp_…`) would send the unresolved id, hit a foreign key, be treated as `retry`, and **block the queue forever** | `takeBatch` stops before any mutation referencing an in-batch temp id; failed creates cascade-reject dependents |
| 10 | Hard-coded `NEXTAUTH_SECRET` fallback in `middleware.ts` and `authOptions.ts`. **Confirmed live in production** (§9.1b): a session forged with that public string was accepted | Fallback removed; a missing secret is logged loudly and disables only NextAuth sign-in (not the whole site); the deploy pipeline injects the secret from the repository secret; the Dockerfile literal is gone |
| 11 | Backend `/download/:platform` served a **text file named `.exe/.dmg/.apk`** when the installer was missing; Next's `/api/download/:platform` served the Windows exe for every platform | 404 or redirect to the published release URL |
| 12 | `pnpm dev` at repo root ran `build:windows`, silently compiling and installing an exe | Script removed |

## 4. Architecture

```
Web app (Next.js, client-rendered)  ── same code in browser and desktop
  axios interceptors (lib/api.tsx)
    ├─ GET allowlist  → HTTP cache + local task query  (offline reads)
    ├─ write allowlist → optimistic entity + outbox     (offline writes)
    └─ everything else → fails honestly when offline
  Sync engine (lib/offline/sync-engine.ts)
    push: FIFO, batched, idempotent, one tab at a time, backoff → POST /sync/push
    pull: cursor-based, tenant + permission scoped           ← GET  /sync/pull
Backend
  /sync/push  replays each mutation against the REAL REST route (loopback, caller's bearer token)
              + preflight (row gone? changed since the user started editing?) + Redis idempotency ledger
Desktop shell (Tauri)
  bundled shell page → loads https://app.180workspace.com (works offline via service worker after first launch)
  native commands: pick files, ffprobe, transcode (path allowlist, fixed FFmpeg arguments)
```

Why replay through REST rather than writing rows directly: authorization, validation, plan limits, automations and sockets
then behave **exactly** as online, and sync can never do more than the API allows. Cost: one loopback hop per mutation
(bounded by a 50-mutation / 20 s per-request budget).

## 5. Edge-case matrix

### A. Connectivity

| Case | Handling | Status |
|---|---|---|
| `navigator.onLine` says online but the API is unreachable (captive portal, LAN without internet) | Real reachability from every HTTP response + `/api/health` probe | ✅ interceptor path; 🟡 probe |
| Flapping connection | Backoff with jitter; single drain lock (`navigator.locks`) | ✅ backoff/ordering tests; 🟡 locks in a real browser |
| Request timeout (write may or may not have been applied) | **Not** queued (would risk a duplicate create), not treated as offline | ✅ by design |
| Server 5xx / restart mid-batch | Mutation stays queued, order preserved, later ones blocked, retry safe (ledger + preflight) | ✅ "transient server failure" |
| CORS misconfiguration looks identical to offline | Cannot be distinguished from the browser | ⬜ document; monitor `/api/health` from the client |
| Browser navigation while offline | `offline.html` from service worker | 🟡 needs a production build |
| Desktop: first-ever launch offline | Shell page explains a first online launch is required | 🟡 |
| Desktop: offline after a prior launch | Service worker (desktop mode) caches navigations and RSC payloads | 🟡 **highest-risk unverified item**; needs E2E |

### B. Authentication and session

| Case | Handling | Status |
|---|---|---|
| Access token expired while offline | Stay signed in; nothing wiped | ✅ "401 from push…no tokens wiped" |
| Refresh endpoint 5xx / 429 / unreachable | Stay signed in | ✅ same |
| Refresh token definitively rejected | Sign out; unsynced work **kept** for the same user | ✅ code path; purge test |
| Sign-out with pending changes | Cached server data purged, outbox kept, resumes on same-user sign-in | ✅ "http cache…purge…keeps the outbox" |
| Different user signs in on the same machine | Cannot see or replay the previous user's queue/cache | ✅ "user scoping" |
| User deactivated or role reduced while offline | Server returns 403 → `rejected`, shown with reason | ✅ server; 🟡 UI |
| Company suspended while offline | 402/403 → `rejected` | ✅ mapping; 🟡 wall on next online init |
| `NEXTAUTH_SECRET` missing in production | No default: NextAuth is disabled and the error is logged every minute; the site stays up | ✅ code; 🟡 verify after deploy with the probe in §9.6 |
| Offline session lifetime, screen lock, biometric unlock | ⬜ Phase 5 |
| Refresh token in `localStorage` (XSS-exposed) | ⬜ Phase 3/5: OS keychain on desktop, httpOnly cookie on web |

### C. Data integrity and sync

| Case | Handling | Status |
|---|---|---|
| Same mutation delivered twice (retry, two tabs) | Redis ledger returns first outcome | ✅ "applied exactly once" |
| Redis down | In-process fallback, logged loudly, cross-restart dedupe degraded | 🟡; **production must run Redis** |
| Crash between REST success and ledger write | Small duplicate-create window | ⬜ Phase 1: DB table with unique `(companyId, clientMutationId)` (needs a migration) |
| Two tabs drain concurrently | Web Locks | 🟡 |
| Tab crashed mid-push (`in_flight` forever) | Recovered after 2 min | ✅ |
| Edit of a row deleted by someone else | `conflict: entity_not_found` | ✅ |
| Edit of a row changed by someone else | `conflict: stale_write`; "Keep mine" (force) / "Use theirs" | ✅ (row-level, coarse) |
| Delete of an already-deleted row | Treated as success | ✅ |
| Create then edit offline | Merged into one CREATE | ✅ |
| Create then delete offline | Both cancelled, nothing sent | ✅ |
| Entity referencing another offline-created entity | Temp-id remap; dependency ordering | ✅ |
| Parent CREATE rejected | Dependents cascade-rejected, optimistic row flagged `sync_failed` | ✅ |
| Mutation older than 7 days | Rejected as `expired` (server ledger keeps 8 days) | ✅ logic; 🟡 engine path |
| Very large payload (>256 KB) / batch >5 MB | Rejected with message / chunked | ✅ |
| Batch would outlast proxy timeout | 20 s budget; remainder returned as no-penalty retry | ✅ code; ⬜ not load-tested |
| Two people edit **different fields** of the same row | Currently a false conflict | ⬜ Phase 1.5: field-level guard |
| Task reassigned away from the user | 24 h baseline pull prunes it | ✅ prune logic; 🟡 real server |
| Pull cursor invalid / >200 pages | Reset / prune skipped when incomplete | ✅ code |
| Client clock wrong | Only server timestamps are used for versioning | ✅ by design |
| Attachments / voice notes created offline | Not supported; user is told | ✅ message; ⬜ durable upload queue |
| Bulk endpoints (bulk-delete, bulk-status) offline | Fail with message | ✅ |
| Deals, invoices, notes, attendance, documents, tickets offline writes | Fail honestly (not silently "saved"). Leads and leave requests are supported. | ✅; ⬜ extend the registry entity by entity |
| Reads for entities other than tasks | Screens already visited (policy-driven HTTP cache) with offline edits overlaid | ✅; ⬜ full local query per entity (first-ever visit offline shows nothing) |
| Hard-deleted rows (only 7 of 152 models have `deletedAt`) | Tombstones exist for tasks only | ⬜ Phase 1 |
| Optimistic row shape differs from REST shape | Caller-supplied optimistic object; task defaults applied | ✅ tasks |

### D. Security and privacy

| Case | Handling | Status |
|---|---|---|
| Cross-tenant access through sync | REST replay + tenant-scoped client | ✅ integration tests |
| Sync exceeding REST permissions | Impossible by construction | ✅ "REST authorization failures surface as rejected" |
| Path traversal / SSRF through the loopback hop | Strict path allowlist | ✅ policy tests |
| Credentials queued to disk | Account create/edit not queueable | ✅ |
| Legacy queued rows | Quarantined, never auto-replayed | ✅ migration test |
| Local data unencrypted at rest | ⬜ Phase 5: WebCrypto with a key held in the OS keychain |
| Lost/stolen laptop | ⬜ Phase 5: remote session revocation + wipe-on-next-launch |
| Compromised web origin calling native commands | Capabilities grant only 5 commands; paths only from native pickers; FFmpeg arguments fixed in Rust | 🟡 not compiled |
| Malicious `workspace180://` link | Character allowlist, no `..`, length cap | 🟡 Rust tests written, not run |
| Desktop gate bypassed by faking `window.__TAURI_INTERNALS__` | It is a product gate, not security | ⬜ enforce server-side if it matters commercially |
| Backend media routes (`/render`, `/ai-direct`, `/generate-from-prompt`, `sync-studio-render`) callable from browsers | Require a desktop device token (registered by the desktop app, revocable, max 5 per user); rollout switch `DESKTOP_DEVICE_ENFORCEMENT` off → report → enforce | ✅ tests; enforcement **off** |
| `NEXT_PUBLIC_PEXELS_API_KEY` / `NEXT_PUBLIC_PIXABAY_API_KEY` ship in the browser bundle | ⬜ proxy those calls through the backend |
| FFmpeg is GPLv3 in the bundled Windows binary | ⬜ **legal review before release** |
| Unsigned installers (SmartScreen / Gatekeeper warnings) | ⬜ certificates (§7) |

### E. Desktop shell and distribution

| Case | Handling | Status |
|---|---|---|
| Rust code compiles | Written without a toolchain | 🟡 **expect small fixes on first build** |
| WebView2 missing on Windows | Installer bootstraps it | 🟡 |
| Second launch / deep link while running | Single-instance forwards to the running window | 🟡 |
| Auto-update | ⬜ needs signing key, `tauri-plugin-updater`, update endpoint |
| Web/native version skew | Shell is thin, web updates instantly; IPC has 5 stable commands | ⬜ add a min-version handshake via `engine_info` |
| Intel Macs | ⬜ need x86_64 FFmpeg sidecars |
| Corporate proxy blocks the app origin | Shell reports unreachable | ⬜ proxy settings |
| Uninstall leaves local database | ⬜ document / offer wipe |
| Legacy C# launcher + committed `.exe` files | ⬜ delete after Tauri is verified (hard-coded developer paths) |
| Installer downloads | Env URL or honest 404 | ✅ |

### F. Media (desktop-only)

| Case | Handling | Status |
|---|---|---|
| Browser user opens the editor | Wall with download / open-app buttons | ✅ code; 🟡 not seen rendered |
| Dev bypass flag reaches production | Documented; ⬜ CI guard that fails the build if set |
| Editor export | Native FFmpeg first (video **and audio**); the compatibility canvas renderer (video only) is used only for features the native path cannot render yet, and the user is told why | ✅ plan builder against real FFmpeg; 🟡 in the real app |
| Progress, cancel | Polled progress; cancel stops FFmpeg and deletes the half-written file | ✅ client; 🟡 Rust |
| Disk full / very large files during export | FFmpeg error text is shown; nothing is left behind | 🟡 not tested with a full disk |
| Media survives an app restart | Picked files are remembered in the app data folder and re-allowed at startup (only files that still exist) | 🟡 Rust |
| Media that was moved or deleted (relink UI); `.vproj` save/open through native dialogs | ⬜ |
| Hardware encoders (NVENC / VideoToolbox) | ⬜ (software x264 only; 3 quality presets) |
| Offline AI | Deterministic director is pure TypeScript and can run offline; LLM and Cartesia STT need internet | ⬜ Phase 4 |

### G. Product, UX and operations

| Case | Handling | Status |
|---|---|---|
| Sync indicator shows offline / syncing / conflicts with actions | Implemented | 🟡 not seen rendered |
| Feature flag to switch offline sync off per company | ⬜ not implemented (recommended before rollout) |
| Telemetry for push outcomes / conflicts | ⬜ add Sentry breadcrumbs + counters |
| Accessibility and translation of new strings | ⬜ |
| Load test of `/sync/push` | ⬜ |

## 6. Roadmap for what remains

**Phase 0.5, before any rollout (days)**
1. Run `pnpm --filter frontend build` and click through login, tasks, offline toggle in DevTools.
2. Confirm `NEXTAUTH_SECRET` is set in every environment, including Cloudflare.
3. Add the offline-sync feature flag; ship backend first, then frontend.
4. First `cargo build` / `tauri dev` on a Windows machine; fix API mismatches; run `cargo test --lib`.

**Phase 1 (1 to 2 weeks): breadth**
- DB idempotency table `(companyId, clientMutationId)` unique; drop the crash window.
- Extend the registry entity by entity: clients (done), leads, deals, notes, attendance, leave. Each needs: allowlist entry (both sides), REST path check, local query, tests.
- Field-level stale-write guard. Tombstones for the entities added.
- Durable upload queue for attachments.

**Phase 2 (about 1 week): web/PWA hardening**
- E2E with Playwright `context.setOffline`: boot offline, create/edit/delete, reconnect, conflicts.
- Verify service-worker behaviour on the Cloudflare/OpenNext deployment.

**Phase 3 (1 to 2 weeks): desktop hardening**
- Keychain-backed refresh token, updater, signing, notarization, min-version handshake, remove legacy launcher.

**Phase 4 (2 to 4 weeks): local media**
- Wire the editor to `desktopMedia` (probe, transcode), then timeline render (re-attach `native/video-engine-core` crates), progress/cancel, relink, hardware encode, offline director.
- Retire or gate the server-side FFmpeg routes.

**Phase 5 (about 2 weeks): security**
- Encryption at rest, remote revoke/wipe, offline session policy, load and chaos tests, dashboards.

## 7. Release prerequisites (things only the owner can provide)

| Item | Why |
|---|---|
| `NEXTAUTH_SECRET` in every environment | Auth now fails loudly without it |
| `DESKTOP_DOWNLOAD_URL_WINDOWS/MAC/LINUX` on backend **and** frontend | Otherwise the download route returns 404 |
| Redis in production | Idempotency ledger durability |
| Tauri updater signing key (`pnpm tauri signer generate`) → `TAURI_SIGNING_PRIVATE_KEY(_PASSWORD)` secrets | Signed auto-updates |
| Windows Authenticode certificate; Apple Developer ID + notarization credentials | Avoid OS "unknown publisher" blocks |
| FFmpeg licence decision | GPL compliance or LGPL build |
| Decision: keep or retire server-side FFmpeg endpoints | "Desktop-only media" is a UI gate today |

## 8. Rollout order

1. Deploy **backend** (adds `/sync/push`, `/sync/pull`; removes `/sync/batch`, `/sync/delta`). Old clients that call `/batch` get 404 and fall back to replaying each write through its real REST endpoint (correctly authorized).
2. Deploy **frontend** (IndexedDB v1→v2 migration runs on first open; legacy rows are quarantined, not replayed).
3. Publish desktop installers, then set `DESKTOP_DOWNLOAD_URL_*`.

## 9. Production-readiness audit (2026-09-21)

**Verdict: not production-ready.** The offline sync core is sound and tested, but it is not deployed, the desktop app has never
been built, and the media pipeline still runs mostly outside the desktop app. Everything below was read from live systems
or the code; nothing was changed in production.

### 9.1 What is actually live (verified, read-only)

| Check | Evidence | Result |
|---|---|---|
| Was the work pushed? | `origin/main` = `1346e67` (2026-09-20 15:42Z) = the commit before this work; no other branch or PR contains it | **Not pushed** |
| Production pipeline | Run `35520423932` for `1346e67`: all 5 jobs succeeded, incl. "Deploy All Containers to AWS EC2". Earlier run for `29c7558` **failed** at "Execute Remote SSH Deployment" | Deploys work, but have failed once |
| AWS | Account `857146996319`, `ap-south-1`: **one** `t3.small` (2 vCPU / 2 GB) running, launched 2026-09-20 | Whole stack on one small node |
| Cloudflare R2 | Reachable with the app's S3 credentials; 200+ objects under `general/`; **no `downloads/` prefix** | No installers published |
| Cloudflare account / Pages | `wrangler` is **not logged in** on this machine; edge is Cloudflare (`cf-cache-status: DYNAMIC` on app pages) | Not verifiable by API |
| New web code live? | `app.180workspace.com/offline.html` → 307 to `/login` (old middleware); `/sw.js` → 404 | **Not live** |
| Desktop downloads live | `/api/download/mac` = **175-byte text file** named `.dmg`; `/linux` = 177-byte text named `.AppImage`; `/windows` = 29,696-byte legacy C# installer | **Defect live in production** |
| Backend health | `api.180workspace.com/api/health` → 200 | Up |

### 9.1b Live security finding: production auth secret

A NextAuth session token signed with the **public fallback string that used to be in `middleware.ts` / `authOptions.ts`** was
**accepted by production** (the middleware treated it as a signed-in session and redirected to `/signup`, not `/login`), while a
token signed with the Dockerfile placeholder was rejected. So production's runtime environment did not define
`NEXTAUTH_SECRET`, and the repository fallback was the live signing key. Impact is bounded (the data API validates its own
JWT), but the frontend could be made to believe a forged session.

Fix shipped: the fallback is gone; `production-deploy.yml` now injects `NEXTAUTH_SECRET` from the repository secret when the env
file does not define it; the Dockerfile no longer contains a known value; a missing secret is logged loudly and disables only
NextAuth (Google) sign-in rather than the whole site. **After deploy, re-run the probe (`scripts/probe-forged-session.js`,
reproduced in 9.6) and confirm the forged token is rejected.** Existing NextAuth sessions are invalidated once (users sign in again).

### 9.2 Media processing inventory (against product decision #2)

Categories: **A** editing / transcoding / analysis of user media (must be desktop-only) · **B** microphone/camera capture ·
**C** real-time calls (WebRTC) · **D** cheap upload-time image optimisation · **E** cloud publishing pipelines.

| # | Where | What it does | Runs on | Cat. | Conflicts with the rule? |
|---|---|---|---|---|---|
| 1 | `media-editor` (`tauri-bridge.ts`, `audio-waveform.ts`, Remotion) | Import, preview, **export via canvas + `MediaRecorder`** (WebM) | Browser engine inside the desktop shell | A | **Yes**: no FFmpeg, low fidelity. Native commands exist but are not called |
| 2 | `central-upload.ts` (4 route files) | **Every video upload** (≤ 50 MB held in memory) is ffprobe'd and **transcoded synchronously inside the HTTP request** (360p MP4, or HLS for streaming); images go through `sharp` → WebP | **API server** (the shared `t3.small`) | A + D | **Yes, and a production risk**: CPU starvation, request timeouts, memory pressure, easy DoS |
| 3 | `apps/worker/src/workers/reelWorker.js` | HLS ladder 360/480/720p for Reels, R2 → R2 | Cloud worker container | E | Decision needed (see 9.5) |
| 4 | `POST /media-editor/ai-direct` → `MediaAnalysisService` | Server FFmpeg scene/silence detection + Cartesia transcription of the project file | API server | A | **Yes** |
| 5 | `POST /media-editor/render`, `/video-studio/render`, `social/sync-studio-render` | Server-side render (previous audit: no frontend caller) | API server | A | **Yes**; still callable |
| 6 | `packages/video-engine-runtime` | Prototype engine; imported by the backend | n/a | A | Dead weight; keep out of the API |
| 7 | Voice recorders, meeting, softphone, voice cloning | Mic capture, WebRTC | Browser / desktop | B, C | No: not "processing"; online by nature |
| 8 | `advertising/[id]/edit/page.tsx` (`WebsiteEditorPage`) | Website / landing-page builder: rich-text, YouTube or uploaded-video blocks, logo upload, **Publish**. No export, no transcoding (the earlier match was a React helper named `renderMedia`). Its video *upload* goes through `central-upload.ts` (row 2) | Browser | none | **No.** Not media processing; stays in the browser |

### 9.3 Findings

**P0: blocks release**

| ID | Finding | Evidence |
|---|---|---|
| P0-1 | Work is not pushed; production still serves fake installers (mac/linux) | 9.1 |
| P0-2 | The desktop app has never been compiled; no installer exists to download | No Rust toolchain used yet; no R2/Release asset |
| P0-3 | The video editor does not use native FFmpeg | inventory #1 |
| P0-4 | Synchronous video transcoding in the API request path on a 2 GB node | inventory #2 |
| P0-5 | No offline E2E test and no visual check of the new UI | only unit/integration tests exist |
| P0-6 | No kill switch for offline sync; no staged rollout | not implemented |
| P0-7 | Single point of failure: one `t3.small` runs proxy, frontend, admin, backend and worker; deploys are an SSH script that has already failed once | 9.1 |

**P1: must fix for a credible product**

| ID | Finding |
|---|---|
| P1-1 | Offline writes cover only tasks, projects, clients; reads only tasks + visited screens |
| P1-2 | Row-level (coarse) conflict detection causes false conflicts |
| P1-3 | Idempotency has a small crash window (needs a DB unique key) |
| P1-4 | Local data is unencrypted at rest; refresh token in `localStorage`; no remote wipe |
| P1-5 | Desktop service-worker page caching is unverified (highest-risk piece of desktop offline) |
| P1-6 | No updater, no code signing/notarization; FFmpeg GPLv3 compliance undecided |
| P1-7 | "Desktop-only media" is a UI gate; the server routes remain callable |
| P1-8 | `NEXT_PUBLIC_PEXELS/PIXABAY` keys ship in the browser bundle |

**P2:** telemetry for sync outcomes, accessibility/i18n, Intel Mac sidecars, proxy settings, uninstall/wipe.

### 9.4 Remediation plan (in order)

> **Progress since this audit:** step 4 has its switch (`SERVER_VIDEO_PROCESSING`, default on); step 5 is built for supported timelines (§11); step 6 is built as device tokens (enforcement off). Steps 1, 2, 3 and 7-9 are open.

| Step | Work | Done when |
|---|---|---|
| **1. Ship safely** | Push to a **branch and open a PR** (a push to `main` auto-deploys to production). CI runs `pnpm --filter frontend build`, backend + frontend tests. Merge; deploy backend, then frontend | `curl` shows `/offline.html` 200, `/sw.js` 200, `/api/download/mac` = 404 JSON (not a text file) |
| **2. First real installer** | On Windows: install Rust, `tauri dev`, fix compile errors, `cargo test --lib`, `tauri build`. Tag `desktop-v1.0.0`, publish the release, set `DESKTOP_DOWNLOAD_URL_*` (backend + frontend) | A clean Windows VM installs it, signs in, and opens the workspace; download link works |
| **3. Kill switch** | `OFFLINE_SYNC_ENABLED` (server) + per-company allowlist, read by the client at boot | Turning it off stops queueing/pull without a deploy |
| **4. Stop the bleeding on the API box** | Remove synchronous transcoding from `central-upload.ts`: store the original in R2 and enqueue transcoding on the worker (BullMQ, concurrency 1, memory/CPU limits, duration + size caps); reject video on the request thread | A 50 MB video upload returns in < 2 s; API p95 latency unaffected during a transcode |
| **5. Native media in the editor** | Editor uses `desktopMedia` for import (probe, waveform via FFmpeg), preview proxies, and export (then the full timeline render via the native engine crates). Delete the `MediaRecorder` export. Move `MediaAnalysisService` (scene/silence detection) into a desktop command | With networking disabled: import → edit → export MP4 works; in a browser the wall shows |
| **6. Server enforcement** | Retire `/media-editor/render`, `/video-studio/render`, `sync-studio-render`, and the media parts of `/ai-direct` (return 410), or require a desktop device token issued at desktop sign-in | Browser calls to those routes fail regardless of UI |
| **7. Offline breadth** | Registry entries + local queries for leads, deals, notes, attendance, leave; field-level guard; DB idempotency table; durable attachment queue | Each entity has push/pull/conflict tests |
| **8. Security hardening** | Keychain refresh token, encryption at rest, remote revoke/wipe, offline session policy, updater + signing | Pen-test checklist passes |
| **9. Infrastructure** | Separate worker from API (second instance or ECS), health-checked deploy with automatic rollback, backups | A failed deploy leaves the previous version serving |

### 9.5 Decisions (resolved 2026-09-21)

| # | Question | Decision |
|---|---|---|
| 1 | Reels HLS pipeline (`reelWorker`) | **Stays in the cloud** (publishing to social platforms needs it). It is fed only with files the desktop app has produced; the cloud stores, packages (HLS ladder) and publishes. |
| 2 | Image optimisation (`sharp`) on upload | **Stays on the server** (cheap, bounded: resize to 1920x1080 WebP). Video is different: see step 4. |
| 3 | Server media routes | **Require a desktop device token** (step 6): the desktop app registers a device at sign-in and receives a per-device, revocable, expiring token; `/media-editor/render`, `/video-studio/render`, `sync-studio-render` and the media parts of `/ai-direct` reject requests without it. A device token is entitlement, limit and audit control (revoke a stolen laptop, cap devices per user), **not** proof that the caller is the real app; that needs OS attestation and is out of scope. |
| 4 | Advertising builder export | **Not media processing** (see inventory row 8). Unchanged. |

Rollout of the device token: ship the middleware with enforcement `off`, then `report` (log would-be rejections), then `enforce` once the desktop app that registers devices is published.

### 9.6 Post-deploy verification checklist

```bash
curl -sI https://app.180workspace.com/offline.html | head -1          # expect 200
curl -sI https://app.180workspace.com/sw.js        | head -1          # expect 200, Cache-Control: no-cache
curl -s  https://app.180workspace.com/api/download/mac                # expect JSON 404, never a text file
curl -s  https://api.180workspace.com/api/health                      # expect HTTP 200 with a JSON body
# forged-session probe (exit code 1 if a known-bad secret is still accepted):
node scripts/probe-forged-session.js https://app.180workspace.com
# authenticated (use a test account): POST /api/v1/sync/push with an empty mutations array -> 400; GET /api/v1/sync/pull -> 200
```

## 10. Offline availability by module

Generated from `apps/frontend/lib/offline/module-policy.ts` (the single table that drives caching, the offline screen and this
document). **Works offline** = open saved data and make changes that sync later. **View offline** = open what was saved on
this device. **Needs internet** = an explanation is shown instead of a broken screen. **Desktop app** = runs only in the app.

| Module | Screens | Offline | Changes you can make offline | Notes |
|---|---|---|---|---|
| Dashboard | /dashboard | **View offline** | - | Shows what was saved the last time you were online. |
| Projects & Tasks | /projects, /tasks, /activity, /work-logs | **Works offline** | task (create/update/delete); project (create/update/delete) | Create, edit and delete tasks and projects offline; they sync when you reconnect. |
| CRM & Sales | /clients, /sales | **Works offline** | client (create/update/delete); lead (create/update/delete) | Browse clients and leads; add and edit clients and leads offline. |
| HR | /employees, /hr, /attendance | **View offline** | leave (create/delete) | Browse the team directory and leave records; apply for or cancel leave offline. Payroll stays online. |
| Finance | /finance, /invoices, /bills-and-expenses, /vendors, /wallet | **Needs internet** | n/a | Financial data is not stored on this device until encryption at rest is available. |
| Insights & Reports | /analytics, /reports | **Needs internet** | n/a | Reports are computed live from your data and can include financial figures. |
| Company Hub | /company | **View offline** | - | Shows what was saved the last time you were online. |
| Help & Support | /help-support | **Needs internet** | n/a | Support chat is live and needs a connection. |
| Settings & Profile | /settings, /profile | **Needs internet** | n/a | Settings include billing, integrations and security, so they need a connection. |
| Social Media | /content-calendar, /social-projects, /social-media-assets | **View offline** | - | Browse projects and the content calendar; publishing needs a connection. |
| Social Inbox | /inbox | **Needs internet** | n/a | Messages are live conversations and are not stored on this device. |
| Advertising & Forms | /advertising, /forms | **View offline** | - | Browse your sites and forms; publishing needs a connection. |
| Traffic Director | /traffic-director | **View offline** | - | Browse links; analytics and redirects are served live. |
| Chat, Email & Meetings | /chat, /emails, /meeting | **Needs internet** | n/a | Real-time communication needs a live connection. |
| Voiceforce | /voiceforce | **Needs internet** | n/a | Calling needs a live connection. |
| AI Assistant | /ai | **Needs internet** | n/a | The AI assistant runs in the cloud. |
| Documents & Files | /documents, /document-editor, /document-viewer, /assets, /calendar | **View offline** | - | Open documents and files you have viewed before; editing needs a connection. |
| Video Editing | /media-editor, /video-studio | **Desktop app** | n/a | Video editing runs in the desktop app, including with no internet connection. |

What "offline" means in practice:
- You can open a screen offline **only if you opened it while online before** (there is no first-visit offline yet, except tasks, which are pre-synced).
- Payroll, wallet, invoices, expenses, vaults, integrations, tokens and message inboxes are **never** written to the device. The local database is not encrypted at rest yet; those modules stay online-only until it is.
- Individual employee records (which can carry pay and bank details) are not cached; only the directory list is.
- Attachments, voice notes and file uploads cannot be queued offline; the user is told at the moment they try.

## 11. Native media pipeline (desktop app)

```
Import   native file dialog → real ffprobe metadata (rotation, VFR, audio channels) → asset URL for playback
Export   EditIR → buildNativeRenderPlan → validateRenderSpec → (Rust) validate_spec → ffmpeg sidecar
         progress polled from -progress pipe:1; cancel kills ffmpeg and deletes the partial file
```

**Rendered natively (verified against real FFmpeg 4.1 by pixel, audio level, size and duration):** clip trim; speed 0.25x–4x;
volume; opacity; static scale and position; several overlapping tracks in z-order (main track fitted to canvas width, overlays at
40%); image clips; gaps (black/silent); audio of main-track clips plus every audio track with fade in/out; 16:9, 9:16, 1:1, 4:5;
720p/1080p/4K; any fps 1–120; three quality presets (draft/balanced/high, x264 + AAC).

**Not rendered natively yet.** The plan reports why, and the editor shows the reason and falls back to the compatibility canvas
renderer, which produces **video only (no audio)**: captions, camera zoom events, rotation, crop, animated scale/keyframes, transitions other than cut, clip effects.
Audio ducking is not applied (tracks play at their set volume; the user is told).

**Security model.** Web content can only submit a filter graph, a size/fps and a quality preset. The native side: allowlists filters
(no `movie`, `subtitles`, `drawtext` file options…), checks every input against files picked in the native dialog, checks the
output against the save dialog, builds the command line itself, and grants the web content only 8 IPC commands.

**Things this taught us (now covered by tests):** the previous canvas export produced **silent video**; the previous `probeMedia`
returned the same fabricated metadata for every file; on failure the old exporter produced a text file named like a video; FFmpeg
4.1 aborts on `apad`+`adelay`+`-t`+AAC (worked around with a silent bed mixed into the audio).

**Known limits.** No hardware encoding; moved/deleted media has no relink UI; Intel Macs need their own FFmpeg sidecar; the bundled FFmpeg is GPL.

## 12. Configuration switches added

| Variable | Where | Default | Effect |
|---|---|---|---|
| `DESKTOP_DEVICE_JWT_SECRET` | backend | none (**registration returns 503 until set**, no fallback) | Signs desktop device tokens; at least 32 random characters |
| `DESKTOP_DEVICE_ENFORCEMENT` | backend | `off` | `report` logs what would be rejected; `enforce` rejects media routes without a valid device token |
| `SERVER_VIDEO_PROCESSING` | backend | `on` | `off` stores videos as uploaded (no FFmpeg on the API server); streaming/HLS uploads then answer 422 |
| `DESKTOP_DOWNLOAD_URL_WINDOWS/MAC/LINUX` | backend + frontend | unset (404) | Where the installers are published |
| `NEXT_PUBLIC_ALLOW_BROWSER_MEDIA_EDITOR` | frontend | unset | Development only: lets the editor open in a browser |

Recommended order: set `DESKTOP_DEVICE_JWT_SECRET` → ship the desktop app → `DESKTOP_DEVICE_ENFORCEMENT=report` for a week → `enforce`
→ `SERVER_VIDEO_PROCESSING=off`.
