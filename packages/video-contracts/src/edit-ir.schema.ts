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
  /** Mirror the source horizontally (applied together with rotationDeg, before crop). */
  flipH: z.boolean().optional(),
  /**
   * true = fit (contain) the whole source on the canvas background instead of cropping to fill.
   * Distinguishes an explicit "fit" choice from "no crop computed yet" (mobile `crop: null`).
   */
  letterbox: z.boolean().optional(),
  opacity: z.number().min(0).max(1).default(1.0),
  /** Normalized insets (0..1) of the source frame, after rotation/flip. */
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
  brightness: z.number().default(1.0).optional(), // 0.5 to 1.5
  contrast: z.number().default(1.0).optional(), // 0.5 to 1.5
  saturation: z.number().default(1.0).optional(), // 0.0 to 2.0
  temperature: z.number().default(0).optional(), // -100 to +100 (cool to warm)
  tint: z.number().default(0).optional(), // -100 to +100 (green to magenta)
  exposure: z.number().default(0).optional(), // -2.0 to +2.0
  highlights: z.number().default(0).optional(), // -100 to +100
  shadows: z.number().default(0).optional(), // -100 to +100
  vignette: z.number().default(0).optional(), // 0 to 100
  filterPreset: z.string().default("NORMAL").optional(), // NORMAL, NOIR_BW, VIVID, CINEMATIC_TEAL_ORANGE, VINTAGE_WARM, CYBER_NEON, GLOW
  colorWheels: z
    .object({
      lift: z.object({ hue: z.number(), amount: z.number(), luma: z.number() }).optional(),
      gamma: z.object({ hue: z.number(), amount: z.number(), luma: z.number() }).optional(),
      gain: z.object({ hue: z.number(), amount: z.number(), luma: z.number() }).optional(),
      offset: z.object({ hue: z.number(), amount: z.number(), luma: z.number() }).optional(),
    })
    .optional(),
  rgbCurves: z
    .object({
      master: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
      red: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
      green: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
      blue: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
    })
    .optional(),
  speedCurvePreset: z.string().optional(),
  keyframes: z
    .array(
      z.object({
        id: z.string(),
        timeOffsetSec: z.number(),
        property: z.enum(["scale", "posX", "posY", "rotation", "opacity", "volume"]),
        value: z.number(),
        easing: z.enum(["linear", "spring", "easeIn", "easeOut", "easeInOut"]).default("linear").optional(),
      })
    )
    .optional(),
});

export type ClipKeyframe = {
  id: string;
  timeOffsetSec: number;
  property: "scale" | "posX" | "posY" | "rotation" | "opacity" | "volume";
  value: number;
  easing?: "linear" | "spring" | "easeIn" | "easeOut" | "easeInOut";
};

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
  volumeDb: z.number().default(0.0).optional(),
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
  /** Ease in/out ramp length (ms) for renderers that use a linear envelope (mobile). */
  rampMs: z.number().nonnegative().optional(),
  spring: SpringConfigSchema.default({ stiffness: 180, damping: 18, mass: 1, overshootClamping: false }),
  motionBlur: z.boolean().default(true),
});

export type CameraEvent = z.infer<typeof CameraEventSchema>;
export type CameraZoomKeyframe = CameraEvent;
// Kept in sync with `DirectorStyleKey` in director-style-resolver.ts — that resolver is the
// authoritative source of real style presets the deterministic planner produces, so this
// union (and the matching zod enum below / in creative-plan.schema.ts's CreativeIntentSchema)
// must cover every value it can resolve to, or plan/AST validation spuriously fails.
export type DirectorStylePreset =
  | "MRBEAST_FAST"
  | "ALI_ABDAAL_CLEAN"
  | "HORMOZI_PUNCH"
  | "SAAS_DEMO"
  | "CUSTOM"
  | "MINIMALIST_CLEAN"
  | "DAN_KOE_MINIMALIST"
  | "HORMOZI_VIRAL"
  | "INSTAGRAM_AESTHETIC"
  | "DOCUMENTARY_DEEPDIVE"
  | "MAGNATES_MEDIA_MYSTERY"
  | "VOX_EXPLAINER"
  | "IMAN_GADZHI_CINEMATIC";

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
  /** "caption" = speech-synced subtitle; "title" = free text overlay (addText). */
  role: z.enum(["caption", "title"]).optional(),
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
    strokeWidth: z.number().default(0).optional(),
    strokeColor: z.string().default("#000000").optional(),
    glow: z.boolean().default(false).optional(),
    pillBackground: z.string().optional(),
    pillPadding: z.number().default(12).optional(),
    pillRadius: z.number().default(16).optional(),
    uppercase: z.boolean().optional(),
    animation: z.enum(["word_pop", "karaoke", "none"]).optional(),
    fontWeight: z.number().int().optional(),
    /** Wrap width as a fraction of the canvas width. */
    maxWidthFraction: z.number().gt(0).max(1).optional(),
    /** Client-side preset name when it is not one of the canonical `preset` values. */
    presetLabel: z.string().optional(),
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
      /** Stock search phrase this clip was (or still needs to be) resolved from. */
      sourceQuery: z.string().optional(),
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
    /** Letterbox fill colour (#RRGGBB[AA]). Renderers default to black. */
    background: z.string().optional(),
  }),
  directorStyle: z.object({
    preset: z.enum([
      "MRBEAST_FAST",
      "ALI_ABDAAL_CLEAN",
      "HORMOZI_PUNCH",
      "SAAS_DEMO",
      "CUSTOM",
      "MINIMALIST_CLEAN",
      "DAN_KOE_MINIMALIST",
      "HORMOZI_VIRAL",
      "INSTAGRAM_AESTHETIC",
      "DOCUMENTARY_DEEPDIVE",
      "MAGNATES_MEDIA_MYSTERY",
      "VOX_EXPLAINER",
      "IMAN_GADZHI_CINEMATIC",
    ]),
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
