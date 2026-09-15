# 180WORKSPACE VIDEO ENGINE: IMPLEMENTATION GAPS & ROADMAP
**Status:** Actionable Implementation Plan  
**Target:** From Monorepo Baseline to Autonomous Production Release  

---

## 1. Concrete Implementation Gaps

| Area | Current State in Monorepo | Required Target State | Implementation Gap |
| :--- | :--- | :--- | :--- |
| **Desktop Application** | None (only Android Capacitor in `apps/frontend`) | `apps/desktop-editor` running on Tauri v2 with React 19 + Vite | Scaffold `apps/desktop-editor` with Tauri v2 CLI and setup Turborepo wiring |
| **Rust Native Engine** | None | `native/video-engine-core` with crates for Demuxing, Timeline, wgpu, and Render | Initialize Rust workspace with `engine-core`, `engine-timeline`, `engine-media`, `engine-gpu` |
| **Edit IR Schema** | Generic document models | `packages/video-contracts` with strict TypeScript & Rust Serde schemas | Define OpenTimelineIO-compatible AST in shared contract package |
| **Media Extraction** | Server-side `fluent-ffmpeg` | Local client-side Whisper.cpp, Librosa RMS energy, and MediaPipe tracking | Embed ONNX runtime and lightweight audio feature extractors in Rust core |
| **AI Creative Director** | AI builder services for text/forms | `packages/domains/ai/src/builders/video-ai-director.service.ts` | Implement micro-prompt JSON generator translating telemetry into Edit IR |
| **Smart Stream Splicer** | Standard FFmpeg transcode | LosslessCut smart stream-copy algorithm for untouched regions | Implement segment analysis and FFmpeg concat demuxer engine |
| **Web Studio Hub** | None | `apps/frontend/.../video-studio/page.tsx` with project dashboard & deep linker | Add Web UI island checking `useSubscription()` and emitting `workspace180://` |

---

## 2. Milestone Execution Roadmap

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ SPRINT 0: Architecture Forensics & ADR Formulation (COMPLETE)                               │
│ • Codebase Audit, Architecture Map, Reuse Matrix, Technical Risks, Implementation Gaps.     │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ SPRINT 1: The Headless CLI Vertical Slice (Weeks 1–2)                                       │
│ • Initialize `packages/video-contracts` (Edit IR and Command Schemas).                     │
│ • Build `native/video-engine-core` minimal CLI:                                             │
│   `cargo run -- input.mp4 --probe --cut 0-5 --export output.mp4`                            │
│ • Implement LosslessCut smart stream-copy baseline.                                         │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ SPRINT 2: Deterministic Telemetry & AI Director Gateway (Weeks 3–4)                         │
│ • Add local audio RMS energy and silence detector in Rust core.                             │
│ • Add `VideoAIDirectorService` in `@workspace/ai` with Gemini 2.0 Flash schema enforcement. │
│ • Connect Pexels & Freesound asset retrieval API workers.                                   │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ SPRINT 3: Tauri v2 Desktop Editor & WebGPU Viewport (Weeks 5–7)                             │
│ • Scaffold `apps/desktop-editor` (Tauri v2 + React 19 + Tailwind).                          │
│ • Implement wgpu / PixiJS live preview viewport with Recordly-inspired spring camera zoom.  │
│ • Build virtualized multi-track timeline UI with clip drag, split, and trimming.            │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ SPRINT 4: Conversational AI Director & Kinetic Motion (Weeks 8–9)                           │
│ • Integrate `UniversalAIDrawer` in desktop for conversational timeline adjustments.         │
│ • Add Motion Canvas–inspired kinetic typography & karaoke caption bouncy shaders.           │
│ • Implement the Autonomous Video Critic & Validator loop.                                   │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ SPRINT 5: 180workspace Cloud Integration & Release Packaging (Weeks 10–12)                  │
│ • Add `workspace180://` custom deep-link URI handler.                                       │
│ • Connect subscription entitlement checks via `useSubscription()`.                          │
│ • Multi-platform CI/CD builds for Windows (.msi) and macOS (.dmg).                         │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```
