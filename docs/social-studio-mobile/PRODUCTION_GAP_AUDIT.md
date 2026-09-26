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
