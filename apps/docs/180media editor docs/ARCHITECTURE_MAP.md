# 180WORKSPACE VIDEO ENGINE: ARCHITECTURE MAP
**Status:** Master Architectural Topology  
**Target:** Hybrid Local-First Autonomous Production Engine  

---

## 1. Global Topology & Domain Boundaries

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                             180WORKSPACE CLOUD CONTROL PLANE                                │
│                                                                                             │
│  ┌───────────────────────┐   ┌───────────────────────────┐   ┌───────────────────────────┐  │
│  │   apps/frontend       │   │       apps/backend        │   │    packages/domains/ai    │  │
│  │  • Video Project Hub  │   │  • User/License Gate      │   │  • Director Agent Kernel  │  │
│  │  • App Deep-Linker    │   │  • Asset Search Gateway   │   │  • Telemetry Prompting    │  │
│  │  • Subscription Check │   │  • Cloud Sync & Metadata  │   │  • Micro-Token DSL Gen    │  │
│  └───────────┬───────────┘   └─────────────┬─────────────┘   └─────────────┬─────────────┘  │
└──────────────┼─────────────────────────────┼───────────────────────────────┼────────────────┘
               │ Handshake Token             │ Asset Metadata / Queries      │ Edit IR JSON
               │ `workspace180://`           │                               │
═══════════════╪═════════════════════════════╪═══════════════════════════════╪═════════════════
               │                             │                               │
┌──────────────▼─────────────────────────────▼───────────────────────────────▼────────────────┐
│                             DEDICATED DESKTOP APPLICATION                                   │
│                            (Tauri v2 + Rust Core Engine)                                    │
│                                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ FRONTEND PRESENTATION SHELL (React 19 + TypeScript + Vite + Tailwind CSS)            │  │
│  │  • Virtualized Multi-Track Timeline (Adapted from OpenCut UX primitives)              │  │
│  │  • Real-Time 60fps WebGPU / Canvas Preview Viewport                                   │  │
│  │  • Conversational AI Creative Director Chat Drawer (`UniversalAIDrawer` pattern)      │  │
│  │  • Style Presets & Aspect Ratio Switcher (16:9, 9:16 Vertical, 1:1 Square)           │  │
│  └───────────────────────────────────────────┬───────────────────────────────────────────┘  │
│                                              │ Typed IPC (Commands / Events / Metadata)     │
│  ┌───────────────────────────────────────────▼───────────────────────────────────────────┐  │
│  │ RUST NATIVE CORE ENGINE (`native/video-engine-core`)                                  │  │
│  │                                                                                       │  │
│  │  ┌───────────────────────┐ ┌──────────────────────────┐ ┌──────────────────────────┐  │  │
│  │  │   Project Engine      │ │     Timeline Engine      │ │      Command Engine      │  │  │
│  │  │  • Versioned VPROJ    │ │  • Rational Timebase     │ │  • Transactional Undo    │  │  │
│  │  │  • OTIO Adapter       │ │  • Multi-Track State     │ │  • Command Validator     │  │  │
│  │  └───────────┬───────────┘ └────────────┬─────────────┘ └────────────┬─────────────┘  │  │
│  │              │                          │                            │                │  │
│  │              └──────────────────────────┼────────────────────────────┘                │  │
│  │                                         ▼                                             │  │
│  │                            ┌──────────────────────────┐                               │  │
│  │                            │       Render Graph       │                               │  │
│  │                            │  • Node Dependency DAG   │                               │  │
│  │                            │  • Dirty Region Tracker  │                               │  │
│  │                            └────────────┬─────────────┘                               │  │
│  │                                         │                                             │  │
│  │       ┌─────────────────────────────────┼─────────────────────────────────┐           │  │
│  │       ▼                                 ▼                                 ▼           │  │
│  │ ┌───────────┐                     ┌───────────┐                     ┌───────────┐     │  │
│  │ │   MEDIA   │                     │    GPU    │                     │    AI     │     │  │
│  │ │  ENGINE   │                     │ ENGINE    │                     │  ENGINE   │     │  │
│  │ ├───────────┤                     ├───────────┤                     ├───────────┤     │  │
│  │ │ • LibAV   │                     │ • wgpu    │                     │ • Whisper │     │  │
│  │ │ • Demuxer │                     │ • Shaders │                     │ • OpenCV  │     │  │
│  │ │ • Lossless│                     │ • Spring  │                     │ • Media   │     │  │
│  │ │   Splicer │                     │   Camera  │                     │   Pipe    │     │  │
│  │ └─────┬─────┘                     └─────┬─────┘                     └─────┬─────┘     │  │
│  │       │                                 │                                 │           │  │
│  │       └─────────────────────────────────┼─────────────────────────────────┘           │  │
│  │                                         ▼                                             │  │
│  │                        ┌──────────────────────────────────┐                           │  │
│  │                        │     Hardware Encoder Pipeline    │                           │  │
│  │                        │   (NVENC / VideoToolbox / QSV)   │                           │  │
│  │                        └────────────────┬─────────────────┘                           │  │
│  │                                         │                                             │  │
│  │                                         ▼                                             │  │
│  │                                 Final Export MP4                                      │  │
│  └───────────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure & Monorepo Placement

To adhere to 180 Workspace standards, the Video Production capability integrates cleanly without disrupting existing apps:

```
180workspace/
├── apps/
│   ├── desktop-editor/             # NEW: Tauri v2 Desktop Editor Application
│   │   ├── src/                    # React 19 Frontend (Timeline, Viewport, Inspector)
│   │   ├── src-tauri/              # Tauri v2 Rust Wrapper & Native Lifecycle
│   │   ├── package.json
│   │   └── tauri.conf.json
│   └── frontend/app/(platform)/(workspace-tools-app)/video-studio/
│       └── page.tsx                # NEW: Web Hub Entry & Deep Link Launcher
│
├── packages/
│   ├── video-contracts/            # NEW: Shared TypeScript Edit IR, Commands & Schemas
│   │   ├── src/
│   │   │   ├── edit-ir.schema.ts
│   │   │   ├── commands.schema.ts
│   │   │   └── telemetry.schema.ts
│   │   └── package.json
│   └── domains/ai/src/builders/
│       └── video-ai-director.service.ts  # NEW: AI Creative Director service
│
└── native/
    └── video-engine-core/          # NEW: High-performance Rust workspace
        ├── Cargo.toml
        └── crates/
            ├── engine-core/        # Project model, command engine, undo/redo
            ├── engine-timeline/    # Rational timebase, multi-track composition
            ├── engine-media/       # FFmpeg/libav bindings, frame decoders
            ├── engine-render/      # Render graph DAG, stream-copy slicer
            ├── engine-gpu/         # wgpu compositor, shader filters, spring camera
            ├── engine-tracking/    # Object/Face attention & bounding box engine
            └── engine-telemetry/   # Local Whisper.cpp, audio energy & scene analyzer
```

---

## 3. Communication Contracts & Protocols

### A. Deep Link Activation Protocol
* **URI Scheme:** `workspace180://open-editor`
* **Query Parameters:**
  * `projectId`: UUID of existing project or `new`.
  * `token`: Signed JWT token issued by `@workspace/identity`.
  * `companyId`: Multi-tenant organization UUID.
  * `plan`: Subscription tier identifier.

### B. Tauri IPC Command API (Frontend $\leftrightarrow$ Rust Core)
Strictly typed commands over zero-copy memory buffers:
* `cmd_create_project(settings: ProjectSettings) -> ProjectManifest`
* `cmd_import_media(path: string) -> MediaMetadata`
* `cmd_execute_command(command: EditCommand) -> CommandResult`
* `cmd_undo() -> ProjectState`
* `cmd_redo() -> ProjectState`
* `cmd_request_analysis(mediaId: string) -> JobId`
* `cmd_apply_ai_plan(plan: EditIR) -> ValidationReport`
* `cmd_export_video(options: ExportOptions) -> JobId`

### C. Cloud AI Gateway Protocol
1. Desktop Rust core extracts 3 KB compressed telemetry (`events.json`).
2. Client sends payload to `apps/backend/api/ai/video-director`.
3. `VideoAIDirectorService` prompts Gemini 2.0 Flash with JSON schema enforcement.
4. Returns validated `EditIR` containing B-roll queries, camera zoom events, and kinetic caption markers.
