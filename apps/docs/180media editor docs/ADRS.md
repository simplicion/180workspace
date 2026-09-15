# 180WORKSPACE VIDEO ENGINE: ARCHITECTURE DECISION RECORDS (ADRs 001–014)
**Status:** Approved & Frozen  
**Governing Standard:** 180 Workspace Autonomous Video Production Engine  

---

### [ADR-001] Desktop Application Framework
* **Status:** Accepted
* **Context:** The video editor requires hardware GPU access, direct frame memory buffers, low resource footprint, and zero cloud transcoding costs.
* **Decision:** Adopt **Tauri v2** (Rust backend + OS Webview frontend).
* **Alternatives Considered:** Electron (Chromium + Node.js), Native Qt/C++, Pure Web/Browser.
* **Tradeoffs & Consequences:** Eliminates ~400MB Chromium memory overhead; requires Rust for native capabilities; guarantees native OS window integration.

---

### [ADR-002] Native Core Language & Architecture
* **Status:** Accepted
* **Context:** The media engine, timeline state machine, and render graph require memory safety, high concurrency, and zero-cost FFI to C libraries (FFmpeg).
* **Decision:** Build the core engine as a standalone modular **Rust workspace** (`native/video-engine-core`).
* **Alternatives Considered:** C++20, Go, Node.js N-API.
* **Tradeoffs & Consequences:** Guarantees zero data races across multi-threaded rendering pipelines; direct C ABI compatibility with LibAV.

---

### [ADR-003] Media Ingestion, Demuxing & Decoding Foundation
* **Status:** Accepted
* **Context:** The editor must handle arbitrary codecs (H.264, HEVC, ProRes, AV1, VP9), variable frame rates, and multi-track audio.
* **Decision:** Use **FFmpeg / LibAV** native bindings (`libavcodec`, `libavformat`, `libavfilter`, `libswscale`, `libswresample`).
* **Alternatives Considered:** WebCodecs API, GStreamer, QuickTime SDK.
* **Tradeoffs & Consequences:** Universal format compatibility; requires careful memory management of `AVFrame` and `AVPacket` lifecycles.

---

### [ADR-004] Project File Format & Persistence
* **Status:** Accepted
* **Context:** Projects must be versioned, non-destructive, recoverable after crashes, and human-readable for debugging.
* **Decision:** Adopt a structured directory package **`Project.vproj`** containing a versioned JSON document (`project.json`), SQLite index for cached analysis, and asset proxy directories.
* **Alternatives Considered:** Monolithic binary blob, Single flat JSON file.
* **Tradeoffs & Consequences:** Atomic autosaving via temporary files and rename; fast metadata lookups without parsing gigabytes of source media.

---

### [ADR-005] Timeline Time Representation
* **Status:** Accepted
* **Context:** JavaScript floating-point arithmetic (`f64` seconds) causes accumulated rounding errors, leading to audio/video desynchronization over long timelines.
* **Decision:** Represent all timeline timestamps, durations, and keyframe points using an exact **Rational Timebase** struct: `RationalTime { value: i64, timescale: u32 }`.
* **Alternatives Considered:** Floating point seconds (`f32`/`f64`), Nanosecond integers (`i128`).
* **Tradeoffs & Consequences:** Eliminates drift across arbitrary frame rates (23.976, 29.97, 60fps) and audio sample rates (44.1kHz, 48kHz).

---

### [ADR-006] Render Pipeline Architecture (Render Graph DAG)
* **Status:** Accepted
* **Context:** Effects, camera motions, overlays, and color adjustments require compositing in arbitrary order with partial dirty-region recomputation.
* **Decision:** Implement a **Directed Acyclic Graph (DAG) Render Pipeline** where nodes represent decoders, transforms, shaders, and compositors.
* **Alternatives Considered:** Linear pipeline (clip -> filter -> encoder).
* **Tradeoffs & Consequences:** Enables topological sorting, parallel node execution, and caching of intermediate effect outputs.

---

### [ADR-007] GPU Compositing & Shader Abstraction
* **Status:** Accepted
* **Context:** Real-time 60fps preview and hardware export require cross-platform GPU shaders across Windows (DirectX 12/Vulkan), macOS (Metal), and Linux (Vulkan).
* **Decision:** Adopt **wgpu** (Rust implementation of WebGPU) with WGSL shaders for all 2D transforms, blurs, color grades, and transitions.
* **Alternatives Considered:** OpenGL 3.3, Raw Vulkan/Metal bindings, PixiJS Canvas.
* **Tradeoffs & Consequences:** Write shaders once in WGSL; zero driver divergence across Apple Silicon and NVIDIA/AMD GPUs.

---

### [ADR-008] AI Command Protocol & Deterministic DSL
* **Status:** Accepted
* **Context:** AI models must not directly mutate pixels or project memory arbitrarily.
* **Decision:** Establish a strict, transactional **Edit Intermediate Representation (IR)** and JSON Command Schema. AI produces validated command deltas; the engine validates and executes them.
* **Alternatives Considered:** LLM generates raw FFmpeg scripts; Multimodal LLM re-renders video frames.
* **Tradeoffs & Consequences:** Reduces token cost by 99.9% (< $0.001 per video); guarantees 100% reproducible and undoable edits.

---

### [ADR-009] Universal Object & Attention Tracking Engine
* **Status:** Accepted
* **Context:** The system needs automated camera auto-zooming and reframing for faces, speakers, cursors, and products.
* **Decision:** Generalize cursor tracking into an **Object Attention Engine** with unified `TrackableObject` primitives (`id`, `type`, `bounding_box`, `trajectory`, `confidence`).
* **Alternatives Considered:** Separate ad-hoc trackers for mouse, face, and captions.
* **Tradeoffs & Consequences:** One mathematical camera director crate handles Screen Studio auto-zooms, talking-head podcast framing, and product punch-ins.

---

### [ADR-010] Content-Addressed Cache Architecture
* **Status:** Accepted
* **Context:** Recomputing waveforms, transcripts, scene boundaries, and rendered segments on every change destroys interactive performance.
* **Decision:** Implement a **Content-Addressed Cache** keyed on `hash(source_hash, time_range, effect_params, engine_version)`.
* **Alternatives Considered:** In-memory session cache only.
* **Tradeoffs & Consequences:** Instant project reload; zero redundant AI or decoding computation.

---

### [ADR-011] Sandboxed Extension & Plugin System
* **Status:** Accepted
* **Context:** Third parties and enterprise users will need custom transitions, effects, asset sources, and AI prompts.
* **Decision:** Adopt a **Capability-Based Sandboxed Plugin API** (`@workspace/editor-sdk`) with declared permissions.
* **Alternatives Considered:** Unrestricted native shared libraries (`.dll`/`.so`).
* **Tradeoffs & Consequences:** Prevents rogue plugins from accessing user files or executing arbitrary shell processes.

---

### [ADR-012] OpenTimelineIO (OTIO) Interoperability
* **Status:** Accepted
* **Context:** Users must be able to export timelines to Adobe Premiere, DaVinci Resolve, and Final Cut Pro.
* **Decision:** Implement bidirectional **OTIO Adapters** for import and export while keeping the richer `.vproj` internal schema as primary.
* **Alternatives Considered:** Make OTIO the sole internal project format.
* **Tradeoffs & Consequences:** Broad professional industry compatibility without compromising internal AI, tracking, and shader features.

---

### [ADR-013] Cloud vs. Local Execution Boundary
* **Status:** Accepted
* **Context:** Video transcoding in the cloud is cost-prohibitive, while AI intelligence and asset search require cloud connectivity.
* **Decision:** **Local Compute / Cloud Intelligence Split**: Video decoding, rendering, and caching occur locally on the user's desktop; AI Director reasoning, asset queries, licensing, and sync occur in the 180workspace Cloud.
* **Alternatives Considered:** 100% Cloud SaaS (AWS Fargate rendering) or 100% Offline Desktop.
* **Tradeoffs & Consequences:** Zero cloud rendering server bill; ultra-low subscription price with high gross margins.

---

### [ADR-014] Zero-Trust Security & Input Gatekeeping
* **Status:** Accepted
* **Context:** Desktop applications interacting with cloud AI are vulnerable to prompt injection or malicious JSON execution.
* **Decision:** Treat all AI outputs as **Untrusted External Input**. Enforce schema validation, boundary checks, and capability boundaries before executing any command on the project.
* **Alternatives Considered:** Direct execution of AI generated code.
* **Tradeoffs & Consequences:** Guarantees zero project corruption, zero filesystem escape, and total user data safety.
