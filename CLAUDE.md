# 180 Workspace — project guide for Claude

Monorepo (pnpm 9 + turbo, Node ≥20, Windows dev box, Git Bash). Multi-tenant SaaS: CRM, HR, finance, projects,
**180 Social Media Manager** (+ AI content calendar, carousels, publishing, 180 Engagement) and **180 Media Studio**
(AI Director video editing). Owner works in bursts; expect long autonomous sessions. Read this first, then only the
docs relevant to the task.

## Non-negotiable rules
- **No hardcoded secrets**, not even as fallbacks (`process.env.X || "literal"` is forbidden). Read env, fail loudly.
- **No fake data / fake success** in production paths (no invented metrics, canned AI output, simulated publish,
  placeholder URLs). Missing provider/key → typed error (`AI_NOT_CONFIGURED`, `PUBLISH_NOT_CONFIGURED`, …).
- **Tenant isolation on every query**: scope by `companyId` (and `projectId`). The Prisma tenant extension in
  `packages/db/src/index.ts` only auto-scopes findFirst/findMany/updateMany/deleteMany/count/aggregate/groupBy —
  `findUnique`/`update`/`delete` by id are NOT scoped; use `findFirst/updateMany/deleteMany` with `{id, companyId}`.
  `companyId` comes only from `req.user` — never headers/body/query.
- **AI never generates video pixels.** AI plans operations → deterministic compiler (`packages/video-contracts`) →
  renderer on the user's device (Android Media3 engine / desktop Tauri FFmpeg). Media processing is never server-side
  or in the browser (desktop-only rule; browsers get a download prompt).
- Minimal, idiomatic changes; don't rewrite working code. Don't revert/stash others' uncommitted work (other agents
  and the owner's other coding tools edit this repo concurrently). Commit only when asked.
- UI must follow `.agents/rules/*` (read the relevant file when doing UI): Media Studio dark palette, skeletons not
  spinners, empty states with an action, errors with retry + second recovery path, 44px targets, shared components.

## Where things live
| Area | Path |
|---|---|
| Backend (Express) | `apps/backend` — routes `src/api/v1/**`, mounts `src/routes/index.routes.ts`, auth `src/system-configs/middleware/auth` |
| Web app (Next.js) | `apps/frontend` — social: `app/(platform)/(social-media-management-app)`, studio: `app/(platform)/(media-editor-app)/media-editor` (`tauri-bridge.ts`, `MediaStudioWorkspace.tsx`) |
| Desktop app | `apps/desktop-app` (Tauri, native FFmpeg render) |
| Android/Flutter app | `apps/social-studio-mobile` (see below) |
| Social domain | `packages/domains/social-media/src` — brand-consciousness.ts, content-calendar, calendar-piece-media, creative/ (carousels+image models), publishing/ (oauth, token-vault, publishers, scheduler, webhooks), engagement/ (matcher, dispatcher, AI agent, AI reply-all), social-insights |
| AI domain | `packages/domains/ai/src` — kernel/ (provider + company AI key resolution), builders/video-ai-director.service.ts (director), content/autopilot/* (multi-agent calendar) |
| Video contracts | `packages/video-contracts/src` — edit-ir schema/compiler, mobile-edit-ir.ts, director-tools.ts, plan-expander.ts, music-catalog.ts |
| Video runtime | `packages/video-engine-runtime` — intelligence modules, stock sourcing tools, FFmpeg helpers, edge tests |
| DB | `packages/db/prisma/schema.prisma` + `migrations/` (never run migrations against shared DBs) |

### Flutter app (`apps/social-studio-mobile`)
- Flutter SDK: `/c/Users/saavi/flutter_sdk/bin`. Riverpod + go_router. Routes: `lib/core/routing/app_router.dart` +
  `lib/features/shell/extra_routes.dart`. API: `lib/core/network/social_api_client.dart` (SocialApi), `api_client.dart`.
- Studio: `lib/features/studio/*` (timeline_ops.dart = pure manual-edit ops; studio_controller.dart; director_panel;
  export_sheet). Timeline model `lib/core/native_engine/edit_ir.dart` must round-trip every server field (`sources`,
  non-null music `duck`, rotation/flip, watermark).
- Android engine: `android/app/src/main/kotlin/com/workspace180/socialmanager/mediaengine/*`. **applicationId stays
  `com.workspace180.social_studio_mobile`** (Play Store); Kotlin package is `socialmanager`, so manifest uses
  fully-qualified class names and `R` is `com.workspace180.social_studio_mobile.R`. Channel: `com.workspace180.socialmanager/media_engine`.
- Tests: `test/` incl. `test/support/{fake_backend,fixtures,app_harness}.dart` for section tests. iOS has no native
  engine yet (Studio gated "Android-only").

## Commands (verified)
- Package typecheck: `npx tsc --noEmit -p packages/<pkg>`; **rebuild after changes** `npx tsc -p packages/<pkg>` —
  backend imports workspace packages from `dist/`.
- Backend typecheck: `npx tsc --noEmit -p apps/backend/tsconfig.json --moduleResolution node10` (≈280 pre-existing
  errors; judge only touched files).
- Node tests: `npx tsx --test --test-force-exit <file>` (Windows: files using undici fetch may crash at exit with
  `UV_HANDLE_CLOSING` — harness issue, prefer `node:http` in tests). No vitest/jest in most packages.
- Director tests: `npx tsx --test packages/domains/ai/tests/video-director.test.ts`.
- Video edge tests: `cd packages/video-engine-runtime && npx tsx src/tests/run-all-edge-tests.ts` (26/28 need live keys).
- Flutter: `flutter analyze && flutter test` (must stay green); Kotlin: `cd android && ./gradlew :app:compileDebugKotlin -q`;
  APK: `flutter build apk --debug`.

## Key docs (read on demand, don't preload)
`docs/social-studio-mobile/`: PRODUCTION_GAP_AUDIT.md (current status + phased plan — **start here**),
AUTONOMOUS_MULTI_AGENT_PLAN.md, AI_DIRECTOR_CONTRACT.md, BRAND_CONSCIOUSNESS_API.md, BACKEND_LOCAL.md
(local run + test users), FEATURE_PARITY.md (large), FREE_MEDIA_SOURCES.md, PUBLISHING.md (if present).

## Working efficiently (owner's usage limits are tight)
- Check `git status`/`git log -5` and PRODUCTION_GAP_AUDIT.md before planning; don't re-audit what's documented.
- Prefer doing work directly. Spawn subagents only for truly parallel, file-disjoint work; give them precise file
  ownership and ask for concise reports. Resume stopped agents with SendMessage instead of re-launching.
- Use targeted `grep`/`sed -n` over reading whole large files; keep test output to summaries (`| tail`).
- After finishing a chunk, update PRODUCTION_GAP_AUDIT.md status so the next session starts from it.
