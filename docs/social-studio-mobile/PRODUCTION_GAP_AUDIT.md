# 180 Social Media Manager: Production Gap Audit and Completion Plan

Audited 2026-09-26 against commit `8852feb`, read-only. Three parallel audits covered the AI Director
(web and mobile), brand, calendar, creative and the video bridge, and publishing, app health and
security. The critical findings were re-verified on `8852feb`. The plan below does not rewrite
anything: it finishes, wires up and fixes what already exists.

## 1. Requirement vs codebase

Legend: ✅ done · 🟡 partial · ❌ missing · 🔴 broken

| # | Requirement | Backend | Web | Mobile |
|---|---|---|---|---|
| 1 | Brand consciousness at project creation (type, positioning, tagline, ideology, colours, logo, font, voice, platforms), editable, no invented data | ✅ | ✅ | 🟡 form still saves invented `#6366F1`/`#EC4899`/Inter; no type/positioning/tagline/ideology/bg/text fields; uses the legacy brand-voice endpoint |
| 2 | Autonomous multi-agent calendar (research → strategist → 5-hook scripts → copy → critic), 7/14/30 days, background job | ✅ (17/17 tests) | ❌ still calls the legacy one-shot generator | 🟡 only per-piece regenerate; the generator uses the legacy path |
| 3 | Full teleprompter scripts (spoken hook, on-screen hook, retention loop, CTA, shot notes) | ✅ | 🟡 shows only the legacy script fields | 🔴 the teleprompter shows raw JSON |
| 4 | Realistic image model and brand carousels | ✅ (`creative/*`, 22 tests) | ❌ no UI | ❌ no UI |
| 5 | Calendar day → upload raw video → Edit in Studio → final video attached to the post | 🟡 new piece endpoints ✅; the legacy sync route is cross-tenant 🔴 | 🔴 URL text box only; the export attaches a local file path; the publish button fakes success | 🟡 the export uploads to the post ✅; no raw upload, no piece context, piece endpoints unused |
| 6 | AI Director really edits (understands footage, LLM tool calls, deterministic compile, renders on the user's device, zero AI pixels) | ✅ LLM tool-calling planner, 53/53 tests | 🟡 native FFmpeg export in the desktop app ✅, but no transcript/silences are sent, so the server plans blind | ✅ transcript + silences → LLM → compile → on-device render |
| 7 | Director is brand-conscious (colours, font, caption style, logo watermark, platform aspect) | 🟡 loads brand; `resolveBrandRendering` is unused | 🔴 never sends projectId, so it has no brand context | 🟡 brand captions ✅; watermark is dropped by the Dart model (server and Kotlin done) |
| 8 | Director is script/calendar-aware and opens with a brand-aware proposal ("apply?") | ✅ greet intent, script alignment, `/director-context` | ❌ static greeting | ❌ the client never sends intent or piece ids and rejects an empty prompt |
| 9 | Conversation → proposal → consent → apply → undo; custom follow-ups | ✅ | 🟡 LLM plans auto-apply without confirmation; no history sent; a 15 s timeout silently falls back to keyword edits | ✅ |
| 10 | Tools: silence/filler cuts, captions, zooms, B-roll (Pexels/Pixabay), music with attribution, SFX, transitions, reframe, speed, ducking | 🟡 SFX suggested only, never placed on the timeline | 🟡 no music/SFX resolution | 🟡 transitions approximated; SFX missing |
| 11 | Manual editing on the same timeline as the AI (crop, filters, music, text, trim/split, etc.) | ✅ | ✅ | ✅ (watermark lost on manual edits) |
| 12 | One-click connect for IG/FB/YouTube/LinkedIn/X/TikTok, encrypted tokens | ✅ PKCE, AES-GCM vault, migration | 🔴 the Connect button stores a fake `live_token_*` and says "Connected" | 🟡 authorize works; no page/org selection step (`status=select`) |
| 13 | Real publishing, per-platform status, scheduler that respects approval | ✅ real publishers, lease claims, approval gate (16+ tests) | 🔴 fake-success publish in ContentPieceDrawer | ✅ uses the real endpoint |
| 14 | Each project/client isolated | 🔴 legacy calendar CRUD, `syncVideoFromStudio`, engagement rules and video-studio `companyId` are all spoofable | n/a | n/a |
| 15 | Production quality (no hardcoded secrets, tests green, design system) | 🔴 hardcoded Meta webhook token (`8852feb`) | 🟡 2 TS errors in MediaStudioWorkspace | 🔴 analyze: 3 issues, tests: 7 failing; the new light theme breaks 27 screens |

## 2. Bugs by severity (all verified on `8852feb` unless marked)

### Critical: fix before any deploy
1. **Hardcoded secret.** `packages/domains/social-media/src/publishing/config.ts:103` and
   `.github/workflows/production-deploy.yml:172-174` embed a Meta webhook verify token. Remove the fallback
   (a missing value should return 503), remove the injection from the workflow, and **rotate the value**.
   It is in git history.
2. **Cross-tenant write.** `social-post.service.ts:286` `syncVideoFromStudio` updates any calendar piece
   and post by id alone. Scope it by `companyId`, or retire it in favour of `/calendar-pieces/:id/final-video`.
3. **Cross-tenant read/write/delete of calendars.** `content-calendar.service.ts:30,141,207,216,270` uses
   `findUnique`/`update`/`delete`, which bypass the tenant filter in `packages/db/src/index.ts:181`.
4. **Fake OAuth on web.** `ConnectedAccountsManager.tsx:98-112` stores `live_token_<platform>_<ts>`.
5. **Fake publish success on web.** `ContentPieceDrawer.tsx:92-106` sends a piece id as the post id and
   marks the piece published even when the request fails.

### High
6. `video-studio.controller.ts:9,19,32,58,133`: `companyId` is taken from a header, the body, the query, or
   `"default_company"`. It decides whose AI key and credits are used. Take it from `req.user` only.
7. `engagement-rule.service.ts:8-30`: a rule can reference another tenant's account, post or project and
   auto-DM from it.
8. `publish-dispatcher.ts` `ensureVariants` (~253-262): a post with no account is published to whichever
   active account the query happens to return first.
9. Web Studio export attaches a local path as `finalVideoUrl` (`MediaStudioWorkspace.tsx:957-966`, plus
   TS errors at :193 and :957).
10. Web director sends no transcript, silences, projectId, pieceId, postId or history
    (`tauri-bridge.ts:744-752`). It also swallows errors with `catch {}` after a 15 s timeout and silently
    switches to keyword edits.
11. Mobile watermark is dead end to end: `edit_ir.dart` has no field, `studio_controller.dart` drops it,
    and `media_engine_service.dart` never passes `watermarkPath`.

### Medium
12. Accounts are loaded with `include: { socialAccount: true }`, which leaks the legacy plaintext token
    columns (`engagement-rule.service.ts:67`, `social-inbox.service.ts:47`, `ai-engagement-agent.ts:51`).
    `engagement-dispatcher.ts:95-102` also falls back to plaintext tokens.
13. Engagement models (`schema.prisma:3907`) have no migration, and the deploy never runs
    `prisma migrate deploy`.
14. `token-vault.ts` proactive refresh never actually refreshes (skew window).
15. `POST /accounts/connect` accepts arbitrary tokens from any user. Restrict it to admins or remove it.
16. `social-insights.service.ts:300-309`: stored data is labelled "live", and invented numbers are shown
    for `mock_` accounts.
17. No LLM timeout (`ai-provider.service.ts`, `creative-planner.ts:98,126`).
18. LLM plans auto-apply on web (`MediaStudioWorkspace.tsx:440`, gated on `confirmationDetails`).
19. `/render` accepts a client `outputPath` and renders on the server (breaks the desktop-only rule).
20. Mobile: analyze fails (`integration_test` is missing from `dev_dependencies`). Tests fail on the
    engagement tab Row, the composer's `SwitchListTile` in a coloured Container, and a 24 px inbox overflow
    at 320 dp.
21. Mobile: "Clear cache" deletes the whole temp dir, including in-progress renders and uploads;
    `_loadDevices` swallows errors.
22. Mobile: the new light theme is not tokenised; 27 files use dark constants, so light mode shows dark
    cards and invisible text. `engagement_tab.dart` uses raw colours and emoji (design-system violation).
23. `desktop-device.ts:217-223`: the device cap was changed to LRU eviction. The test fails. Decide which
    behaviour is intended.
24. Mobile brand form invents defaults (`brand_voice_form.dart:35-37`).
25. Mobile teleprompter receives the raw JSON script (`calendar_detail_screen.dart:157,390`).

### Low
26. Invented `09:00` posting time (`autopilot/persistence.ts:24`).
27. Missing docs: `AUTOPILOT_API.md`, `CREATIVE_ENGINE.md`, `PUBLISHING.md`, carousel samples.
28. Many routes return raw `error.message` with a 400 (possible Prisma detail leak).
29. The debug APK is 176 MB. Check that release builds use `--split-per-abi` and tree-shaking.

## 3. Completion plan

Each phase ends with typechecks, all test suites and `flutter analyze/test` green. Fixes go in with
tests. Nothing is rewritten.

### Phase 0: Security and build blockers (first, small)
- Items 1–3, 6–8, 12, 13, 15, 23 plus cross-tenant tests for each.
- Mobile tests and analyze green again (item 20).

### Phase 1: AI Director complete (main focus)
Mobile:
- `greet()` with `intent:"greet"`, projectId, calendarPieceId and postId, called when Studio opens from a
  post or piece. It shows the brand-aware proposal with Apply.
- Watermark: Dart model field, carried through director and manual edits, logo downloaded at export, passed
  as `watermarkPath`, plus a round-trip test.
- Opening from a calendar piece passes the piece id. The export attaches to `/calendar-pieces/:id/final-video`,
  and the raw footage upload goes to `/raw-footage`.

Web:
- `tauri-bridge.ts` sends the local transcript and silences as telemetry, plus projectId, pieceId, postId
  and chat history.
- Timeout of about 90 s, with errors shown to the user. The planner source is visible, and the offline
  keyword fallback is labelled as such.
- A greet call when Studio opens. Confirmation is gated on `requiresConfirmation`.
- Export uploads the MP4 to `/final-video`, and the 2 TS errors are fixed.

Server:
- LLM timeout.
- The style agent uses `resolveBrandRendering`.
- SFX placed on an sfx audio lane (contract, compiler, Android renderer).
- `/render` hardened or removed.

### Phase 2: Clients wired to the finished backends
- **Web:** autopilot start/poll UI (7/14/30 days, progress); a drawer showing spoken hook, on-screen hook,
  beats, retention loop, CTA and shot notes; "Make carousel", with the job polled and slides shown and
  attached; raw-footage file upload; publish via the linked post with an honest error state.
- **Mobile:**
  - Brand-consciousness GET/PUT with every field and no invented defaults.
  - Autopilot job flow.
  - The teleprompter parses the structured script.
  - Carousel generate/view.
  - Piece raw upload and "Edit in Studio".

### Phase 3: Publishing completion
- Real web OAuth (authorize redirect plus a result page), and a page/org selection step on web and mobile.
- Forced token refresh; honest metrics; restricted `/connect`; `PUBLISHING.md`.

### Phase 4: Mobile polish
- Either tokenise colours through `Theme.of(context)` or remove the light theme until it is tokenised.
- Bring the engagement tab onto the design system.
- Scope Clear cache to the app's own cache folder, and give the settings errors a retry.
- Split-per-ABI release build.

### Phase 5: Verification loop, then live
- Full automated suite. A device test on a real Android phone: camera, transcription, AI Director greet,
  apply, manual edit, export with watermark, attach, approve, publish (sandbox accounts).
- The owner provides the keys below, followed by live end-to-end tests per platform and a launch checklist.

## 4. What the owner must provide for live mode

| Area | Items |
|---|---|
| AI | Workspace LLM key (Anthropic recommended) or `ANTHROPIC_API_KEY`; optional `TAVILY_API_KEY` or `BRAVE_SEARCH_API_KEY` for research |
| Images | The image model key chosen in `creative/` (see its provider config), plus `PEXELS_API_KEY` and `PIXABAY_API_KEY` for stock |
| Audio | `CARTESIA_API_KEY` (speech-to-text); optional `FREESOUND_API_KEY` (SFX) |
| Storage | R2/S3 credentials (logos, uploads, final videos) |
| Security | `SOCIAL_TOKEN_ENCRYPTION_KEY` (32 random bytes), a new `META_WEBHOOK_VERIFY_TOKEN`, `META_WEBHOOK_APP_SECRET` |
| Meta (IG + FB) | App ID/secret, Business Verification, App Review for `instagram_content_publish`, `pages_manage_posts`, `pages_read_engagement`, and messaging/comments |
| Google / YouTube | OAuth client ID/secret, verification of the `youtube.upload` scope |
| LinkedIn | Client ID/secret, Community Management API / `w_organization_social` approval |
| X | Client ID/secret on a paid tier that allows posting and media upload |
| TikTok | Client key/secret, Content Posting API audit, domain verification |
| URLs | `SOCIAL_OAUTH_CALLBACK_BASE_URL`, `CLIENT_URL`/`SOCIAL_OAUTH_WEB_ORIGINS`; register `…/api/v1/social-media/accounts/oauth/<platform>/callback` in every developer console |

## 5. Additions (2026-09-26)

### Phase 6: Free media sources and on-device AI tools for the AI Director (in progress)
| Source / tool | Status before | Plan |
|---|---|---|
| Pexels (video, photos) | ✅ integrated | keep; use in ranking |
| Pixabay (video, photos, music, SFX) | ✅ integrated | keep |
| Freesound (SFX, CC0/CC-BY) | ✅ integrated | keep; licence filter |
| Wikimedia Commons | 🟡 music catalogue only | add video, images and audio search (no key) |
| Openverse | 🟡 referenced only | add images and audio (no key, commercial filter) |
| Internet Archive | ❌ | add public-domain archival video and audio (no key) |
| Jamendo | ❌ | add, behind `JAMENDO_CLIENT_ID`; commercial-licence caveat |
| Unsplash | 🟡 referenced only | add photos, behind `UNSPLASH_ACCESS_KEY`, following the API guidelines |
| Free Music Archive | ❌ | skip: the public API is discontinued |
| Face tracking (Google ML Kit, on device) | ❌ | smart 9:16 reframe and zoom centre follow the speaker |
| Beat detection (on device) | ❌ | music beats sent to the director; option to snap cuts to beats |

Attribution flows into the director warnings and the export credit.

### Phase 7: Meta (Instagram / Facebook / Threads) go-live checklist
1. **Deploy.** Production (api.180workspace.com) runs `ed40b0d`, so the OAuth callback and webhook routes
   return 401. Deploy the current `main` after Phase 0 lands.
2. **Rotate the webhook verify token.** The old value is in git history and in a pasted audit. Set a new
   `META_WEBHOOK_VERIFY_TOKEN` in the server `.env`, then enter the same value in the Meta Webhooks
   product. The code no longer has a fallback.
3. **Verify the handshake** with `GET /api/v1/social-media/webhooks/meta?hub.mode=subscribe&hub.verify_token=<new>&hub.challenge=x`.
   It must return `x`.
4. **Enter the Meta dashboard URLs:** privacy, terms, data deletion, deauthorize, and the three OAuth
   callbacks. They are listed in the Meta readiness audit (unchanged).
5. **Smoke test with a tester account:**
   - OAuth login writes a `social_account_credentials` row.
   - A live Reel publish succeeds with `ALLOW_SIMULATED_PUBLISHING=false`.
   - A comment triggers the engagement rule, the reply and the DM, under the rate limit.
   - Deauthorizing sets `reauthRequired`.
6. **App Review.** Record the screencast (connect, schedule a Reel and a carousel, post goes live, inbox
   comment, disconnect/deletion). Request `instagram_business_content_publish`,
   `instagram_business_manage_messages`, `instagram_business_manage_comments`, `pages_manage_posts`,
   `pages_manage_engagement` and `pages_read_engagement`.

## Status: Phase 0 backend (2026-09-26, uncommitted)
Done: items 1 (no verify-token default, deploy fails if missing; **rotate the old value**), 2, 3, 6 (typed 404 via
`SocialDomainError`, `tenant-scope.ts`), 7 (engagement rule refs), 8 (no arbitrary account), 12 (SAFE_ACCOUNT_SELECT,
vault-only tokens), 13 (migration `20260926090000_social_engagement` + `prisma migrate deploy` in the deploy),
15 (`/accounts/connect` admin-only), 19 (`/render` removed), 23 (409 cap restored), 28 for the touched routes
(`social-media/route-errors.ts`). Tests: `packages/domains/social-media/test/tenant-isolation.test.ts`,
`apps/backend/src/api/v1/social-media/tenant-routes.test.ts`.

## 180 Engagement hardening (2026-09-26)
Done: per-account Redis GCRA limiter (`engagement/rate-limiter.ts`, 30/min default, `SOCIAL_ENGAGEMENT_RATE_LIMIT_PER_MIN`, in-memory only outside production) with rate-limited events stored and replayed by the scheduler tick (`EngagementDispatcher.retryDeferred`); capability matrix (`engagement/capabilities.ts`) incl. IG/FB 7-day private reply and one-message-until-reply; real per-platform calls (`platform-actions.ts`, FB + X added), no mock-token fake success in engagement adapter methods; webhook fails closed without secret (503), raw-body only, idempotent on message/comment ids, ignores echoes/self comments; AI agent + Reply All + smart replies use the company AI with brand profile (AI_NOT_CONFIGURED / AI_TIMEOUT, forbidden words, lead once); inbox manual replies now really send; honest platform metrics (live IG/FB/YouTube or labelled stored/unavailable). Migration `20260926160000_social_engagement_hardening`. Tests: `test/engagement-production.test.ts`.
Open: web parity screens (engagement rules / inbox Reply All), Flutter tests for the new sheet states, YouTube Analytics API (uses Data API channel stats), X ingestion (no webhook), legacy `MetaAdapter/LinkedInAdapter/TikTokAdapter/YouTubeAdapter.publish*`/`uploadCaption` still short-circuit on `mock_` tokens.

### Phase 1: mobile AI Director (done 2026-09-26)
- **Greeting.** When Studio opens from a calendar piece or post, it now asks the server for its greeting
  (`intent:"greet"` with projectId, calendarPieceId and postId). The reply is a brand- and script-aware proposal
  that waits for Apply. The old hardcoded local greeting, which used invented colour and font defaults, is removed.
- **Director context on every turn.** Each turn now sends `calendarPieceId` and `postId`.
- **Watermark.** The brand logo watermark now works end to end:
  - the Dart model (`EditIrWatermark`) keeps it through every director turn and manual edit;
  - the logo is downloaded at export and passed to the renderer as `watermarkPath`;
  - if the download fails, the export continues without the logo and shows a warning.
- **Export attach.** A video exported from a calendar piece is attached through
  `POST /calendar-pieces/:id/final-video`, which creates the post if needed. The camera now passes pieceId,
  hook and script through to Studio.
- **Tests.** Greeting and watermark tests added; `flutter test` passes 122/122, analyze is clean.
- **Still open on mobile:** placing SFX on Android (needs the contract `sfx` lane from the web/server agent);
  optional raw-footage upload from the piece sheet.

### Phase 1: web + server AI Director (done 2026-09-26, uncommitted)
- **Server.** Each planner LLM call has a timeout (`AI_DIRECTOR_LLM_TIMEOUT_MS`, default 60000). A timeout raises
  `DirectorTimeoutError` and falls back to the deterministic planner, with `plannerReason` starting `LLM_TIMEOUT:`
  and a warning (item 17). The style agent uses WS1 `resolveBrandRendering()`: `director-context.ts` puts it on
  `DirectorBrandContext.rendering`, and `brandStyleDefaults` uses it for colours, font, caption preset and watermark.
  Every neutral default is named in the warnings and never saved. On a greet turn, SFX suggestions are placed on an
  optional `audio.sfx[]` lane (`MobileSfxSchema`, documented in AI_DIRECTOR_CONTRACT.md §3.6), with credits.
  The web `/ai-direct` now forwards `history`. Tests: 4 new in `video-director.test.ts` (58/58 pass).
- **Web** (`media-editor/services/tauri-bridge.ts`, `components/MediaStudioWorkspace.tsx`, `AIDirectorPanel.tsx`,
  `ExportModal.tsx`):
  - Every turn sends projectId, calendarPieceId, postId and the last 12 chat turns, with a 90 s timeout
    (items 10 and 18).
  - Errors are shown in the chat with Retry and "Use offline rules". The offline rules are labelled
    `plannerSource:"offline"`, and the planner source and reason appear under every reply.
  - The static greeting is replaced by `GET /director-context`, whose Apply runs the suggested prompt.
  - Proposals are gated on `requiresConfirmation`, and a "yes/proceed" reply confirms them.
  - The export is uploaded as a multipart MP4 (with progress) to `/calendar-pieces/:id/final-video`, or to
    `/posts/:id/submit-for-approval`. The file is read from the desktop's asset-protocol URL. If that fails, the
    user can retry or pick the MP4 from disk. `sync-studio-render` is no longer called (item 9).
- **Still open:**
  - Local transcript and silence telemetry. The plumbing is ready (`telemetryFromGraph`), but the desktop app has
    no command for transcription, silences or audio extraction. It needs an `extract_speech_audio` preset (then
    `POST /transcribe`) and `detect_silences`. Until then, no telemetry is sent.
  - The web `compileAST` still runs server-side ffmpeg analysis when `currentEditIR` has a non-placeholder
    `sourcePath` (`video-ai-director.service.ts` ~L136). This breaks the desktop-only rule.
  - The `rawVideoUrl` asset in `MediaStudioWorkspace.tsx` still uses assumed metadata (15 s, 1080x1920).
  - The Android renderer for `audio.sfx`.
- **SFX on mobile (done).** The Dart model keeps `audio.sfx`. Effects follow the footage through cuts, and any
  effect inside a cut is dropped. Export downloads each effect with its credit, and any effect that fails to
  download is left out with a warning. The Android renderer plays each effect as a gapped audio sequence at its
  volume. Tests: 123/123; the Kotlin compiles.

### Phase 1: remaining items (next session)
1. **Desktop transcript for the web director.** The Tauri app has no audio-extract or silence command, so the
   web director still plans without a transcript. Add Rust commands in `apps/desktop-app/src-tauri`: an
   audio-extract preset, then `POST /transcribe`, plus `detect_silences`. `telemetryFromGraph` is already
   wired. Needs cargo (not installed on this machine).
2. **Server-side ffmpeg.** The web `compileAST` still runs ffmpeg on the server when the timeline has a real
   `sourcePath` (`video-ai-director.service.ts` ~136). This breaks the desktop-only rule and should be removed
   once item 1 lands.
3. **Assumed metadata.** `MediaStudioWorkspace.tsx`'s `rawVideoUrl` asset assumes 15 s at 1080x1920. Probe the
   file on the desktop instead.
4. **Export upload unverified.** Upload of desktop exports through `asset.localhost` has not been tested in the
   real Tauri app.

### Phase 1: web director speech analysis + desktop downloads (done 2026-09-26, not yet compiled locally)
- **New desktop commands** (`apps/desktop-app/src-tauri/src/media.rs`), both limited to files the user picked:
  - `detect_silences` runs the bundled ffmpeg `silencedetect` and flushes a trailing silence that runs to the
    end of the file.
  - `extract_audio_for_transcription` returns 16 kHz mono M4A bytes (25 MB cap) and deletes its temp file.
  - Both are registered in `lib.rs`, `build.rs` and `capabilities/main.json`, with Rust unit tests for the
    parser (CI runs `cargo test --lib`).
- **Web director.** `tauri-bridge.ts` now analyses the primary clip before planning: pauses are found locally,
  and the speech audio is sent to `/media-editor/transcribe`. The result is cached per file and sent as telemetry.
  Failures show as a chat warning.
- **Server-side ffmpeg removed.** `video-ai-director.service.ts` no longer runs ffmpeg or transcription on the
  server (desktop-only rule).
- **Downloads.**
  - The release workflow now builds macOS Intel (`macos-13`) in addition to Apple Silicon, Windows and Linux.
  - The download page offers separate Apple Silicon and Intel Mac buttons.
  - The Windows button now uses `/api/download/windows`. It used to point at
    `public/downloads/180Workspace-Setup-x64.exe`, which is a 29 KB placeholder, not the app.
  - `DESKTOP_DOWNLOAD_URL_MAC_INTEL` was added to the env example.
- **To verify:** run the "Desktop App Release" workflow (workflow_dispatch). It compiles the Rust code and runs
  the tests on Windows and macOS, then publishes a draft release.
