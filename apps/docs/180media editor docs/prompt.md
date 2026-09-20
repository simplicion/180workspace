# AUTONOMOUS VIDEO PRODUCTION ENGINE

## Master Implementation, Architecture & Execution Specification

### Document Status

**Status:** Master Engineering Plan
**Target:** Production-grade desktop video editor + autonomous video production engine
**Primary existing platform:** 180 Workspace
**Desktop framework:** Tauri v2
**Frontend:** React + TypeScript
**Native Core:** Rust
**Media Engine:** FFmpeg/libav
**GPU Compositor:** Rust + GPU abstraction
**Interchange:** OpenTimelineIO adapter
**AI:** Hybrid deterministic intelligence + AI Creative Director
**Primary execution model:** Local-first / desktop-native
**Cloud role:** AI, authentication, billing, asset intelligence, optional sync, product services
**Core principle:** AI decides; deterministic engine executes.

---

# 0. EXECUTIVE DIRECTIVE

Build a production-ready, general-purpose video editing and autonomous video production platform on top of the existing 180 Workspace codebase.

This is NOT a screen-recording editor.

Screen recording is only one supported media acquisition mode.

The product must eventually support:

* talking-head videos
* interviews
* podcasts
* screen recordings
* tutorials
* educational videos
* product demos
* advertisements
* social media videos
* webinars
* presentations
* documentary-style content
* mixed-media projects
* multi-camera content
* images
* audio
* generated assets
* stock assets
* captions
* graphics
* animations
* transitions
* effects
* object tracking
* face tracking
* cursor tracking
* camera reframing
* automatic editing
* AI-directed editing
* manual editing
* programmable editing
* project persistence
* extensions/plugins
* professional export

The application must be architected so that the editing engine can operate independently of the UI.

The final architecture must support:

```text
Manual Editor
AI Editor
Autonomous Editor
Programmatic API
CLI
Batch Processing
Future Cloud Rendering
Future Mobile/Web Clients
```

The desktop application is the primary production environment.

---

# 1. NON-NEGOTIABLE ENGINEERING PRINCIPLES

## 1.1 Do not rewrite the existing 180 Workspace blindly

Before modifying code:

1. inspect the complete repository;
2. map all applications/packages;
3. identify the current frontend;
4. identify backend services;
5. identify existing shared libraries;
6. identify authentication;
7. identify workspace/package management;
8. identify build tooling;
9. identify state management;
10. identify design system;
11. identify API layer;
12. identify storage;
13. identify existing desktop functionality;
14. identify existing AI functionality;
15. identify reusable infrastructure;
16. identify dead/unused code;
17. identify architectural conflicts.

Produce an internal architecture inventory first.

DO NOT immediately create a new application beside the existing application.

Integrate deliberately.

---

# 2. EXISTING CODEBASE IMMIGRATION RULE

The existing 180 Workspace is the host platform.

The video editor should become a new major capability inside it.

Conceptually:

```text
180 WORKSPACE
│
├── Existing Workspace
│
├── Existing Features
│
├── Existing Authentication
│
├── Existing User System
│
├── Existing Billing
│
├── Existing APIs
│
└── Video Production
    │
    ├── Web Entry Point
    └── Desktop Editor
```

The web workspace should NOT attempt to become the full video editor.

When a user selects the video editing feature:

```text
Workspace
    ↓
Video Production
    ↓
Check desktop application
    ↓
If unavailable:
    Download desktop application
    ↓
Launch desktop application
```

The web application may provide:

* projects
* recent projects
* templates
* account
* billing
* AI preferences
* asset libraries
* project metadata
* cloud synchronization
* team collaboration in future

The actual professional editor runs locally.

---

# 3. CORE ARCHITECTURE

Final target:

```text
                        180 WORKSPACE
                              │
                    ┌─────────▼─────────┐
                    │ Cloud Application  │
                    │                   │
                    │ Auth              │
                    │ Billing           │
                    │ AI Gateway        │
                    │ Asset Search      │
                    │ Templates         │
                    │ Optional Sync     │
                    └─────────┬─────────┘
                              │
                            API
                              │
══════════════════════════════╪══════════════════════════════
                              │
                       USER COMPUTER
                              │
                 ┌────────────▼────────────┐
                 │       TAURI APP         │
                 │                         │
                 │ React + TypeScript      │
                 │                         │
                 │ Editor UI               │
                 │ Timeline                │
                 │ Inspector               │
                 │ Media Browser           │
                 │ Preview                 │
                 │ AI Controls             │
                 └────────────┬────────────┘
                              │
                         Typed IPC
                              │
                 ┌────────────▼────────────┐
                 │       RUST CORE         │
                 │                         │
                 │ Project Engine          │
                 │ Timeline Engine         │
                 │ Command Engine          │
                 │ Media Engine            │
                 │ Render Planner          │
                 │ Cache Engine            │
                 │ Analysis Engine         │
                 │ Tracking Engine         │
                 │ Compositor              │
                 │ Export Engine            │
                 └────────────┬────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           │                  │                  │
           ▼                  ▼                  ▼
      MEDIA ENGINE       GPU ENGINE        INTELLIGENCE
           │                  │                  │
        FFmpeg              GPU               CV/ML
        libav*             shaders            Whisper
        codecs             effects             OCR
        demux              compositor          Tracking
        mux                masks               Vision
           │                  │                  │
           └──────────────────┼──────────────────┘
                              │
                         Render Graph
                              │
                              ▼
                          FINAL VIDEO
```

---

# 4. TECHNOLOGY DECISIONS

## Desktop

Use:

```text
Tauri v2
```

Tauri's architecture is appropriate because the frontend can remain a web technology stack while Rust handles privileged/native functionality. Tauri uses OS webviews rather than bundling Chromium and exposes typed Rust commands to the frontend.

## Frontend

Use:

```text
React
TypeScript
Vite
```

Tauri explicitly recommends Vite for SPA frameworks such as React.

## Native Core

Use:

```text
Rust
```

The Rust core owns:

* project state
* timeline
* media
* render graph
* rendering
* caching
* analysis orchestration
* tracking
* native filesystem
* export
* background jobs

Frontend must not become the source of truth for these.

---

# 5. IPC ARCHITECTURE

Do NOT send large media frames through Tauri IPC.

Bad:

```text
Rust
 ↓
frame
 ↓
JSON
 ↓
React
```

Never do this for high-volume media.

Instead:

```text
Rust
 ↓
GPU / shared resource / local media path
 ↓
Preview surface
```

IPC should primarily carry:

```text
commands
metadata
state changes
progress
events
errors
small structured data
```

Tauri itself distinguishes commands from events and provides typed command invocation; its documentation also warns that events are not designed for low-latency/high-throughput data streaming.

---

# 6. PROJECT MODEL

Create a first-class internal project schema.

Example:

```json
{
  "schemaVersion": 1,
  "engineVersion": "0.1.0",

  "project": {
    "id": "...",
    "name": "...",
    "createdAt": "...",
    "updatedAt": "..."
  },

  "settings": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "sampleRate": 48000,
    "colorSpace": "..."
  },

  "assets": [],
  "sequences": [],
  "tracks": [],
  "clips": [],
  "effects": [],
  "transitions": [],
  "animations": [],
  "captions": [],
  "markers": [],

  "analysis": {
    "scenes": [],
    "objects": [],
    "tracks": [],
    "transcript": [],
    "audioEvents": []
  },

  "ai": {
    "style": {},
    "decisions": [],
    "history": []
  },

  "metadata": {}
}
```

This is YOUR project schema.

Do not make OTIO the internal source of truth.

OTIO should be an interoperability layer.

OpenTimelineIO is an editorial interchange API/format supporting clips, tracks, transitions, markers and metadata, while media is externally referenced.

---

# 7. PROJECT PACKAGE

Projects should eventually use a package structure similar to:

```text
Project.vproj/
│
├── project.json
│
├── assets/
│
├── proxies/
│
├── thumbnails/
│
├── waveforms/
│
├── analysis/
│
│   ├── scenes/
│   ├── objects/
│   ├── tracking/
│   ├── transcript/
│   └── audio/
│
├── cache/
│
├── renders/
│
└── metadata/
```

The project references original media instead of duplicating it unnecessarily.

---

# 8. COMMAND ARCHITECTURE

All modifications should go through a command system.

Example:

```text
AddClip
RemoveClip
MoveClip
TrimClip
SplitClip
SetTransform
AddEffect
RemoveEffect
AddTransition
SetCamera
AddCaption
InsertAsset
SetSpeed
SetVolume
CreateTrack
DeleteTrack
ApplyStyle
```

Every command must support:

```text
execute()
undo()
redo()
serialize()
validate()
```

This becomes the foundation of:

* undo
* redo
* AI editing
* collaboration
* history
* automation
* plugins

---

# 9. AI MUST USE COMMANDS

AI must NEVER directly mutate project memory.

Bad:

```text
AI → database mutation
```

Correct:

```text
AI
 ↓
proposed commands
 ↓
schema validation
 ↓
permission validation
 ↓
command engine
 ↓
transaction
 ↓
project
```

Example:

```json
{
  "operation": "add_camera_animation",
  "target": "face_42",
  "start": 12.2,
  "duration": 1.2,
  "scale": 1.18,
  "easing": "easeInOut"
}
```

---

# 10. MEDIA ENGINE

Use FFmpeg/libav as the media foundation.

FFmpeg provides separate libraries for:

* decoding/encoding (`libavcodec`)
* filtering (`libavfilter`)
* demuxing/muxing (`libavformat`)
* device I/O (`libavdevice`)
* utility functions (`libavutil`)
* audio resampling (`libswresample`)
* scaling/color conversion (`libswscale`).

Do not treat FFmpeg merely as a shell command.

Where practical, integrate with the underlying libraries through a carefully designed native media abstraction.

The engine should support:

```text
probe
decode
seek
frame access
audio access
stream information
timebase conversion
encoding
muxing
filtering
hardware acceleration
```

---

# 11. MEDIA ABSTRACTION

Create:

```text
MediaSource
MediaStream
VideoStream
AudioStream
Frame
AudioPacket
VideoPacket
Timecode
TimeRange
MediaMetadata
```

Example:

```rust
struct MediaSource {
    id: MediaId,
    path: PathBuf,
    metadata: MediaMetadata,
    streams: Vec<MediaStream>,
}
```

Do not let FFmpeg-specific structs leak throughout the entire application.

Only the media adapter layer should know the low-level FFmpeg API.

---

# 12. TIMELINE ENGINE

Support:

```text
multiple video tracks
multiple audio tracks
nested sequences
clips
gaps
transitions
markers
speed changes
time remapping
keyframes
effects
masks
compound clips
```

Timeline time must be represented using exact rational/timebase semantics rather than floating-point seconds everywhere.

Avoid:

```text
f32 time
```

Use:

```text
RationalTime
FrameTime
TimeRange
```

to avoid accumulated rounding errors.

---

# 13. RENDER GRAPH

The timeline should compile into a render graph.

Example:

```text
Source
 ↓
Decode
 ↓
Trim
 ↓
Speed
 ↓
Transform
 ↓
Mask
 ↓
Tracking
 ↓
Camera
 ↓
Effects
 ↓
Color
 ↓
Composite
 ↓
Caption
 ↓
Overlay
 ↓
Output
```

The render graph should support:

```text
nodes
edges
dependencies
GPU execution
CPU fallback
cacheability
dirty state
partial recomputation
```

---

# 14. GPU COMPOSITOR

Create a dedicated GPU compositor.

Recommended investigation:

```text
wgpu
```

The compositor should support:

* transforms
* crop
* scale
* rotation
* opacity
* masks
* blur
* shadow
* glow
* color adjustment
* blend modes
* chroma key
* motion blur
* background replacement
* transitions
* text
* shapes
* images
* video layers

Effects should be represented as nodes.

---

# 15. EFFECT SYSTEM

Create:

```text
EffectDefinition
EffectInstance
EffectParameter
EffectGraph
Keyframe
AnimationCurve
```

Every parameter should support:

```text
static value
keyframes
procedural animation
AI-generated values
```

Example:

```json
{
  "effect": "blur",
  "parameters": {
    "radius": {
      "type": "animated",
      "keyframes": [
        {
          "time": 0,
          "value": 0
        },
        {
          "time": 1,
          "value": 25
        }
      ]
    }
  }
}
```

---

# 16. ANIMATION ENGINE

Take architectural lessons from Motion Canvas:

* scene graph
* animation primitives
* easing
* interpolation
* time synchronization
* procedural animation
* 2D graphics

Do not make Motion Canvas your entire video engine.

Create your own animation abstraction.

Support:

```text
linear
easeIn
easeOut
easeInOut
cubic
quartic
spring
bounce
elastic
custom curves
```

---

# 17. CAMERA ENGINE

This is a major differentiator.

Create:

```text
CameraState
CameraKeyframe
CameraTarget
CameraPath
CameraDirector
```

The camera can follow:

```text
face
person
object
cursor
screen region
text
product
hand
custom point
```

Camera operations:

```text
focus
zoom
pullBack
pan
track
follow
reframe
rotate
dolly simulation
```

---

# 18. TRACKING ENGINE

Do NOT build a "cursor tracker."

Build:

# Object Tracking Engine

Objects include:

```text
person
face
hand
body
vehicle
product
phone
screen
cursor
button
text
logo
custom object
```

Every tracked object should produce:

```text
objectId
type
boundingBox
mask
confidence
trajectory
timestamps
```

Example:

```json
{
  "objectId": "face_001",
  "type": "face",
  "trajectory": [
    {
      "time": 0,
      "x": 0.52,
      "y": 0.41,
      "width": 0.18,
      "height": 0.23
    }
  ]
}
```

---

# 19. TRACKING SHOULD BE REUSABLE

Tracking results must be consumed by:

```text
camera
effects
masks
blur
background removal
captions
graphics
object highlighting
AI
```

One tracking system.

Many consumers.

Do not implement separate trackers for:

```text
camera
blur
caption
cursor
```

That creates technical debt.

---

# 20. ANALYSIS ENGINE

The first intelligence layer is deterministic/local.

Analyze:

```text
video metadata
frames
scenes
shot boundaries
faces
objects
motion
cursor
text
OCR
speech
silence
audio peaks
speaker segments
visual saliency
semantic segments
```

Output:

```text
Event Graph
```

---

# 21. EVENT GRAPH

Create a formal event graph.

Example:

```text
00:00
  └── scene_start

00:03
  └── speaker_detected

00:07
  └── emphasis_detected

00:08
  └── face_motion

00:11
  └── topic_change

00:15
  └── product_detected

00:17
  └── visual_change
```

Events should contain:

```text
timestamp
duration
type
confidence
source
semantic importance
related objects
```

---

# 22. AUDIO INTELLIGENCE

Analyze:

```text
speech
silence
pause
sentence boundaries
speaker changes
volume
energy
music
beats
audio peaks
noise
clipping
```

The editor should be able to automatically:

```text
remove silence
compress pauses
detect mistakes
align captions
synchronize cuts
sync animations
sync B-roll
sync transitions
```

---

# 23. TRANSCRIPTION

Create:

```text
Transcript
Word
Sentence
Speaker
Timestamp
Confidence
```

Every word should map to precise time ranges.

This becomes essential for:

* captions
* text search
* semantic editing
* AI editing
* B-roll
* jump cuts
* highlight generation

---

# 24. VISION INTELLIGENCE

Vision analysis should identify:

```text
faces
people
objects
products
screens
logos
text
locations
scene types
actions
visual importance
```

Do not run a huge VLM over every frame.

Use:

```text
sampling
scene detection
keyframe extraction
local CV
embeddings
```

and only escalate difficult decisions to stronger models.

---

# 25. THREE-LEVEL INTELLIGENCE SYSTEM

## LEVEL 1 — Mechanical

No LLM.

```text
CV
audio
OCR
tracking
transcription
scene detection
motion
metadata
```

---

## LEVEL 2 — Editorial

Algorithms + small models.

Determine:

```text
important moments
cut candidates
dead air
shot quality
visual relevance
camera targets
caption placement
B-roll opportunities
pacing
```

---

## LEVEL 3 — Creative Director

LLM/VLM.

Handles:

```text
user intent
style
creative direction
narrative
tone
editing strategy
asset requests
creative transformations
```

---

# 26. AI CREATIVE DIRECTOR

The user can write:

> Make this feel like a premium technology advertisement. Keep the speaker natural. Remove boring pauses. Use subtle camera movement. Add B-roll when AI is mentioned. Keep captions clean.

The AI must NOT produce video.

It produces:

```text
Style Directive
+
Edit Commands
+
Asset Requests
```

---

# 27. AI EDIT DSL

Create a strict schema.

Example:

```json
{
  "version": 1,

  "style": {
    "pacing": "fast",
    "camera": "subtle",
    "captions": "minimal",
    "transitions": "clean"
  },

  "operations": [
    {
      "type": "remove_silence",
      "threshold": 0.45
    },

    {
      "type": "camera_focus",
      "target": "speaker_01",
      "scale": 1.15
    },

    {
      "type": "insert_asset",
      "query": "AI technology abstract",
      "placement": "topic_match"
    }
  ]
}
```

This schema becomes a core product asset.

---

# 28. AI COMMAND VALIDATOR

Every AI command must be validated against:

```text
schema
project state
available assets
timeline
media
permissions
resource limits
```

Invalid commands must be rejected safely.

Never allow the model to execute arbitrary filesystem commands.

---

# 29. AUTONOMOUS VIDEO VALIDATOR

After generating an edit:

```text
RAW
 ↓
ANALYSIS
 ↓
EDIT PLAN
 ↓
PREVIEW RENDER
 ↓
VALIDATOR
```

Validate:

### Technical

* missing media
* invalid timeline
* broken frame
* invalid codec
* audio clipping
* unsupported effect
* invalid timestamps
* export errors

### Visual

* face cropped
* object cropped
* caption collision
* caption outside safe zone
* excessive zoom
* bad transition
* duplicated asset
* black frames
* frozen frame
* poor composition

### Editorial

* excessive cuts
* repetitive visuals
* boring pacing
* poor B-roll
* irrelevant B-roll
* inconsistent style

If failure:

```text
Validator
 ↓
Correction commands
 ↓
Render again
```

---

# 30. RENDER PLANNER

Before rendering:

```text
Timeline
 ↓
Dependency analysis
 ↓
Identify changed regions
 ↓
Identify cache hits
 ↓
Identify stream-copy regions
 ↓
Identify GPU-render regions
 ↓
Generate render plan
```

This is where the LosslessCut principle is applied.

Unchanged media should not be unnecessarily re-encoded.

---

# 31. CACHE ENGINE

Cache:

```text
metadata
thumbnails
waveforms
transcripts
scenes
object detection
tracking
OCR
proxies
effect outputs
render outputs
AI decisions
```

Use content-addressed cache keys.

Concept:

```text
hash(
 sourceHash,
 timeRange,
 effectParameters,
 rendererVersion
)
```

If unchanged:

```text
CACHE HIT
```

Do not recompute.

---

# 32. PROXY ENGINE

Support:

```text
original
proxy 720p
proxy 1080p
optimized media
```

During editing:

```text
proxy
```

During final export:

```text
original
```

Allow user control:

```text
Auto
Proxy
Original
```

---

# 33. LOSSLESS / PARTIAL RENDERING

The engine should distinguish:

```text
unchanged
copyable
GPU-rendered
CPU-rendered
audio-only
```

Example:

```text
00:00–00:20
COPY

00:20–00:31
RENDER

00:31–01:20
COPY
```

This should happen automatically.

---

# 34. AUDIO ENGINE

Support:

```text
volume
gain
fade
crossfade
EQ
compression
normalization
noise reduction
ducking
voice enhancement
music
SFX
multi-track mixing
```

Create:

```text
AudioGraph
```

separate from the video render graph but synchronized by the same timeline.

---

# 35. CAPTION ENGINE

Support:

```text
word-level timing
sentence timing
speaker labels
styles
animations
highlighted words
safe zones
position tracking
face-aware placement
```

Caption placement should understand:

```text
faces
objects
screen UI
existing text
safe areas
```

Never blindly place subtitles at the bottom.

---

# 36. B-ROLL ENGINE

Pipeline:

```text
Transcript
 ↓
Semantic topics
 ↓
B-roll opportunities
 ↓
Asset query
 ↓
Asset retrieval
 ↓
License filtering
 ↓
Visual relevance ranking
 ↓
AI selection
 ↓
Insert
 ↓
Validate
```

---

# 37. ASSET ENGINE

Support:

```text
stock videos
stock images
user media
generated media
SFX
music
logos
icons
templates
```

Every asset must contain:

```text
id
type
duration
resolution
aspectRatio
license
source
tags
embedding
thumbnail
```

---

# 38. ASSET SEARCH SHOULD NOT USE THE LLM FOR EVERYTHING

Correct architecture:

```text
query
 ↓
metadata filter
 ↓
embedding search
 ↓
visual similarity
 ↓
license filter
 ↓
top candidates
 ↓
AI ranking
```

Do not send hundreds of assets to the LLM.

---

# 39. STYLE SYSTEM

Create reusable style presets:

```text
Minimal
Cinematic
Corporate
Educational
Technology
Podcast
Social
Fast
Luxury
Documentary
Gen-Z
Medical
Product Demo
```

But styles must be structured data.

Example:

```json
{
  "zoomAggressiveness": 0.42,
  "cutFrequency": 0.64,
  "captionDensity": 0.72,
  "transitionFrequency": 0.08,
  "brollFrequency": 0.38,
  "motionIntensity": 0.44
}
```

---

# 40. USER PERSONALIZATION

Record user editing preferences.

Example:

```text
Preferred zoom: 1.2x
Preferred caption: minimal
Preferred pacing: medium
Preferred transition: none
Preferred B-roll: moderate
```

After repeated projects, use these preferences to modify AI decisions.

The system should eventually learn:

```text
Creator Editing Grammar
```

---

# 41. MANUAL EDITOR

The AI does NOT replace manual editing.

Provide:

```text
media bin
timeline
preview
inspector
effects
transitions
captions
audio
keyframes
motion
tracking
assets
AI assistant
```

Every manual operation should use the same command system as AI operations.

Therefore:

```text
Human command
       │
       ├─────────┐
       │         │
       ▼         ▼
Manual UI      AI
       │         │
       └────┬────┘
            ▼
      Command Engine
```

One engine.

---

# 42. AI + MANUAL COEXISTENCE

User should be able to say:

> "Make the zoom at 00:12 less aggressive."

AI should modify:

```text
existing camera command
```

rather than regenerating the entire project.

Example:

```text
old scale = 1.42

new scale = 1.18
```

This is essential for usability.

---

# 43. EXTENSION SYSTEM

Design a plugin API.

Support future:

```text
registerEffect()
registerTransition()
registerAnalyzer()
registerTracker()
registerAssetProvider()
registerExporter()
registerImporter()
registerPanel()
registerCommand()
registerAIAction()
registerTemplate()
```

Initially plugins must be sandboxed/capability-controlled.

Tauri's security model explicitly treats frontend and Rust/plugin code as different trust boundaries, with capabilities controlling access. Follow the same principle for your plugin system.

---

# 44. SCREEN RECORDER MODULE

This is NOT the core product.

It is a module.

Architecture:

```text
Screen Capture
     ↓
Media Source
     ↓
Analysis
     ↓
Editor
```

Capture:

```text
screen
window
camera
microphone
system audio
cursor
cursor clicks
keyboard metadata where permitted
```

The cursor data should feed the same object-tracking abstraction.

---

# 45. WEBCAM OVERLAY

Implement:

```text
camera source
shape
position
scale
border
shadow
background
mask
corner radius
```

Future:

```text
background removal
face-aware framing
automatic repositioning
```

---

# 46. FRAME/STYLING ENGINE

Support:

```text
background
gradient
blur
shadow
border
rounded corners
device frames
browser frames
phone frames
laptop frames
custom frames
```

These should be declarative components, not hard-coded UI features.

---

# 47. TRANSITION ENGINE

Create:

```text
TransitionDefinition
TransitionInstance
```

Examples:

```text
cut
crossfade
fade
wipe
slide
zoom
blur
glitch
morph
custom shader
```

Transitions must be GPU-compatible where possible.

---

# 48. EXPORT ENGINE

Support initially:

```text
MP4
H.264
H.265 where licensing/platform permits
AAC
```

Then:

```text
WebM
GIF
image sequence
audio-only
```

Export profiles:

```text
YouTube
YouTube Shorts
Instagram Reels
TikTok
LinkedIn
Presentation
Custom
```

But don't hard-code platform assumptions into the renderer.

Profiles should be data.

---

# 49. EXPORT PIPELINE

```text
Project
 ↓
Resolve original assets
 ↓
Build render graph
 ↓
Validate
 ↓
Optimize
 ↓
Render
 ↓
Encode
 ↓
Mux
 ↓
Verify
 ↓
Output
```

After export:

```text
decode first/last frame
verify duration
verify audio
verify codec
verify dimensions
verify file integrity
```

---

# 50. RENDER VERIFICATION

Never trust the encoder merely because it returned exit code 0.

Perform:

```text
post-export probe
```

Validate:

```text
duration
frame count where available
video stream
audio stream
resolution
fps
codec
container
file size
```

---

# 51. TESTING STRATEGY

You must build tests BEFORE the engine becomes huge.

## Unit tests

For:

```text
time
timeline
commands
undo/redo
keyframes
easing
transforms
render graph
project serialization
AI schema
```

## Integration tests

```text
import
decode
timeline
render
export
project reopen
```

## Golden tests

Keep known input videos and expected outputs.

Example:

```text
fixtures/
    simple-cut.mp4
    zoom.mp4
    captions.mp4
    transitions.mp4
    tracking.mp4
```

Render and compare.

---

# 52. AI TESTING

AI cannot be tested only by checking whether the request succeeded.

Create:

```text
AI instruction
 ↓
expected command properties
```

Example:

Input:

> "Make it vertical."

Expected:

```text
1080x1920
reframe speaker
preserve subject
```

Input:

> "Remove long pauses."

Expected:

```text
silence analysis
timeline gaps removed/compressed
```

---

# 53. AI SAFETY

The AI must not:

```text
delete source files
execute arbitrary shell commands
modify system files
install software
access arbitrary secrets
upload media without authorization
```

The AI gets a restricted capability interface.

---

# 54. PERFORMANCE TARGETS

Define targets early.

### Application startup

Target:

```text
< 2 seconds
```

on a modern desktop after warm cache.

### Timeline interaction

Target:

```text
60 FPS UI
```

where hardware permits.

### Scrubbing

Target:

```text
responsive < 100ms perceived latency
```

with proxy/preview optimization.

### AI

AI should not block UI.

### Rendering

Use all appropriate CPU/GPU resources without freezing UI.

---

# 55. MEMORY MANAGEMENT

Never load an entire 4K video into RAM.

Use:

```text
streaming
frame caches
bounded queues
memory budgets
LRU caches
proxy media
```

The Rust core must own memory-heavy media resources.

---

# 56. BACKGROUND JOB SYSTEM

Create a unified job scheduler.

Jobs:

```text
import
probe
thumbnail
waveform
transcription
scene detection
object detection
tracking
proxy generation
AI planning
asset retrieval
render
export
```

Every job has:

```text
id
priority
state
progress
cancel
pause
resume
error
dependencies
```

---

# 57. JOB PRIORITIES

Example:

```text
P0 = user interaction
P1 = preview
P2 = analysis
P3 = proxy generation
P4 = background indexing
```

Never let background AI analysis destroy interactive timeline performance.

---

# 58. CANCELLATION

Every long-running operation must be cancellable.

Examples:

```text
Cancel export
Cancel analysis
Cancel transcription
Cancel proxy generation
Cancel AI edit
```

No "kill the whole application" approach.

---

# 59. ERROR HANDLING

Every subsystem returns structured errors.

Example:

```rust
enum EngineError {
    MediaNotFound,
    UnsupportedCodec,
    DecodeFailure,
    RenderFailure,
    InvalidTimeline,
    InvalidProject,
    GpuUnavailable,
    EncoderUnavailable,
    AnalysisFailure,
    AiFailure,
    AssetFailure,
}
```

Frontend receives safe human-readable messages.

Logs retain detailed technical context.

---

# 60. OBSERVABILITY

Implement local diagnostic logs.

Include:

```text
engine version
OS
GPU
CPU
memory
project ID
job ID
render ID
error code
duration
```

Do not log raw user video or sensitive media by default.

---

# 61. SECURITY

Tauri capabilities should be narrowly scoped.

Do not expose:

```text
arbitrary filesystem
arbitrary shell
arbitrary process execution
```

to the frontend.

Use explicit commands:

```text
open_project
import_media
save_project
render_preview
export_video
```

rather than generic:

```text
execute_shell(command)
```

---

# 62. CLOUD ARCHITECTURE

Cloud services should be optional for local editing.

Cloud:

```text
authentication
billing
AI
asset search
template marketplace
optional project sync
analytics
license validation
update service
```

Local:

```text
media
timeline
analysis
render
export
cache
```

---

# 63. OFFLINE MODE

The editor should continue functioning when possible without internet.

Offline:

```text
manual editing
local rendering
local effects
local media
local projects
local transcription if model installed
```

Online:

```text
AI Director
asset search
cloud sync
templates
```

---

# 64. AI COST OPTIMIZATION

Never send the entire video to an LLM.

Pipeline:

```text
Video
 ↓
local analysis
 ↓
event graph
 ↓
semantic summary
 ↓
LLM
 ↓
edit plan
```

AI receives compact structured context.

---

# 65. AI ESCALATION MODEL

Use escalating intelligence.

```text
Cheap deterministic method
        ↓
If confidence high
        ↓
DONE

If confidence low
        ↓
small model
        ↓
If still uncertain
        ↓
large model/VLM
```

This should become a fundamental cost-control mechanism.

---

# 66. CONFIDENCE SYSTEM

Every AI/vision decision should have:

```text
confidence
source
model
version
timestamp
```

Example:

```json
{
  "event": "speaker_detected",
  "confidence": 0.97,
  "model": "face-model-v3"
}
```

Low-confidence events should be eligible for escalation.

---

# 67. AI DIRECTOR CONTEXT

The Creative Director should receive:

```text
project metadata
video type
transcript
scene graph
event graph
object graph
tracking
available assets
user style
project history
explicit user instructions
```

Not raw video by default.

---

# 68. AI DIRECTOR OUTPUT

Must be deterministic enough to validate.

Output:

```text
Style
Operations
Asset requests
Camera decisions
Timing decisions
Caption decisions
Audio decisions
```

No arbitrary code.

---

# 69. AI HISTORY

Every AI edit should be stored.

Example:

```text
AI Edit #1
User instruction:
"Make it more cinematic."

Commands:
...

AI Edit #2
User instruction:
"Reduce the zoom."

Commands:
...
```

The user should be able to undo AI operations.

---

# 70. USER COMMAND EXAMPLES

The system should eventually understand:

> Remove all dead air.

> Make this more cinematic.

> Turn this into a 30-second Reel.

> Keep the speaker visible.

> Add B-roll whenever AI is mentioned.

> Make the captions more minimal.

> Make the first 5 seconds stronger.

> Add subtle zooms to important statements.

> Replace the current B-roll.

> Make the video feel less edited.

Each becomes structured commands.

---

# 71. PRODUCT ENTRY FLOW

Workspace:

```text
Video Production
```

User clicks.

If desktop unavailable:

```text
Download Editor
```

After installation:

```text
Open Editor
```

Authentication can be shared through secure handoff/token flow.

Do not require the user to manually log in twice if avoidable.

---

# 72. DESKTOP APP STRUCTURE

Suggested conceptual repository:

```text
apps/
    workspace/
    editor-desktop/

packages/
    ui/
    types/
    api/
    ai-contracts/
    project-schema/

native/
    editor-core/
    media-engine/
    timeline-engine/
    render-engine/
    gpu-compositor/
    tracking-engine/
    analysis-engine/
    audio-engine/
    project-engine/
    cache-engine/
    job-engine/
```

Exact location must be adapted to the existing 180 Workspace structure after inspection.

Do NOT blindly create this exact structure if the workspace already has better conventions.

---

# 73. RUST CRATE BOUNDARIES

Prefer logical crates/modules:

```text
editor-core
project-model
timeline
media
render
compositor
effects
animation
tracking
analysis
audio
cache
jobs
export
ai-contract
```

Keep dependency direction clean.

For example:

```text
project-model
    ↑
timeline
    ↑
render
```

not circular dependencies.

---

# 74. DEPENDENCY RULE

Lower-level modules must not depend on the React application.

Correct:

```text
Rust core
    ↑
Tauri
    ↑
React
```

Not:

```text
Rust
 ↓
React state
 ↓
timeline
```

---

# 75. FRONTEND RESPONSIBILITIES

React handles:

```text
UI
interaction
panels
timeline rendering
inspector
keyboard shortcuts
visual state
user commands
preview controls
```

Rust handles:

```text
authoritative project state
media
timeline semantics
rendering
analysis
jobs
filesystem
native APIs
```

---

# 76. TIMELINE UI

Do not attempt to render every video frame in React.

React represents:

```text
clips
tracks
markers
selection
playhead
keyframes
```

The actual video preview comes from the rendering system.

---

# 77. PREVIEW ARCHITECTURE

Preview should use:

```text
GPU compositor
+
proxy media
+
render cache
```

The preview is not the final export.

Maintain:

```text
preview quality
draft quality
final quality
```

---

# 78. QUALITY LEVELS

```text
Ultra Low
Low
Medium
High
Full
```

Automatically select based on:

```text
resolution
GPU
timeline complexity
playback performance
```

---

# 79. IMPORT PIPELINE

When importing media:

```text
File
 ↓
Hash
 ↓
Probe
 ↓
Validate
 ↓
Generate metadata
 ↓
Generate thumbnail
 ↓
Generate waveform
 ↓
Generate proxy if necessary
 ↓
Add to project
```

Never duplicate the original unless explicitly required.

---

# 80. MEDIA RELINKING

Support:

```text
missing media
relink
search folder
manual relink
automatic hash matching
```

Professional editors need this.

---

# 81. AUTOSAVE

Project should autosave safely.

Use:

```text
transaction
temporary file
fsync
atomic rename
```

Never corrupt the project because the computer loses power.

---

# 82. PROJECT VERSIONING

Every schema change requires:

```text
schemaVersion
migration
```

Example:

```text
v1 → v2
v2 → v3
```

Old projects must remain openable.

---

# 83. BACKWARD COMPATIBILITY

Never change project schema without migration.

Never silently reinterpret timeline semantics.

---

# 84. OTIO

Implement:

```text
exportOTIO()
importOTIO()
```

Do not make OTIO the internal schema.

OTIO is explicitly designed as an editorial interchange format/API, not as an embedded-media project container.

---

# 85. PLUGIN SDK

Eventually publish:

```text
@yourcompany/editor-sdk
```

for TypeScript-side extensions.

Native extensions can come later.

Plugin capabilities:

```text
effects
templates
commands
asset providers
AI tools
panels
importers
exporters
```

---

# 86. DEVELOPMENT PHASES

## PHASE 0 — CODEBASE FORENSICS

Do NOT implement product features.

Agent must:

1. inspect entire 180 Workspace;
2. map repository;
3. map dependencies;
4. map applications;
5. map packages;
6. identify current desktop support;
7. identify existing backend;
8. identify existing AI infrastructure;
9. identify state management;
10. identify build pipeline;
11. identify reusable UI;
12. identify auth;
13. identify API;
14. identify storage;
15. identify tests;
16. identify CI/CD.

Deliver:

```text
CODEBASE_AUDIT.md
ARCHITECTURE_MAP.md
REUSE_MATRIX.md
RISKS.md
MIGRATION_PLAN.md
```

Do not make destructive changes.

---

# 87. PHASE 1 — FOUNDATION

Implement:

```text
Tauri v2 shell
React frontend
Rust core
typed IPC
logging
error system
configuration
job system skeleton
```

Success criteria:

```text
workspace launches desktop app
frontend communicates with Rust
Rust can invoke frontend events
typed commands work
build works on target platforms
```

---

# 88. PHASE 2 — PROJECT CORE

Implement:

```text
project schema
serialization
deserialization
versioning
migration
autosave
undo
redo
commands
```

Success:

```text
Create project
Save project
Close
Reopen
State preserved
Undo
Redo
```

---

# 89. PHASE 3 — MEDIA FOUNDATION

Implement:

```text
media import
FFmpeg probe
metadata
streams
thumbnail
waveform
timebase
frame access
```

Success:

Import:

```text
MP4
MOV
WebM
common audio
images
```

and correctly inspect them.

---

# 90. PHASE 4 — TIMELINE

Implement:

```text
tracks
clips
trim
split
move
delete
resize
selection
playhead
zoom
snap
markers
```

Success:

A human can assemble a basic video.

---

# 91. PHASE 5 — PREVIEW

Implement:

```text
decoder
GPU compositor
preview
play
pause
seek
scrub
```

Success:

Timeline plays smoothly.

---

# 92. PHASE 6 — BASIC EFFECTS

Implement:

```text
transform
scale
position
rotation
opacity
crop
blur
shadow
color
mask
```

All effects must be project-state-driven.

---

# 93. PHASE 7 — ANIMATION

Implement:

```text
keyframes
easing
interpolation
motion paths
camera
```

Success:

User can animate any supported transform.

---

# 94. PHASE 8 — CAMERA ENGINE

Implement:

```text
camera state
camera targets
camera paths
zoom
pan
follow
focus
reframe
```

No AI required yet.

---

# 95. PHASE 9 — TRACKING

Implement:

```text
object detection
tracking
trajectory
confidence
object IDs
```

First support:

```text
face
person
generic object
```

Then:

```text
cursor
text
custom object
```

---

# 96. PHASE 10 — AUDIO

Implement:

```text
waveform
volume
fade
crossfade
normalization
multi-track
audio preview
```

Then:

```text
noise reduction
voice enhancement
ducking
```

---

# 97. PHASE 11 — CAPTIONS

Implement:

```text
transcription
word timestamps
caption tracks
styles
animations
positioning
```

---

# 98. PHASE 12 — AI ANALYSIS

Implement:

```text
scene detection
speech analysis
silence
objects
faces
tracking
OCR
semantic segments
```

Produce:

```text
analysis.json
```

---

# 99. PHASE 13 — EVENT GRAPH

Build:

```text
Event
EventGraph
EventRelationship
SemanticRegion
ImportanceScore
```

This becomes the bridge between media analysis and AI.

---

# 100. PHASE 14 — EDITORIAL ENGINE

Implement deterministic:

```text
silence removal
dead-air compression
shot ranking
camera target selection
caption positioning
B-roll candidate detection
pacing analysis
```

No LLM yet.

---

# 101. PHASE 15 — AI CREATIVE DIRECTOR

Implement:

```text
user prompt
project context
analysis context
style
AI command generation
schema validation
command execution
history
undo
```

First supported requests:

```text
remove silence
make faster
make slower
vertical conversion
focus speaker
add captions
add subtle zoom
change style
```

---

# 102. PHASE 16 — ASSET ENGINE

Implement:

```text
asset provider abstraction
search
metadata
embedding
ranking
license metadata
download
cache
```

Start with approved providers only.

---

# 103. PHASE 17 — AUTONOMOUS EDITING

Implement:

```text
analysis
 ↓
editorial plan
 ↓
AI director
 ↓
commands
 ↓
timeline
 ↓
preview
 ↓
validator
 ↓
correction
 ↓
final render
```

This is the first true autonomous pipeline.

---

# 104. PHASE 18 — RENDER OPTIMIZATION

Implement:

```text
render graph
dirty regions
cache
proxy
partial rendering
stream copy
GPU acceleration
hardware encoder
```

---

# 105. PHASE 19 — EXPORT

Implement:

```text
MP4
H264
AAC
1080p
4K
16:9
9:16
1:1
custom
```

Then expand codecs/profiles.

---

# 106. PHASE 20 — RECORDING

Only now add:

```text
screen
window
webcam
microphone
system audio
cursor
```

Recording becomes another MediaSource.

---

# 107. PHASE 21 — EXTENSIONS

Implement:

```text
plugin manifest
permissions
effect plugins
asset providers
templates
commands
AI actions
```

---

# 108. PHASE 22 — PROFESSIONAL POLISH

Implement:

```text
autosave
crash recovery
media relink
project backup
proxy management
keyboard shortcuts
performance settings
GPU diagnostics
render queue
background export
```

---

# 109. PHASE 23 — 180 WORKSPACE INTEGRATION

Add:

```text
Video Production feature
project launcher
desktop download
desktop detection
deep links
authentication handoff
project sync
billing
account settings
```

The web workspace should never pretend to be the professional editor.

---

# 110. PHASE 24 — PRODUCTION HARDENING

Test:

```text
1GB
5GB
20GB
50GB+
```

media projects.

Test:

```text
1080p
4K
8K
variable frame rate
long GOP
multiple audio tracks
mixed codecs
large timelines
```

Test:

```text
low RAM
integrated GPU
dedicated GPU
older CPU
```

---

# 111. PHASE 25 — RELEASE

Release:

```text
Windows
macOS
Linux
```

in controlled stages.

Start with:

```text
Windows
macOS
```

if those are the primary user platforms.

Linux can follow after core stability.

---

# 112. AGENT EXECUTION PROTOCOL

The Antigravity agent MUST NOT attempt the entire roadmap in one context window.

It must work phase-by-phase.

For each phase:

```text
READ
 ↓
PLAN
 ↓
IMPLEMENT
 ↓
TEST
 ↓
VERIFY
 ↓
DOCUMENT
 ↓
COMMIT
```

---

# 113. AGENT RULE: NEVER GUESS

If the existing codebase contains:

```text
authentication
API
state
UI
storage
```

the agent must inspect and reuse it.

Do not create duplicate systems.

---

# 114. AGENT RULE: SEARCH BEFORE BUILDING

Before implementing any subsystem:

Search the existing repository for:

```text
similar functionality
existing types
existing APIs
existing components
existing dependencies
existing utilities
existing tests
```

Reuse when appropriate.

---

# 115. AGENT RULE: NO MASSIVE REFACTOR WITHOUT JUSTIFICATION

Do not:

```text
delete entire directories
rewrite entire application
replace package manager
replace frontend framework
replace backend architecture
```

unless explicitly justified by:

```text
performance
correctness
security
architecture
maintainability
```

---

# 116. AGENT RULE: EVERY FEATURE NEEDS A CONTRACT

Before implementation:

```text
input
output
errors
state
dependencies
tests
```

must be defined.

---

# 117. AGENT RULE: NO MAGIC

Avoid:

```text
any
unknown everywhere
untyped JSON
global mutable state
arbitrary shell commands
hard-coded paths
hard-coded codecs
hard-coded platform assumptions
```

---

# 118. AGENT RULE: PLATFORM ABSTRACTION

Anything platform-specific goes behind:

```text
trait
interface
adapter
```

Examples:

```text
ScreenCaptureProvider
GpuBackend
HardwareEncoder
FileSystemProvider
NativeWindowProvider
```

---

# 119. AGENT RULE: AI IS UNTRUSTED INPUT

Treat AI output exactly like external input.

Validate:

```text
schema
ranges
IDs
timestamps
permissions
resource limits
```

before execution.

---

# 120. AGENT RULE: RENDERING MUST BE DETERMINISTIC

Given:

```text
project
engine version
assets
parameters
```

the renderer should produce a reproducible result as far as the underlying hardware/codec allows.

---

# 121. AGENT RULE: VERSION EVERYTHING

Version:

```text
project schema
AI command schema
renderer
effect definitions
plugins
cache format
analysis models
```

---

# 122. AGENT RULE: DOCUMENT ARCHITECTURE WHILE BUILDING

Maintain:

```text
docs/
├── architecture/
├── media/
├── timeline/
├── rendering/
├── ai/
├── tracking/
├── plugins/
├── project-format/
├── testing/
└── decisions/
```

Use ADRs for major decisions.

---

# 123. REQUIRED ADRs

Create:

```text
ADR-001 Desktop framework
ADR-002 Native core
ADR-003 Media engine
ADR-004 Project schema
ADR-005 Timeline model
ADR-006 Render graph
ADR-007 GPU compositor
ADR-008 AI command protocol
ADR-009 Tracking architecture
ADR-010 Cache architecture
ADR-011 Plugin architecture
ADR-012 OTIO interoperability
ADR-013 Cloud/local boundary
ADR-014 Security model
```

---

# 124. DEFINITION OF DONE

A feature is NOT complete because:

```text
code compiles
```

It is complete only when:

```text
implemented
tested
documented
error-handled
logged
integrated
performance-checked
cross-platform considered
```

---

# 125. FIRST AGENT TASK

Do NOT build the editor yet.

The first instruction to the Antigravity agent is:

```text
You are the lead engineer responsible for integrating a production-grade autonomous video production engine into the existing 180 Workspace.

DO NOT begin implementation immediately.

First perform complete repository forensics.

Inspect the entire repository and determine:

1. repository structure
2. applications
3. packages
4. frontend framework
5. backend
6. build system
7. package manager
8. workspace configuration
9. state management
10. API architecture
11. authentication
12. database
13. storage
14. existing desktop functionality
15. existing native functionality
16. AI infrastructure
17. existing media functionality
18. existing design system
19. reusable components
20. testing
21. CI/CD
22. deployment
23. security boundaries
24. existing extension/plugin architecture

Do not make destructive changes.

Create:

CODEBASE_AUDIT.md
ARCHITECTURE_MAP.md
REUSE_MATRIX.md
TECHNICAL_RISKS.md
IMPLEMENTATION_GAPS.md

Then propose the exact integration point for:

Tauri v2
React/TypeScript
Rust core
FFmpeg
GPU compositor
project model
timeline
analysis engine
AI director
render engine

Do not assume the repository structure described in this specification exists.

Adapt the specification to the actual repository.

Before implementing each major phase:

1. inspect existing code;
2. identify reusable code;
3. identify conflicts;
4. propose implementation;
5. implement the smallest correct change;
6. run tests;
7. run type checks;
8. run Rust checks;
9. run builds;
10. document the result.

Never replace functioning 180 Workspace functionality merely because a new architecture is preferred.

The final architecture must make the video engine independently testable from the React UI.
```

---

# 126. SECOND AGENT TASK

After the audit:

```text
Create the Architecture Decision Records.

Do not implement the full editor.

Establish and document:

1. Tauri boundary
2. React boundary
3. Rust core boundary
4. project model
5. command model
6. timeline model
7. media abstraction
8. render graph
9. GPU abstraction
10. AI command protocol
11. tracking abstraction
12. analysis/event graph
13. cache
14. jobs
15. plugins
16. cloud/local boundary
17. OTIO interoperability

Every decision must include:

Context
Decision
Alternatives
Tradeoffs
Consequences
Migration impact
```

---

# 127. THIRD AGENT TASK

Build the smallest vertical slice.

It must be:

```text
Create Project
 ↓
Import MP4
 ↓
Probe Media
 ↓
Add Clip
 ↓
Timeline
 ↓
Preview
 ↓
Save
 ↓
Close
 ↓
Reopen
 ↓
Export MP4
```

No AI.

No tracking.

No fancy effects.

If this vertical slice cannot work reliably, stop and fix the foundation.

---

# 128. FOURTH AGENT TASK

Add:

```text
Transform
Crop
Scale
Position
Rotation
Opacity
Keyframes
```

Then:

```text
GPU preview
GPU render
```

---

# 129. FIFTH AGENT TASK

Add:

```text
Tracking
Camera
Masks
Blur
Object focus
```

Then:

```text
Track object
 ↓
Camera follows object
```

This is the first proof of the intelligence architecture.

---

# 130. SIXTH AGENT TASK

Add:

```text
Transcript
Scenes
Silence
Objects
Faces
Events
```

Produce:

```text
Event Graph
```

---

# 131. SEVENTH AGENT TASK

Add AI Director.

Initial instruction:

```text
Use only structured analysis.

Do not send raw video unless explicitly required.

Return only validated edit commands.

Never execute arbitrary code.

Never directly manipulate filesystem.

Never mutate project state outside the command system.
```

---

# 132. EIGHTH AGENT TASK

Implement autonomous editing:

```text
Analyze
 ↓
Plan
 ↓
Edit
 ↓
Preview
 ↓
Critique
 ↓
Correct
 ↓
Render
```

---

# 133. NINTH AGENT TASK

Optimize:

```text
cache
proxy
partial rendering
stream copy
GPU
hardware encoder
background jobs
```

---

# 134. TENTH AGENT TASK

Integrate with 180 Workspace.

---

# 135. FINAL PRODUCT ARCHITECTURE

The final system should look like:

```text
                         USER
                           │
                           ▼
                   180 WORKSPACE
                           │
                    VIDEO PRODUCTION
                           │
                    ┌──────▼──────┐
                    │ DESKTOP APP │
                    └──────┬──────┘
                           │
                    TAURI + REACT
                           │
                    ┌──────▼──────┐
                    │ COMMAND API │
                    └──────┬──────┘
                           │
                  ┌────────▼────────┐
                  │    RUST CORE    │
                  └────────┬────────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
       ▼                   ▼                   ▼
   PROJECT             TIMELINE            MEDIA
    ENGINE              ENGINE             ENGINE
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌──────▼──────┐
                    │ RENDER GRAPH│
                    └──────┬──────┘
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
          GPU            AUDIO          VIDEO
       COMPOSITOR       ENGINE         ENGINE
             │             │             │
             └─────────────┼─────────────┘
                           │
                         EXPORT
                           ▲
                           │
                 ┌─────────┴─────────┐
                 │ AUTONOMOUS AI     │
                 │                   │
                 │ Analysis          │
                 │ Event Graph       │
                 │ Editorial Engine  │
                 │ Creative Director │
                 │ Asset Intelligence│
                 │ Validator         │
                 └───────────────────┘
```

---

# 136. THE MOST IMPORTANT RULE

The agent must always preserve this separation:

```text
USER INTENT
     ↓
AI
     ↓
EDIT COMMANDS
     ↓
VALIDATOR
     ↓
PROJECT MODEL
     ↓
TIMELINE
     ↓
RENDER GRAPH
     ↓
GPU / MEDIA ENGINE
     ↓
VIDEO
```

Never:

```text
USER
 ↓
LLM
 ↓
"somehow edit the video"
```

That architecture will become unmaintainable.

---

# 137. SUCCESS CRITERIA FOR THE WHOLE PLATFORM

The project is approaching production readiness when a user can:

```text
1. Open 180 Workspace
2. Launch Video Production
3. Open desktop editor
4. Import arbitrary supported media
5. Assemble a timeline manually
6. Apply effects
7. Track an object
8. Reframe automatically
9. Generate captions
10. Describe an editing intention
11. Let AI create an edit plan
12. Inspect the changes
13. Modify the AI result
14. Ask AI to modify only part of it
15. Insert external assets
16. Render preview
17. Validator checks result
18. Fix issues
19. Export final MP4
20. Save project
21. Reopen project
22. Relink missing media
23. Undo/redo every operation
24. Continue without cloud connectivity where possible
```

Only after that should the team aggressively expand into:

```text
templates
plugins
marketplace
collaboration
batch generation
API
CLI
mobile
web editor
cloud rendering
```

---

# 138. FINAL ENGINEERING PHILOSOPHY

Do not build:

> "An AI that edits videos."

Build:

> **A deterministic professional video engine that can be controlled by humans, programs, and AI through the same command system.**

That distinction is the foundation of the entire product.

The human can say:

```text
Zoom into the face.
```

The AI can say:

```text
camera_focus(face_01)
```

A developer can say:

```json
{
  "op": "camera_focus",
  "target": "face_01"
}
```

The manual UI can execute the same command.

All four paths eventually become:

```text
Command
 ↓
Project
 ↓
Timeline
 ↓
Render Graph
 ↓
GPU/Media Engine
```

**One engine. Multiple controllers.**

That is the architecture to build.
