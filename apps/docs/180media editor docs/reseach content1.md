Yes. I dug into the architecture of the Recordly repository you gave me, compared it with the relevant open-source editing stacks, browser media technology, and programmatic video systems.

And I’m going to be blunt:

Your idea is technically feasible. But “build a full CapCut/Premiere-like AI editor” is a terrible starting scope.
The opportunity is much better if you build an AI-native automatic editor on top of a deterministic video-rendering engine, rather than trying to build another general-purpose NLE.

Also, one correction: I could inspect the public repository structure, README, package configuration and relevant architectural material, but I could not literally read every source file in the repository through the available web interface. I attempted a direct repository clone as well, but the runtime has no GitHub network access. So I won't bullshit you by claiming I read 100% of the source tree.

1. What Recordly actually is

Your instinct about Recordly is largely correct.

Recordly GitHub repository is much more interesting as an architecture reference than as a finished foundation for your SaaS.

Its current architecture is roughly:

                 RECORDLY
                     │
          ┌──────────┴──────────┐
          │                     │
     CAPTURE LAYER          EDITOR LAYER
          │                     │
   ┌──────┼──────┐          React / TS
   │      │      │               │
 macOS  Windows Linux         Timeline
   │      │      │               │
 Screen   WGC   Electron       Editor State
Capture   +audio capture           │
   │      │      │                 │
   └──────┴──────┘                 │
                                   ▼
                             PixiJS renderer
                                   │
                                   ▼
                              Export engine

The repository itself describes this explicitly: Electron coordinates the application, native capture helpers handle macOS/Windows, timeline regions represent edits, PixiJS handles scene composition, and the same scene logic feeds export.

That's an excellent pattern for what you're considering.

But there's a much more important discovery.

Recordly isn't simply "an editor"

It has:

automatic zoom suggestions
cursor tracking/smoothing
cursor animation
cursor click effects
speed regions
annotations
webcam overlays
backgrounds
frame styling
aspect-ratio conversion
timeline editing
MP4/GIF export
project persistence
extension support

That means a huge percentage of the mechanics you are imagining already have a proven open-source implementation pattern.

2. The Recordly stack is surprisingly close to what you need

The package.json is especially revealing.

The project uses:

Electron
React
TypeScript
FFmpeg
FFprobe
PixiJS
Mediabunny
MP4Box
Web demuxing
Motion
native capture libraries
native input hooks
GPU/native helper components

That's a very useful architecture reference.

For example:

React
   ↓
Timeline / editor UI
   ↓
Editor state / project model
   ↓
Scene representation
   ↓
PixiJS compositor
   ↓
GPU/native rendering
   ↓
FFmpeg / encoder
   ↓
MP4

You should not make an LLM responsible for that pipeline.

That's the first major architectural principle.

3. Your AI should NOT edit the video

This is where your original concept needs correction.

Don't build:

Video
 ↓
AI
 ↓
"edit this"
 ↓
AI generates video

That's expensive, unpredictable and difficult to reproduce.

Instead:

RAW VIDEO
   ↓
MEDIA ANALYSIS
   ↓
STRUCTURED REPRESENTATION
   ↓
AI DECISION ENGINE
   ↓
EDIT DECISION JSON
   ↓
DETERMINISTIC RENDERER
   ↓
FINAL VIDEO

This is massively better.

For example, AI doesn't output a video.

It outputs:

{
  "segments": [
    {
      "start": 0,
      "end": 4.2,
      "action": "normal"
    },
    {
      "start": 4.2,
      "end": 7.8,
      "action": "zoom",
      "target": {
        "x": 0.64,
        "y": 0.38,
        "scale": 1.35
      }
    },
    {
      "start": 7.8,
      "end": 11.4,
      "action": "normal"
    }
  ]
}

Then your renderer executes it.

That means the AI might consume a few thousand tokens, while your actual video processing uses CPU/GPU rather than tokens.

That's exactly how you should think about this.

4. You don't need AI for most of the editing

This is probably the most important thing I'm telling you.

Suppose a creator uploads:

12-minute screen recording.

You want:

automatic zooms
cursor smoothing
emphasis
speed changes
captions
B-roll
transitions
sound effects
framing
9:16 conversion
visual emphasis

You don't need an LLM for every decision.

Build specialized deterministic analyzers.

For example:

Cursor analyzer

Input:

cursor(x,y,t)

Output:

{
  "movement": "...",
  "velocity": "...",
  "clicks": [...],
  "dwell_regions": [...]
}
Screen activity analyzer

Detect:

large visual changes
UI changes
typing
scrolling
button clicks
navigation
cursor concentration
regions of interest
Audio analyzer

Extract:

speech
silence
volume
pauses
speaker changes
sentence boundaries
emphasis
Vision analyzer

Extract:

faces
objects
screen regions
text
scene changes
important visual events
Speech analyzer

Produce:

timestamp
speaker
word
confidence
sentence

Then your AI receives the compressed semantic representation, not the raw video.

5. This is how you minimize AI tokens

Your idea about using very few tokens is absolutely achievable.

Don't send:

"Here is a 10-minute video, watch it and edit it."

Instead:

VIDEO
 ↓
FFmpeg
 ↓
frames / audio
 ↓
specialized analysis
 ↓
structured events
 ↓
LLM

For example:

{
  "duration": 624,
  "scenes": 21,
  "clicks": 94,
  "cursor_focus_regions": 17,
  "speech_segments": 142,
  "silences": 38,
  "scene_changes": 21,
  "faces": 1,
  "important_ui_events": 32
}

That's dramatically cheaper than feeding video frames to a multimodal model continuously.

And you can go even further.

6. Use a two-stage intelligence system

I'd build:

Layer A — deterministic intelligence

No LLM.

FFmpeg
OpenCV
OCR
Whisper
CV models
audio analysis
cursor telemetry
scene detection
motion detection

Produces:

EVENT GRAPH

For example:

00:00 ─────── intro
00:05 ─────── browser opened
00:08 ─────── cursor moves to button
00:09 ─────── click
00:11 ─────── page changes
00:14 ─────── typing
00:21 ─────── scrolling
00:27 ─────── important UI change
Layer B — AI creative director

Now the LLM receives that.

It decides:

Which events deserve emphasis?
Where should zoom happen?
Where should captions appear?
Should B-roll be inserted?
Should something be cut?
What visual style?
What pacing?

And outputs a structured edit plan.

7. This gives you something extremely powerful

You can make your editor non-destructive.

Instead of changing the original video:

SOURCE VIDEO
     +
EDIT JSON
     +
ASSETS
     +
STYLE
     ↓
RENDER

So:

project.json

could look like:

{
  "source": "video.mp4",

  "format": {
    "width": 1080,
    "height": 1920,
    "fps": 30
  },

  "style": {
    "zoom": "smooth",
    "captions": "minimal",
    "cursor": "apple",
    "background": "gradient"
  },

  "edits": [
    {
      "type": "zoom",
      "start": 3.2,
      "duration": 1.1,
      "x": 0.72,
      "y": 0.41,
      "scale": 1.45
    }
  ]
}

Then the user can change:

"Make the zooms more aggressive."

You don't re-analyze the video.

You simply regenerate the edit plan/render.

8. Recordly's biggest lesson: separate capture, editing and rendering

This is exactly what you should steal architecturally, not necessarily code-for-code.

Recordly uses platform-specific capture:

macOS → ScreenCaptureKit
Windows → Windows Graphics Capture
Linux → Electron capture

and then feeds that into a renderer-driven editor.

That is the right philosophy.

But your product doesn't necessarily need to start with screen recording.

Your initial product can be:

UPLOAD VIDEO
      ↓
AI ANALYSIS
      ↓
AUTOMATIC EDIT
      ↓
PREVIEW
      ↓
EXPORT

Then later:

SCREEN RECORD
      ↓
LIVE EVENT TELEMETRY
      ↓
AUTOMATIC EDIT

The second one becomes your moat.

9. Why cursor telemetry is insanely valuable

This is where screen-recording products have an advantage over normal video editors.

If I give you:

screen.mp4

you have to infer:

"What was the person trying to click?"

But if you recorded:

cursor x/y
mouse down
mouse up
scroll
keyboard
window changes

you know.

Example:

t=12.4
cursor=(734,418)

t=12.7
cursor=(742,421)

t=12.8
click

t=13.2
screen change

Your system can confidently infer:

This interaction is important.

Then:

zoom toward (742,421)

No expensive AI reasoning required.

This is precisely the kind of intelligence you want to build into your own recorder.

10. But your idea is bigger than Recordly

This is where I think your opportunity becomes interesting.

Recordly essentially specializes in:

polished screen recordings

Your proposed system sounds more like:

AI automatic video editor that can understand a raw recording and construct the edit.

Those are different products.

Think:

Recordly
     ↓
screen recording → polished demo

Your system:

ANY RAW VIDEO
     ↓
UNDERSTAND
     ↓
DECIDE
     ↓
EDIT
     ↓
CREATE

That can eventually handle:

talking-head videos
podcasts
screen recordings
tutorials
product demos
educational videos
ads
social content
interviews
webinars

That's considerably more ambitious.

11. OpenCut is another project you absolutely need to study

OpenCut GitHub

This one is particularly relevant because it's explicitly attempting an open-source CapCut-style editor for web, desktop and mobile.

Its architecture includes:

apps/web
apps/desktop
rust/
docs/

and the Rust layer is being used for the platform-independent core, GPU compositor, effects, masks and WASM bindings.

That is important.

Because if your long-term vision is:

web
desktop
mobile

you don't want your entire editing engine trapped inside React/Electron.

12. I would strongly consider a native core

Your architecture should eventually look like:

                   PRODUCT
                      │
        ┌─────────────┼─────────────┐
        │             │             │
       Web          Desktop       Mobile
        │             │             │
        └─────────────┼─────────────┘
                      │
                 EDITOR API
                      │
                 NATIVE CORE
                      │
          ┌───────────┼───────────┐
          │           │           │
       Timeline    Compositor   Effects
          │           │           │
          └───────────┼───────────┘
                      │
                Media Engine
                      │
                  FFmpeg/etc.

Rust is an interesting candidate here.

OpenCut is already moving toward this type of architecture.

13. Don't build the rendering engine from scratch

This would be stupid.

Use existing infrastructure.

There are several layers:

FFmpeg

Excellent for:

decoding
encoding
muxing
transcoding
audio
filters
compositing primitives
WebCodecs

For browser-side processing, WebCodecs exposes low-level video/audio encode/decode primitives and is explicitly useful for browser video editing.

That means modern browsers are much more capable than they were a few years ago.

PixiJS / WebGL/WebGPU

Useful for:

interactive preview
effects
transformations
compositing
overlays

Recordly uses PixiJS for scene composition.

Mediabunny / MP4Box

Useful for browser/media container work.

Recordly's dependencies show both mediabunny and mp4box.

14. Don't use Remotion blindly

This is an important warning.

Remotion GitHub is extremely relevant.

It provides programmatic video creation with React and even explicitly supports applications and complex video editors.

It could be useful for your rendering/product layer.

But there is a licensing issue.

Its current license says the free license has eligibility restrictions, including organization size and commercial use cases, and companies outside the free-license category need a company license. It also restricts using modified Remotion code to sell/license a derivative.

So:

Do not build your entire commercial business around Remotion before getting legal/licensing clarity.

Use it as a reference, evaluate its current commercial licensing, and decide deliberately.

15. Motion Canvas is also worth studying

Motion Canvas GitHub is another excellent architectural reference.

It combines:

TypeScript
+
animation engine
+
real-time editor
+
timeline
+
voice synchronization

and has a 2D renderer.

But the project itself explicitly says it is not intended to replace traditional video editing software.

So again:

study the architecture, don't assume it is your foundation.

16. OpenTimelineIO matters more than you might think

OpenTimelineIO GitHub

This gives you a standardized representation/interchange approach for editorial timeline information.

That's valuable because you eventually want:

AI
 ↓
timeline representation
 ↓
renderer

rather than:

AI
 ↓
weird proprietary video blob

A structured timeline gives you interoperability and makes your system easier to debug.

OpenTimelineIO is mature and used broadly in film/TV workflows.

17. LosslessCut teaches another important lesson

LosslessCut GitHub

LosslessCut demonstrates how much faster editing can become when you avoid unnecessary re-encoding.

Its primary strength is lossless trimming/cutting by copying media streams instead of re-encoding everything.

Your editor should use the same philosophy:

Don't render what didn't change.

If:

00:00–00:17

is untouched:

copy it.

If:

00:17–00:21

has a zoom/composite:

render only that section.

Then:

00:21–00:48

copy again.

This can dramatically reduce render costs.

18. Your rendering architecture should look like this

I'd build:

                  USER VIDEO
                      │
                      ▼
              MEDIA INGESTION
                      │
             ┌────────┴────────┐
             │                 │
          FFprobe           Decoder
             │                 │
             ▼                 ▼
        Metadata          Frame access
             │                 │
             └────────┬────────┘
                      ▼
               ANALYSIS ENGINE
                      │
       ┌──────────────┼──────────────┐
       ▼              ▼              ▼
    Audio          Vision          Motion
    analysis       analysis        analysis
       │              │              │
       └──────────────┼──────────────┘
                      ▼
                 EVENT GRAPH
                      │
                      ▼
              AI CREATIVE ENGINE
                      │
                      ▼
                 EDIT PLAN
                      │
                      ▼
             TIMELINE / PROJECT
                      │
            ┌─────────┴─────────┐
            ▼                   ▼
         Preview              Render
            │                   │
       GPU/WebGL           FFmpeg/GPU
            │                   │
            └─────────┬─────────┘
                      ▼
                  FINAL MP4

That's the product.

19. Now let's talk about "creativity"

This is the hardest part.

You asked whether creativity/consciousness can be achieved through programming.

Consciousness?

No.

You don't need it.

Creativity?

Yes — to a surprisingly high degree.

Because creativity in editing can be decomposed.

For example:

CREATIVITY
=
PATTERN RECOGNITION
+
CONTEXT
+
STYLE RULES
+
VARIATION
+
QUALITY EVALUATION

You can program all of these.

20. Example: automatic zoom

Bad implementation:

if cursor moves:
    zoom

That will look like garbage.

Good implementation:

cursor activity
+
click importance
+
UI region importance
+
movement velocity
+
dwell time
+
scene changes
+
previous zoom
+
current composition
+
speech emphasis

Then:

importance_score =
    0.20 * cursor_dwell
  + 0.25 * click_event
  + 0.20 * visual_change
  + 0.15 * speech_emphasis
  + 0.10 * semantic_importance
  + 0.10 * novelty

Then:

if importance_score > threshold:
    create_zoom()

That's already "creative" behavior.

21. But you can make it much more sophisticated

Instead of:

ZOOM = 1.5x

generate a camera trajectory:

camera(t) = {
    x(t),
    y(t),
    scale(t),
    rotation(t),
    blur(t)
}

Then apply easing:

easeInOutCubic()

or spring dynamics:

spring(position, velocity, damping)

Now your zoom becomes:

cursor approaches button
          ↓
camera begins movement
          ↓
accelerates
          ↓
settles on button
          ↓
holds
          ↓
returns

That's how you get the "Screen Studio" feeling.

22. You can create an editing grammar

This is where your product can become genuinely powerful.

Define primitives:

CUT
ZOOM
PAN
TRACK
HIGHLIGHT
BLUR
SPEED_UP
SLOW_DOWN
FREEZE
CAPTION
B_ROLL
IMAGE
SOUND_EFFECT
TRANSITION
CALLOUT
EMPHASIZE

Then your AI becomes a composer.

For example:

"User clicks important button"

→ ZOOM
→ CURSOR_EMPHASIS
→ CLICK_SOUND
→ HOLD
→ ZOOM_OUT

Another:

"Speaker makes important statement"

→ CAPTION_EMPHASIS
→ CAMERA_PUNCH_IN
→ BROLL

Another:

"Long explanation with no visual change"

→ SPEED_UP
→ CAPTION
→ BROLL

This is far more controllable than asking an LLM to "edit this video."

23. Your AI should output a DSL

I'd actually create your own:

Video Editing DSL

Something like:

{
  "scene": {
    "source": "main",
    "camera": {
      "mode": "follow_cursor"
    }
  },

  "events": [
    {
      "at": 12.42,
      "action": "zoom",
      "target": "cursor",
      "scale": 1.42,
      "duration": 0.8
    }
  ]
}

Then eventually:

AI
 ↓
EDIT DSL
 ↓
VALIDATOR
 ↓
OPTIMIZER
 ↓
RENDERER

This gives you something extremely important:

Determinism.

Same input + same style:

→ same result.

24. And that's where your moat could develop

Not:

"We use GPT."

Everyone can do that.

Not:

"AI video editing."

Everyone will do that.

Your moat becomes:

VIDEO UNDERSTANDING
        +
EDITING DSL
        +
EDITING HEURISTICS
        +
CAMERA SYSTEM
        +
STYLE ENGINE
        +
ASSET RETRIEVAL
        +
RENDERING ENGINE
        +
USER PREFERENCE MODEL

That's much harder to copy.

25. Your external asset idea is feasible

You said:

AI should automatically find videos/images and insert them.

Yes.

But don't let an LLM freely browse the internet and download random things.

Build:

SEMANTIC QUERY
      ↓
ASSET SEARCH SERVICE
      ↓
LICENSE FILTER
      ↓
QUALITY FILTER
      ↓
ASPECT-RATIO FILTER
      ↓
DURATION FILTER
      ↓
RELEVANCE RANKING
      ↓
ASSET

Your AI could output:

{
  "asset_query": "doctor performing surgery close up",
  "duration": 3.2,
  "placement": "12.4-15.6",
  "style": "cinematic"
}

Your backend searches approved sources.

Then inserts the asset.

26. Do NOT send image search results to the LLM unnecessarily

Again:

BAD

search 30 images
 ↓
send all 30 to LLM
 ↓
choose

Better:

search 100
 ↓
metadata filter
 ↓
embedding similarity
 ↓
visual similarity
 ↓
top 5
 ↓
LLM chooses

Now the model sees only five candidates.

Token consumption falls dramatically.

27. Build an asset embedding index

You could pre-index:

stock videos
stock images
SFX
music
icons
animations
templates
backgrounds

with metadata:

{
  "id": "asset_1829",
  "tags": [
    "doctor",
    "surgery",
    "hospital",
    "medical"
  ],
  "embedding": "...",
  "duration": 4.2,
  "aspect": "16:9",
  "license": "commercial"
}

Then semantic retrieval becomes extremely cheap.

28. AI token economics could be very favorable

Your expensive component isn't necessarily tokens.

Your real costs will probably become:

1. Video storage

Large.

2. Video decoding

CPU/GPU expensive.

3. Rendering

Potentially very expensive.

4. Transcription

Moderate.

5. Vision models

Potentially expensive.

6. LLM reasoning

Potentially surprisingly cheap if you architect correctly.

That's a critical distinction.

Don't optimize only tokens.

Optimize:

$/minute processed

That's the metric I'd obsess over.

29. Your real unit economics

Suppose:

10-minute video

You need to know:

storage cost
+
decode cost
+
AI analysis cost
+
LLM cost
+
render cost
+
bandwidth

Then:

gross cost / finished minute

If you can get that low enough, the SaaS model becomes interesting.

30. The biggest mistake you could make

You could easily spend 12 months building:

"AI CapCut"

and end up dead.

Because CapCut already has:

huge user base
templates
effects
ecosystem
mobile distribution
huge engineering team
AI features
creator network

You don't beat that by building:

CapCut but open source.

That's garbage positioning.

31. You need a narrow wedge

I'd choose something like:

"Upload raw talking-head video → publish-ready short."

Or:

"Upload screen recording → polished product demo."

Or:

"Upload raw educational video → automatically edited social video."

The second one is particularly compatible with Recordly.

For example:

Upload screen recording
        ↓
AI understands interaction
        ↓
Automatic zooms
        ↓
Cursor polish
        ↓
Remove dead time
        ↓
Captions
        ↓
Callouts
        ↓
B-roll
        ↓
Brand styling
        ↓
9:16 / 16:9 / 1:1
        ↓
Export

That is a very compelling product.

32. Existing open-source projects show the layers
Project	What you should learn
Recordly	screen capture + cursor + automatic zoom + renderer
OpenScreen	screen recording architecture
OpenCut	modern web/native editor architecture
LosslessCut	fast media operations
Kdenlive	serious NLE architecture
Shotcut	MLT/FFmpeg-based desktop editing
Motion Canvas	programmatic animation
Remotion	React-based programmatic video
OpenTimelineIO	timeline representation
WebCodecs	browser-level media processing

Kdenlive, for example, is a much more traditional professional NLE architecture using C++, MLT, Qt/KDE and effects frameworks.

Shotcut similarly uses MLT, Qt, FFmpeg and Frei0r.

You don't need all of that complexity for V1.

33. My recommended architecture for YOUR product

I'd build this:

                 ┌──────────────────┐
                 │   WEB / DESKTOP  │
                 │   EDITOR UI      │
                 └────────┬─────────┘
                          │
                    Project JSON
                          │
                          ▼
                 ┌──────────────────┐
                 │  EDITOR ENGINE   │
                 │                  │
                 │ Timeline         │
                 │ Tracks           │
                 │ Effects          │
                 │ Camera           │
                 │ Captions         │
                 └────────┬─────────┘
                          │
             ┌────────────┼────────────┐
             ▼            ▼            ▼
        AI ENGINE     MEDIA ENGINE   ASSET ENGINE
             │            │            │
        LLM/VLM       FFmpeg       Search APIs
        Whisper       Decoder      Embeddings
        CV Models     Encoder      License DB
             │            │            │
             └────────────┼────────────┘
                          ▼
                    RENDER ENGINE
                          │
                   GPU / FFmpeg
                          │
                          ▼
                       MP4
34. And I would NOT make it purely web-first

This is controversial, but I'd start with:

Desktop-first.

Why?

Video processing is brutal.

A local desktop application gives you:

GPU
local files
fast decoding
lower upload cost
privacy
no huge server bill
offline processing
access to native APIs

Then add cloud AI.

Something like:

Desktop
  ↓
local video analysis
  ↓
small metadata uploaded
  ↓
AI planning
  ↓
edit JSON returned
  ↓
local rendering

That's potentially far cheaper than:

upload 2GB
↓
cloud process
↓
cloud render
↓
download 500MB
35. Even better: hybrid architecture
             USER COMPUTER
                  │
        ┌─────────┴─────────┐
        │                   │
   Media processing     AI gateway
        │                   │
   FFmpeg / GPU             │
        │                   ▼
        │                 LLM
        │                   │
        │              Edit JSON
        │                   │
        └─────────┬─────────┘
                  ▼
             Local render

You pay for reasoning, not for moving enormous video files around.

That's a much healthier SaaS model.

36. One huge opportunity: personalized editing

After a user edits 20 videos:

You know:

Preferred zoom = 1.32x
Preferred zoom duration = 0.7 sec
Caption size = 64
Caption position = bottom
Cut silence > 0.45 sec
Use B-roll every 18 sec
Avoid transitions
Use punch-in on emphasis

Then the AI doesn't have to invent style.

It learns:

This creator's editing grammar.

That becomes extremely powerful.

37. Eventually you can have "editing personalities"

For example:

Minimal
Cinematic
MrBeast-style fast
Educational
Corporate
Tech YouTube
Medical
Podcast
Gen-Z
Luxury
Documentary

But internally these aren't magic prompts.

They're parameter sets:

{
  "cut_frequency": 0.72,
  "zoom_aggressiveness": 0.62,
  "caption_density": 0.81,
  "broll_frequency": 0.42,
  "transition_probability": 0.08,
  "motion_intensity": 0.66
}

Now "style" becomes programmable.

38. The really interesting part: evaluation

Your system needs a video critic.

Don't just:

AI generates edit
→ done

Do:

RAW VIDEO
 ↓
EDIT PLAN
 ↓
RENDER LOW-RES PREVIEW
 ↓
QUALITY EVALUATOR
 ↓
PROBLEMS
 ↓
EDIT PLAN REVISION
 ↓
FINAL

The evaluator can check:

awkward zoom
face cut off
captions overlapping face
excessive movement
bad B-roll
audio clipping
empty frame
bad crop
unnatural pacing
repeated assets
subtitle errors

That is where AI becomes much more powerful.

39. Think "compiler", not "editor"

This is probably the deepest architectural idea here.

Your product should behave like a compiler.

INPUT
Raw video + user intent
        ↓
LEXER
Media events
        ↓
PARSER
Semantic structure
        ↓
OPTIMIZER
Editing decisions
        ↓
IR
Intermediate edit representation
        ↓
CODE GENERATOR
Render instructions
        ↓
VIDEO

Your Edit IR is the core intellectual property.

That is what I'd build.

40. My verdict
Technical feasibility:

9/10

Absolutely possible with current technology.

AI token efficiency:

8.5/10

Very good if you use AI for decisions rather than raw frame processing.

Difficulty:

9/10

Don't underestimate it.

A reliable video engine is significantly harder than making a pretty React interface.

Recordly as a starting reference:

9/10

Excellent architectural reference for the screen-recording/zoom/cursor side.

Recordly as the complete foundation:

5/10

Too specialized and desktop-oriented for the broader AI editor you're describing.

"AI CapCut competitor":

3/10

Bad initial strategy.

"AI automatic editor for one specific workflow":

8.5–9/10

Much more interesting.

41. What I would actually build

I'd make V1:

Raw video → finished video

User selects:

Video type:
[Talking Head]
[Screen Recording]
[Tutorial]
[Podcast]
[Product Demo]

Then:

Style:
[Minimal]
[Fast]
[Cinematic]
[Professional]
[Custom]

Then:

Aspect:
9:16
16:9
1:1

Then:

GENERATE VIDEO

Behind the scenes:

1. ingest
2. probe
3. transcribe
4. detect scenes
5. analyze audio
6. detect important moments
7. generate edit plan
8. retrieve assets
9. construct timeline
10. preview
11. validate
12. render

And the user sees:

"Your video is being edited."

Not:

"Please learn how to use a timeline."

That's the product differentiation.

42. And then V2 becomes the killer

Add your own recorder:

Record
 ↓
cursor telemetry
 ↓
keyboard telemetry
 ↓
window telemetry
 ↓
AI understanding
 ↓
automatic editing

Now you can produce:

The fastest way to turn a screen recording into a professional product video.

That's much more defensible.

43. One final brutal warning

Don't start coding the editor yet.

That's backwards.

Before writing 50,000 lines of code, prove one thing:

Can your algorithm take a genuinely ugly 5–10 minute raw video and produce an edit that a human creator would actually publish?

If the answer is no, another 200 UI features won't save you.

Build the automatic editing engine first.

The first prototype should literally be:

input.mp4
      ↓
analyze.py
      ↓
edit.json
      ↓
renderer
      ↓
output.mp4

No fancy timeline.

No marketplace.

No SaaS dashboard.

No mobile app.

No social network.

No 500 effects.

Just prove that the machine can make a good editing decision.

If it can, then build the editor around that engine.

And that is where I think your idea has real potential: not another video editor, but a programmable editing engine whose UI happens to be a video editor.