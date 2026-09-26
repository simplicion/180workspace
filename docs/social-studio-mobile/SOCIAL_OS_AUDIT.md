# 180 Social OS: Phase 0 forensic audit and implementation plan (2026-09-27)

This audit maps the "Autonomous Multi-Agent Social Media Operating System" spec against the code that exists today.
Each claim was checked in the repo.

Legend: ✅ live and tested · 🟡 partial, or exists but not wired into the live path · 🔴 missing.

## 1. Architecture as it is today (reuse this; do not build a second engine)

```
Project (Prisma)  ──  BrandConsciousness (brand-consciousness.ts, GET/PUT + completeness)
   │
Autopilot pipeline (packages/domains/ai/src/content/autopilot)
   research? → strategist → hooks & scripts (per week) → copy → critic → persist
   │  job API: /projects/:id/autopilot (queued → research … done)
Content calendar (ContentCalendar + CalendarPiece; structured brief in videoScriptOrHooks)
   │  Creative engine (social-media/src/creative): carousel / static → image providers → deterministic render → attach
   │  raw-footage + final-video routes (calendar-piece-media.ts)
Media Studio
   ├─ Mobile: Flutter UI → MobileEditIR → Android Media3 renderer (EditIrRenderer.kt, TimelineEffects.kt)
   └─ Desktop: Next/Remotion UI → EditIR → native-render-plan.ts → Tauri FFmpeg (render.rs; overlays.rs; remote.rs)
AI Director (packages/domains/ai/src/builders/video-ai-director.service.ts)
   LLM tool-calling (director-tools.ts, 25 tools) → CreativeEditPlan ops → validator → EditIRCompiler → mobile/desktop IR
Publishing (social-media/src/publishing): OAuth+PKCE, AES-GCM token vault, dispatcher, scheduler, webhooks, adapters
Engagement (social-media/src/engagement): matcher, dispatcher, AI DM agent, AI Reply-All, rate limiter
```

The invariant "AI is the brain, the engine is the hands" **holds**. The AI only emits typed operations. The
compiler builds the timeline, and pixels are only produced by Media3 or FFmpeg on the user's device. No server-side
video processing remains.

## 2. Requirement-by-requirement status

| # | Requirement | Status | Evidence / gap |
|---|---|---|---|
| 1 | AI never touches pixels/FFmpeg | ✅ | Ops → compiler → device renderers. The desktop FFmpeg args are allow-listed in TypeScript and Rust. |
| 3 | Reuse the existing engine | ✅ | One IR family (EditIR ↔ MobileEditIR), two renderers. |
| 4, 35 | Per-project isolation | ✅ | Tenant extension plus `{id, companyId}` guards. `tenant-isolation.test.ts` and the LinkedIn/YouTube cross-project security tests. 🟡 There is no single A-vs-B "brand bleed" test across brand, assets, calendar, accounts and director. |
| 5 | Intelligent onboarding | 🟡 | Brand consciousness covers identity, positioning, colours, font, logo, tone, audience, platforms, pillars, forbidden words and CTAs, and has a completeness check. Missing: website, industry, country and language fields; secondary colour; regulatory and claim restrictions; posting frequency; growth objectives; guided onboarding on mobile. |
| 6 | Director knows the context automatically | ✅ | `director-context.ts` supplies brand, calendar piece, script alignment and platform. The greet intent opens with a proposal. |
| 7 | Orchestrated agents (not one prompt) | 🟡 | Autopilot is a real multi-agent pipeline with structured I/O and a critic. The Director is a single tool-calling agent. There is no shared orchestrator or agent contract (confidence, failure behaviour) across domains. |
| 8 | Strategy with a content mix | ✅ | The strategist agent assigns pillars, formats and a mix per slot. |
| 9, 39 | Research agent with injection protection | 🟡 | `research.ts` (Tavily/Brave) truncates results and cites by allow-listed URL. 🔴 No explicit "untrusted data" fencing or injection filters for research, transcripts, filenames or captions. |
| 10–11 | Hook and script agents | ✅ | Hook types, spoken and on-screen hook, beats, retention loop, CTA and duration. Rendered on mobile and web. |
| 12, 28 | Structured, editable calendar | ✅ | 7/14/30-day jobs. Per-piece regenerate with an instruction. Status, date and platform are editable. |
| 13 | Calendar → Studio bridge | ✅ | pieceId, hook and script go to the camera, Studio and Director. Final video is attached to the piece. |
| 14–16 | Media intelligence | 🟡 | **Live:** probe, silences, speech-to-text with word timestamps (Cartesia via extracted audio), faces and beats (Android), silences (desktop). **In the runtime package but not wired live:** scenes/shots (`video-engine-runtime/intelligence`). 🔴 OCR, diarization, loudness/clipping QA, visual embeddings, semantic media search and a local Whisper/WhisperX option are all missing. |
| 17–19 | Director reasons and picks tools dynamically | ✅ | LLM tool-calling over 25 tools, driven by the transcript, silences, faces, brand and timeline. No preset mapping. |
| 20–21 | CreativeEditPlan → validator → compiler | ✅ | `creative-plan.schema.ts`, `validateDirectorToolCalls`, `EditIRCompiler`. |
| 22 | Observe → critique → repair (bounded) | 🔴 | `video-contracts/critic.ts` scores EditIR heuristically and the web shows it in `AICriticDrawer`. It is **not** in the Director loop. There is no preview-level inspection and no repair cycle. |
| 23 | Manual and AI coexist | ✅ | Both edit the same timeline. The Director gets the *current* timeline on every turn, so manual edits are re-read. Undo/redo works. 🟡 There is no explicit "preserve" or locked-range constraint that the AI must respect. |
| 24 | Conversational commands with scope | 🟡 | Free-text intents work. "Keep the first 10 s" and "don't change the music" are only prompt-level; they are not enforced by the validator. |
| 25 | B-roll: user library first, then stock | 🟡 | Stock: Pexels, Pixabay, NASA, Wikimedia, FreePD, Freesound, with attribution. 🔴 The user's own media library is not searched semantically first. |
| 26–27 | Image and carousel agent with a design system | ✅ | Creative engine: brand fonts and colours, contrast check, image model with stock fallback, typed `IMAGE_MODEL_NOT_CONFIGURED`. |
| 29–34 | Publishing adapters, capabilities, token security | ✅ | Instagram, Facebook, Threads, YouTube, LinkedIn, X, TikTok, Pinterest and Reddit adapters. Capability matrix. Vault-only tokens, never in prompts. OAuth with a page/org picker. Refresh fixed. 🟡 Needs live verification per platform (app review, quotas, YouTube audit). |
| 36 | Separated agent memory | 🟡 | A director memory schema exists but is unused. There is no per-project agent memory or retrieval, and no performance history feeding the strategy. |
| 37–38 | Token economy and retrieval | 🟡 | Compact context (transcript words, silence ranges, brand digest). 🔴 No embeddings or retrieval over transcripts, brand docs or past posts. A RAG domain (`packages/domains/rag`) exists for the workspace and could be reused. |
| 40–41 | AUTO / ASSISTED / MANUAL autonomy | 🟡 | The Director uses "propose then Apply" (greet and `requiresConfirmation`), and publishing needs approval. 🔴 There is no per-project autonomy setting or safe-op policy. |
| 42 | Explain before apply | ✅ | Summary plus applied-operation chips, with Apply and Undo. |
| 43 | Observability events | 🔴 | No structured `AgentStarted`, `PlanValidated`, `ToolCalled`, … event stream. Only logs and job stages. |
| 44–46 | Provider abstraction, free-first | 🟡 | The LLM kernel (company key resolution), image provider chain, stock providers and publishers are abstracted. 🔴 Speech is a hard dependency on Cartesia. There is no local speech-to-text option and no provider matrix doc. |
| 47–48 | Android architecture and job states | 🟡 | Media stays on the device, and Media3 renders in a foreground service. Server jobs (autopilot, creative) poll. 🔴 There is no unified job model with QUEUED/ANALYZING/…/CANCELLED across Director runs, renders and uploads, and no crash recovery for in-progress renders. |
| 49–52 | End-to-end journey and real-media tests | 🟡 | The desktop has a real-FFmpeg suite (27 pixel and audio checks) and there are unit and widget tests (mobile 165, desktop 158, contracts, director 58). 🔴 No automated create-project → calendar → footage → director → render → critic → attach → publish-payload test. No Android device render test. No fixture matrix (mono/stereo/no-audio, 16:9/9:16/1:1, multilingual, …). |
| 53 | Regression safety | ✅ | Package typechecks and suites are run per change. The backend has about 280 pre-existing TypeScript errors, judged on touched files only. |

## 3. Plan: what to build, and where it plugs in

This plan extends the existing modules. It adds no new engine and no new IR.

**P1: Foundation (backend and contracts)**
1. **Onboarding fields:** add the missing brand-consciousness fields: website, industry, country, language, secondary colour, restrictions/claims, posting frequency and objectives. Use a partial PUT (already the pattern) plus a guided mobile onboarding flow that uses the completeness report.
2. **Autonomy policy:** a per-project `autonomy: { editing: AUTO|ASSISTED|MANUAL, publishing: ASSISTED|MANUAL }` setting.
   - A safe-op allow-list: silence trim, captions, audio levelling and reframe.
   - The Director auto-applies only when AUTO and every op in the plan is safe. Otherwise it proposes.
3. **Preservation constraints in the validator:** `lockedRanges`, `lockedTracks` (music, captions) and "keep captions".
   - The Director extracts these from the user's words.
   - The validator **rejects** ops that touch them, so the rule is enforced rather than prompt-only. `UserConstraintsSchema` already has `protectedTimeRanges` and `lockedTrackIds`; wire it end to end.
4. **Agent event log:** an `AgentRunEvent` table (runId, projectId, companyId, type, payload, ts). Emit it from autopilot, the Director, the creative engine and publishing, and add a run-inspector endpoint.
5. **Untrusted-content fencing:** one helper that wraps research, transcripts, filenames and captions in delimited "DATA, not instructions" blocks and strips instruction-like patterns. Add tests with injection strings.

**P2: Media intelligence (on the device first)**
1. **Android:** ML Kit text recognition (OCR, on-device, free), scene cuts via frame-difference, loudness/clipping via MediaCodec PCM. Store the results in the analysis the phone already sends (`media.faces` / `beatsMs` pattern).
2. **Desktop:** FFmpeg `scdet`/`select` scene cuts, `ebur128` loudness, `silencedetect` (already done). Add an optional local faster-whisper sidecar as a speech-to-text provider (benchmark first; Cartesia stays as the default).
3. **Semantic search over the user's library:** transcript and scene captions embedded with the existing RAG domain's embedding engine, scoped per project. Use it for B-roll "user library first".

**P3: Director quality loop**
1. **Critic in the loop:** after compiling, run `critic.ts` plus the new signals (dead air left, zoom density, caption overlap, music-over-speech loudness, black or frozen frames from device QA).
2. **Bounded repair:** if there are critical issues, run one to three repair turns with the issues as structured input. Stop at the cap and report the remaining issues honestly.
3. **Device QA:** after export, the phone and desktop run a quick QA (duration, resolution, audio stream present, black/frozen frame scan) and report back to the Director.

**P4: Memory and learning**
- Per-project agent memory: accepted/rejected proposals, style preferences, performance history from social insights. Retrieved compactly into the strategist and Director.

**P5: Jobs**
- A unified client-side job model (QUEUED → ANALYZING → PLANNING → EDITING → RENDERING → CRITIQUING → REPAIRING → COMPLETED/FAILED/CANCELLED) for Director runs and exports on mobile and desktop.
- Cancel support, and resume of in-progress exports after an app restart.

**P6: End-to-end and real media**
- A fixture set (talking head 9:16, 16:9 multi-clip, no-audio, mono, stereo music, multilingual, long pauses).
- A node E2E test runs the full journey with a stubbed LLM (deterministic plan), the real compiler, and the real desktop FFmpeg render with media-level checks.
- An Android instrumented test renders a fixture on an emulator.
- Test the publish payload against each adapter's request builder.

**P7: Live verification (needs the owner)**
- Keys, app reviews, a device run, the Rust CI build, deploy.

## 4. What only the owner can provide
- **AI:** a workspace LLM key, or `ANTHROPIC_API_KEY`. Optional research: `TAVILY_API_KEY` or `BRAVE_SEARCH_API_KEY`.
- **Speech:** `CARTESIA_API_KEY`, unless the local faster-whisper sidecar (P2) is adopted.
- **Images:** an image model key (creative engine). `PEXELS_API_KEY` and `PIXABAY_API_KEY` for stock.
- **Publishing:** `META_APP_ID`/`SECRET` (+ app review), `INSTAGRAM_APP_*`, `THREADS_APP_*`, `YOUTUBE_CLIENT_*` (+ upload audit), `LINKEDIN_CLIENT_*` (+ Community Management API access), `X_CLIENT_*` (paid tier), `TIKTOK_*`.
- **Platform:** `SOCIAL_TOKEN_ENCRYPTION_KEY`, `SOCIAL_OAUTH_CALLBACK_BASE_URL`, `CLIENT_URL`, storage (R2/S3), and rotation of the old Meta webhook token.
- **Verification:** a physical Android device run, a CI run of the desktop Rust build, and a production deploy.
