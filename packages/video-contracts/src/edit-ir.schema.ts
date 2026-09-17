import { z } from "zod";
import { RationalTimeSchema, TimeRangeSchema, FrameRateSchema } from "./time";

/**
 * 2D Spring Physics Parameters (Derived from Recordly & Remotion dampening math)
 */
export const SpringConfigSchema = z.object({
  stiffness: z.number().default(180),
  damping: z.number().default(18),
  mass: z.number().default(1),
  overshootClamping: z.boolean().default(false),
});

export type SpringConfig = z.infer<typeof SpringConfigSchema>;

/**
 * 2D Affine Spatial Transform & Easing
 */
export const TransformSchema = z.object({
  scale: z.object({
    start: z.number().default(1.0),
    end: z.number().default(1.0),
    easing: z.enum(["linear", "easeInQuad", "easeOutQuad", "easeInOutCubic", "spring"]).default("spring"),
  }),
  position: z.object({
    x: z.number().default(0.0), // Normalized coordinate -1.0 to 1.0 or pixel offset
    y: z.number().default(0.0),
  }),
  anchor: z.object({
    x: z.number().default(0.5), // 0.0 - 1.0 (center = 0.5, 0.5)
    y: z.number().default(0.5),
  }),
  rotationDeg: z.number().default(0),
  opacity: z.number().min(0).max(1).default(1.0),
  crop: z
    .object({
      top: z.number().default(0),
      bottom: z.number().default(0),
      left: z.number().default(0),
      right: z.number().default(0),
    })
    .optional(),
  borderRadius: z.number().default(0).optional(),
  shadow: z
    .object({
      blur: z.number().default(20),
      color: z.string().default("rgba(0,0,0,0.5)"),
      offsetX: z.number().default(0),
      offsetY: z.number().default(10),
    })
    .optional(),
});

export type Transform = z.infer<typeof TransformSchema>;

/**
 * Visual Transition Definition
 */
export const TransitionSchema = z.object({
  type: z.enum(["CUT", "CROSSFADE", "DISSOLVE", "ZOOM_SWOOSH", "SLIDE_LEFT", "SLIDE_UP", "WIPE", "BLUR_PUNCH"]),
  duration: RationalTimeSchema,
  sfx: z.string().optional().describe("Associated sound effect file path or key"),
});

export type Transition = z.infer<typeof TransitionSchema>;

/**
 * Video / Overlay Timeline Clip
 */
export const VideoClipSchema = z.object({
  id: z.string().min(1),
  assetId: z.string(),
  sourcePath: z.string(),
  sourceRange: TimeRangeSchema,
  timelineRange: TimeRangeSchema,
  transform: TransformSchema.default({
    scale: { start: 1.0, end: 1.0, easing: "spring" },
    position: { x: 0.0, y: 0.0 },
    anchor: { x: 0.5, y: 0.5 },
    rotationDeg: 0,
    opacity: 1.0,
  }),
  transitionIn: TransitionSchema.optional(),
  transitionOut: TransitionSchema.optional(),
  speedMultiplier: z.number().positive().default(1.0),
  effects: z.array(z.string()).default([]),
});

export type VideoClip = z.infer<typeof VideoClipSchema>;

/**
 * Automated Camera Zoom & Attention Track Event
 */
export const CameraEventSchema = z.object({
  id: z.string().min(1),
  timeRange: TimeRangeSchema,
  targetType: z.enum(["FACE", "CURSOR", "OBJECT", "SCREEN_ROI", "MANUAL"]),
  targetCoords: z.object({
    x: z.number(), // Normalized 0.0 to 1.0
    y: z.number(),
  }),
  scale: z.number().min(1.0).max(4.0).default(1.3),
  spring: SpringConfigSchema.default({ stiffness: 180, damping: 18, mass: 1, overshootClamping: false }),
  motionBlur: z.boolean().default(true),
});

export type CameraEvent = z.infer<typeof CameraEventSchema>;
export type CameraZoomKeyframe = CameraEvent;
export type DirectorStylePreset = "MRBEAST_FAST" | "ALI_ABDAAL_CLEAN" | "HORMOZI_PUNCH" | "SAAS_DEMO" | "CUSTOM";

/**
 * Kinetic Word & Caption Definition
 */
export const TimedWordSchema = z.object({
  word: z.string(),
  start: RationalTimeSchema,
  end: RationalTimeSchema,
  highlight: z.boolean().default(false),
  color: z.string().optional(),
  scaleMultiplier: z.number().default(1.0),
});

export type TimedWord = z.infer<typeof TimedWordSchema>;

export const CaptionSegmentSchema = z.object({
  id: z.string().min(1),
  timeRange: TimeRangeSchema,
  text: z.string(),
  words: z.array(TimedWordSchema),
  style: z.object({
    preset: z.enum(["HORMOZI_BOUNCE", "ALI_ABDAAL_CLEAN", "MINIMAL_SUBTITLE", "BOLD_CENTER"]).default("HORMOZI_BOUNCE"),
    fontFamily: z.string().default("Inter"),
    fontSize: z.number().default(48),
    textColor: z.string().default("#FFFFFF"),
    highlightColor: z.string().default("#00FF88"),
    position: z.object({ x: z.number().default(0.5), y: z.number().default(0.8) }),
    shadow: z.boolean().default(true),
  }),
});

export type CaptionSegment = z.infer<typeof CaptionSegmentSchema>;

/**
 * Audio Track & Dynamic Ducking Envelope
 */
export const AudioTrackSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["PRIMARY_VOICE", "BGM", "SFX", "VOICEOVER"]),
  volumeDb: z.number().default(0.0), // 0dB = unity gain
  duckWithSpeech: z.boolean().default(false),
  duckingConfig: z
    .object({
      duckDb: z.number().default(-18.0),
      attackMs: z.number().default(120),
      releaseMs: z.number().default(350),
    })
    .optional(),
  clips: z.array(
    z.object({
      id: z.string().min(1),
      sourcePath: z.string(),
      sourceRange: TimeRangeSchema,
      timelineRange: TimeRangeSchema,
      volumeDb: z.number().default(0.0),
      fadeInDuration: RationalTimeSchema.optional(),
      fadeOutDuration: RationalTimeSchema.optional(),
    })
  ),
});

export type AudioTrack = z.infer<typeof AudioTrackSchema>;

/**
 * Master Autonomous Edit Intermediate Representation (Edit IR) AST
 */
export const EditIRSchema = z.object({
  version: z.literal("1.0.0"),
  meta: z.object({
    projectId: z.string().min(1),
    title: z.string(),
    targetAspect: z.enum(["16:9", "9:16", "1:1", "4:5"]),
    resolution: z.object({
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    }),
    fps: FrameRateSchema,
    totalDuration: RationalTimeSchema,
  }),
  directorStyle: z.object({
    preset: z.enum(["MRBEAST_FAST", "ALI_ABDAAL_CLEAN", "HORMOZI_PUNCH", "SAAS_DEMO", "CUSTOM"]),
    pacingMultiplier: z.number().default(1.0),
    zoomAggressiveness: z.number().default(0.5),
    brollFrequencySeconds: z.number().default(15.0),
  }),
  tracks: z.object({
    videoTracks: z.array(
      z.object({
        id: z.string().min(1),
        type: z.enum(["MAIN_VIDEO", "B_ROLL_OVERLAY", "STICKER_OVERLAY", "PICTURE_IN_PICTURE"]),
        zIndex: z.number().int(),
        clips: z.array(VideoClipSchema),
      })
    ),
    cameraTrack: z.array(CameraEventSchema),
    captionTrack: z.array(CaptionSegmentSchema),
    audioTracks: z.array(AudioTrackSchema),
  }),
});

export type EditIR = z.infer<typeof EditIRSchema>;
