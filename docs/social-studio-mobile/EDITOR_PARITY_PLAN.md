# Manual editor parity ("CapCut-level") + AI Director on the same tools

Goal: a user can build and fix a video by hand. They browse music, sound effects, stock video, photos, text
templates and effects, add them to a multi-track timeline, and then move, trim, replace, restyle or delete anything.
The AI Director uses the same operations on the same timeline, so after the AI edits, every item it placed (music,
B-roll, captions, zooms, SFX, text) shows on the timeline and can be edited by hand.

Rules that still apply:
- The AI plans; a deterministic compiler builds the timeline; the renderer runs on the device (Android Media3 or
  desktop FFmpeg).
- Media never reaches the browser.
- No fake assets: an empty search is an empty state, and a missing key is a typed error.

## 1. What exists today (audit 2026-09-26)

| Capability | Mobile Studio (Flutter + Media3) | Desktop Media Studio (web UI + Tauri FFmpeg) | AI Director tool |
|---|---|---|---|
| Cut / split / trim / delete / reorder | ✅ `timeline_ops.dart` | ✅ `Timeline.tsx` | ✅ removeRange, splitClip, trimClip, moveClip, reorderSegment, rippleDelete |
| Silence / filler removal | ✅ via Director | ✅ SilenceRemovalModal | ✅ removeSilences, cleanFillers |
| Speed, volume, rotate, crop / aspect | ✅ | ✅ (+ speed curves) | ✅ |
| Colour filters / adjust | ✅ fixed looks | ✅ wheels, curves, scopes | ✅ applyFilter |
| Transitions | ✅ | ✅ | ✅ addTransition |
| Auto captions + style presets | ✅ 4 presets | ✅ CaptionStudioModal | ✅ autoCaptions, styleCaption |
| Free text | ✅ plain | ✅ | ✅ addText |
| Zoom / punch-in / reframe | ✅ | ✅ | ✅ addZoom, reframeSubject |
| Music: browse, preview, add, replace | ✅ Music sheet | ✅ StockMediaPanel | ✅ addBackgroundMusic, duckAudio |
| Stock video B-roll: browse + add | ✅ B-roll sheet | ✅ | ✅ insertBroll |
| **Sound effects: browse + add by hand** | 🔴 AI only (IR + renderer support it) | ✅ | ✅ addSoundEffect, autoSoundDesign |
| **Photos as overlays** | 🔴 the renderer is video-only | ✅ | 🟡 |
| **Text templates** (title, lower third, CTA, quote…) | 🔴 | 🔴 caption presets only | 🔴 |
| **Video effects** (shake, flash, blur-in, glitch, vignette, grain) | 🔴 | 🔴 | 🔴 |
| **Multi-track timeline** (see and tap each music / SFX / text / B-roll item) | 🔴 thin read-only lanes | ✅ | n/a |
| One "Library" to browse everything | 🔴 split across sheets | 🟡 stock panel (video/music/SFX/photo) | n/a |

## 2. Plan

### M1: mobile manual editing (no contract change; do first)
1. **Multi-track timeline** (`studio_timeline.dart`): labelled tracks for Video, B-roll, Text & captions, Zoom,
   Music and SFX.
   - Items are sized by time. Pinch changes the zoom; scroll horizontally.
   - Tapping an item selects it and opens an **item inspector** with Replace, Move to playhead, Nudge ±0.5 s, Trim
     start/end, Volume (audio) or Style (text), and Delete.
   - Whatever the AI Director placed shows here and is edited the same way.
2. **Library sheet** ("Add" button): tabs for Music, Sound FX, Video, Text.
   - Search uses the existing `/media-editor/stock/unified`, with a preview and "Add at playhead".
   - Credits are kept for export attribution.
   - Empty or missing-key results give an empty state or an error with retry.
3. **SFX ops**: `addSfx`, `moveSfx`, `setSfxVolume`, `removeSfx` in `timeline_ops.dart`. Cuts already remap SFX.
4. **Text templates** (`text_templates.dart`): about 8 presets built only from existing caption-style fields: Bold
   title, Lower third, Subscribe CTA, Quote, Big number, Minimal subtitle, Boxed label, Highlight. They are applied
   with `addText` / `styleCaptions`, and the brand font and colours override the preset colours when set.
5. Tests: ops unit tests and timeline/library widget tests.

### M2: contract and renderers (photos + effects)
1. `MobileOverlay.source` gets an `image` media kind (with `durationMs`).
   - Android: `EditedMediaItem` image with `setImageDurationMs`.
   - Desktop: FFmpeg `-loop 1`.
   - The compiler maps both ways.
2. `MobileClip.effects: Array<{ id, type: shake|flash|blur_in|glitch|vignette|grain|zoom_pulse, startMs, endMs, intensity }>`
   (a fixed enum).
   - Android: Media3 `GlEffect` shaders.
   - Desktop: FFmpeg filter chain equivalents.
   - Older clients ignore the field.
3. Director tools `applyEffect` and `insertPhoto`, a validator, and `AI_DIRECTOR_CONTRACT.md` updates.
4. Golden tests: the same IR renders the same on both engines (frame-hash tolerance).

### M3: desktop editor parity
1. A Text templates panel using the same template IDs as mobile, a Photos tab that adds image overlays, and an
   Effects panel (M2 enum) with preview.
2. After the director applies, the Timeline selects and highlights the new items so the user can adjust them
   straight away.

### M4: director quality
- Brand-aware defaults: templates use the brand font and colours, and music is picked from the brand mood.
- The greet message lists what was placed and where ("music 0:00–0:32, 4 B-roll shots, captions in Bold"), so the
  user knows what to tweak.

## 3. Status

**M1: done (2026-09-26).**
- `studio_timeline.dart` (multi-track timeline, pinch/buttons zoom, item inspector).
- Library tool with Music, Sound FX, Video, Photos, Text and Effects tabs (`studio_tools.dart`).
- `text_templates.dart` (8 templates, brand font and colours).
- `TimelineOps`: `addSfx`, `setSfxVolume`, `removeSfx`, `items`, `moveItem`, `setItemRange`, `deleteItem`, `editText`, and `addText(style:)`.
- The preview now draws real text-box colours and photo overlays.

**M2: done on the contract, server and Android (2026-09-26).**
- **Contract:** `VIDEO_EFFECT_TYPES`, `EditIR.tracks.effectTrack?`, `VideoClip.mediaType?`, `MobileEditIR.effects?` and overlay `mediaType?`; both converters updated.
- **Director:** new `addEffect` op, compiled and remapped on cuts and reorders. `insertBroll.mediaType:'image'` needs a URL or asset; it is never searched as stock video. The AI Director has an `addEffect` tool.
- **Android:** `TimelineEffects.kt` covers:
  - shake and zoom pulse (`MatrixTransformation`);
  - flash, dip to black, black & white (`RgbMatrix`);
  - vignette (`CanvasOverlay`).
  - Photo overlays use `setImageDurationMs` and `setFrameRate`. Export keeps the image file extension.
- **Tests:**
  - `packages/video-contracts/tests/effects-photos.test.ts`: 3 tests.
  - Director tests: 58/58.
  - Flutter: 152 tests passing, analyze clean.
  - `compileDebugKotlin` OK.
- **Not verified:** the effects and photos have not yet been rendered on a real phone, and there are no Kotlin JVM unit tests (the project has no unit-test setup).

**M3 (desktop editor + FFmpeg):** in progress in a separate workstream.

**M4:** planned.
