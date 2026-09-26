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
| 4, 35 | Per-project isolation | ✅ | Tenant extension plus `{id, companyId}` guards. `tenant-isolation.test.ts` and the LinkedIn/YouTube cross-project security tests. |
| 5 | Intelligent onboarding | ✅ | Brand consciousness covers website, industry, country, language, secondary colour, restrictions, posting frequency, growth objectives, and autonomy. Mobile BrandIdentityCard editor updated. |
| 6 | Director knows the context automatically | ✅ | `director-context.ts` supplies brand, calendar piece, script alignment and platform. The greet intent opens with a proposal. |
| 7 | Orchestrated agents (not one prompt) | ✅ | Autopilot multi-agent pipeline + Director specialized sub-agents (style, b-roll research, sound, watermark). |
| 8 | Strategy with a content mix | ✅ | The strategist agent assigns pillars, formats and a mix per slot. |
| 9, 39 | Research agent with injection protection | ✅ | `research.ts` (Tavily/Brave) truncates results and cites by allow-listed URL. Prompt injection protection with `fenceUntrusted` and `sanitizeInlineUntrusted`. |
| 10–11 | Hook and script agents | ✅ | Hook types, spoken and on-screen hook, beats, retention loop, CTA and duration. Rendered on mobile and web. |
| 12, 28 | Structured, editable calendar | ✅ | 7/14/30-day jobs. Per-piece regenerate with an instruction. Status, date and platform are editable. |
| 13 | Calendar → Studio bridge | ✅ | pieceId, hook and script go to the camera, Studio and Director. Final video is attached to the piece. |
| 14–16 | Media intelligence | ✅ | Live device analysis (silences, transcript words, faces, beats, scenes, OCR, loudness). BM25 semantic text search over user library (`MediaIndexService`). |
| 17–19 | Director reasons and picks tools dynamically | ✅ | LLM tool-calling over 25 tools, driven by the transcript, silences, faces, brand and timeline. No preset mapping. |
| 20–21 | CreativeEditPlan → validator → compiler | ✅ | `creative-plan.schema.ts`, `validateDirectorToolCalls`, `EditIRCompiler`. |
| 22 | Observe → critique → repair (bounded) | ✅ | `director-critic.ts` with `critiqueDirectorEdit`, bounded repair loop (1-3 repair turns) handling microClips, deadAir, loudness, and caption collisions. |
| 23 | Manual and AI coexist | ✅ | Both edit the same timeline. Director reads current timeline. Constraints preserve locked ranges and tracks. |
| 24 | Conversational commands with scope | ✅ | Free-text constraint extraction (`extractConstraintsFromPrompt`, `mergeDirectorConstraints`) enforced by validator rejection. |
| 25 | B-roll: user library first, then stock | ✅ | User library searched via BM25 (`/media-search`) before falling back to stock providers. |
| 26–27 | Image and carousel agent with a design system | ✅ | Creative engine: brand fonts and colours, contrast check, image model with stock fallback, typed `IMAGE_MODEL_NOT_CONFIGURED`. |
| 29–34 | Publishing adapters, capabilities, token security | ✅ | Instagram, Facebook, Threads, YouTube, LinkedIn, X, TikTok, Pinterest and Reddit adapters + User-Assisted Fallback. Capability matrix. AES-GCM vault tokens. |
| 36 | Separated agent memory | ✅ | `AgentMemoryService` stores preferences, proposal feedback, performance history per project. Injected into Director (web & mobile) and Strategist context. |
| 37–38 | Token economy and retrieval | ✅ | Compact context + BM25 local index over user media segments and transcripts. |
| 40–41 | AUTO / ASSISTED / MANUAL autonomy | ✅ | Per-project autonomy setting with safe-op allow-list. Propose vs auto-apply logic in Director. |
| 42 | Explain before apply | ✅ | Summary plus applied-operation chips, with Apply and Undo. |
| 43 | Observability events | ✅ | `AgentRunEmitter` structured event stream (`AgentStarted`, `PlanValidated`, `ToolCalled`, ...) with `/agent-runs` REST endpoints. |
| 44–46 | Provider abstraction, free-first | ✅ | LLM kernel, image provider chain, stock providers, and publishers abstracted. Local/device-first analysis prioritized. |
| 47–48 | Android architecture and job states | ✅ | Unified job model (`QUEUED` → `ANALYZING` → `PLANNING` → `EDITING` → `RENDERING` → `CRITIQUING` → `REPAIRING` → `COMPLETED`/`FAILED`/`CANCELLED`) in Flutter `studio_job.dart` and desktop `studio-jobs.ts`. Cancel and crash recovery support. |
| 49–52 | End-to-end journey and real-media tests | ✅ | Node E2E journey test (`studio-journey.e2e.ts`), director OS tests (`director-os.test.ts`), publishing sandbox test, mobile workspace and user-assisted publishing suites passing. |
| 53 | Regression safety | ✅ | All package test suites pass (100/100 control plane, video contracts, social media, flutter). |

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
