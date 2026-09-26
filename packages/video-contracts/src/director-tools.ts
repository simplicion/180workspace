import { z } from "zod";
import { CreativeOperationSchema, CreativeOperation } from "./creative-plan.schema";
import {
  RemoveRangeOpSchema,
  RemoveSilencesOpSchema,
  CleanFillersOpSchema,
  AutoCaptionsOpSchema,
  StyleCaptionOpSchema,
  AddTextOpSchema,
  AddZoomOpSchema,
  ReframeSubjectOpSchema,
  ChangeSpeedOpSchema,
  InsertBrollOpSchema,
  AddEffectOpSchema,
  AddBackgroundMusicOpSchema,
  DuckAudioOpSchema,
  ApplyFilterOpSchema,
  AddTransitionOpSchema,
  SplitClipOpSchema,
  RippleDeleteOpSchema,
  TrimClipOpSchema,
  MoveClipOpSchema,
  ReorderSegmentOpSchema,
  ChangeAspectRatioOpSchema,
  AdjustVolumeOpSchema,
  RotateClipOpSchema,
  AutoSoundDesignOpSchema,
  AddSoundEffectOpSchema,
} from "./creative-plan.schema";

/**
 * Minimal Zod -> JSON Schema converter for the constructs used in creative-plan.schema.ts.
 * Output deliberately sticks to the portable subset (type/description/enum/properties/
 * required/items/minimum/maximum) so the same schema is accepted by Anthropic, OpenAI and
 * Gemini function declarations. Defaults are folded into the description.
 */
export function zodToPortableJsonSchema(schema: z.ZodTypeAny, omitKeys: string[] = []): any {
  const def: any = (schema as any)._def;
  const typeName: string = def.typeName;
  const withDesc = (out: any) => {
    if (def.description) out.description = out.description ? `${def.description} ${out.description}` : def.description;
    return out;
  };
  switch (typeName) {
    case "ZodObject": {
      const shape = def.shape();
      const properties: Record<string, any> = {};
      const required: string[] = [];
      for (const [key, value] of Object.entries<any>(shape)) {
        if (omitKeys.includes(key)) continue;
        properties[key] = zodToPortableJsonSchema(value);
        const vt = value._def.typeName;
        if (vt !== "ZodOptional" && vt !== "ZodDefault") required.push(key);
      }
      const out: any = { type: "object", properties };
      if (required.length) out.required = required;
      return withDesc(out);
    }
    case "ZodString":
      return withDesc({ type: "string" });
    case "ZodNumber": {
      const out: any = { type: (def.checks || []).some((c: any) => c.kind === "int") ? "integer" : "number" };
      for (const c of def.checks || []) {
        if (c.kind === "min") out.minimum = c.value;
        if (c.kind === "max") out.maximum = c.value;
      }
      return withDesc(out);
    }
    case "ZodBoolean":
      return withDesc({ type: "boolean" });
    case "ZodEnum":
      return withDesc({ type: "string", enum: [...def.values] });
    case "ZodLiteral":
      return withDesc({ type: typeof def.value === "number" ? "number" : "string", enum: [def.value] });
    case "ZodArray":
      return withDesc({ type: "array", items: zodToPortableJsonSchema(def.type) });
    case "ZodOptional":
    case "ZodNullable":
      return withDesc(zodToPortableJsonSchema(def.innerType));
    case "ZodDefault": {
      const inner = zodToPortableJsonSchema(def.innerType);
      const dv = def.defaultValue();
      inner.description = `${inner.description ? inner.description + " " : ""}Default: ${JSON.stringify(dv)}.`;
      return withDesc(inner);
    }
    case "ZodEffects":
      return withDesc(zodToPortableJsonSchema(def.schema));
    case "ZodRecord":
    case "ZodAny":
    case "ZodUnknown":
      return withDesc({ type: "object" });
    default:
      return withDesc({ type: "string" });
  }
}

export interface DirectorToolSpec {
  /** Tool name == CreativeOperation `type`. */
  name: CreativeOperation["type"];
  description: string;
  schema: z.ZodObject<any>;
}

/**
 * The operations the LLM planner may call. Every tool maps 1:1 to a CreativeOperation variant,
 * and every call is re-validated against CreativeOperationSchema before it touches the timeline.
 * All times are SECONDS on the CURRENT timeline (as shown to the model).
 */
export const DIRECTOR_TOOL_SPECS: DirectorToolSpec[] = [
  { name: "removeRange", schema: RemoveRangeOpSchema, description: "Cut a time range out of the video and close the gap (ripple delete). Use for 'cut the first 3 seconds', removing a specific sentence, etc. startSec/durationSec are timeline seconds." },
  { name: "removeSilences", schema: RemoveSilencesOpSchema, description: "Remove every pause/dead air at least minDurationSec long, using the detected silences. Prefer this over many removeRange calls for 'remove the pauses'/'tighten it up'." },
  { name: "cleanFillers", schema: CleanFillersOpSchema, description: "Cut filler words (um, uh, ...) found in the transcript." },
  { name: "autoCaptions", schema: AutoCaptionsOpSchema, description: "Generate word-synced kinetic captions from the transcript (replaces existing captions). Colors are #RRGGBB. Use for any 'add captions/subtitles' request, including colour/style requests." },
  { name: "styleCaption", schema: StyleCaptionOpSchema, description: "Restyle EXISTING captions (preset, highlight colour, position). Only valid when captions already exist." },
  { name: "addText", schema: AddTextOpSchema, description: "Add a title / lower-third text overlay. position is an offset from centre in -1..1 (y=-0.6 is near the top). style may contain {fontSize, color, backgroundColor}." },
  { name: "addZoom", schema: AddZoomOpSchema, description: "Punch-in camera zoom for emphasis (e.g. on a punchline). targetCoords are 0..1 canvas fractions (face ≈ {x:0.5,y:0.38}). Keep durations 0.8-3s, scale 1.15-1.5." },
  { name: "reframeSubject", schema: ReframeSubjectOpSchema, description: "Change the canvas aspect ratio and reframe (crop) the footage, e.g. 9:16 for TikTok/Reels/Shorts." },
  { name: "changeSpeed", schema: ChangeSpeedOpSchema, description: "Change playback speed. clipId 'all' for the whole video." },
  { name: "insertBroll", schema: InsertBrollOpSchema, description: "Overlay B-roll footage. Set stockQuery to a short visual search phrase (e.g. 'gym workout') unless an assetId from the available assets list fits. timelineStartSec/durationSec in timeline seconds. mediaType 'image' shows a still photo (only with sourceUrl or an image asset; 1.5-4s)." },
  { name: "addEffect", schema: AddEffectOpSchema, description: "Visual effect for a time range: flash (white flash on a cut/beat, 0.2-0.5s), fade_black (dip to black between sections), shake (impact/energy, 0.3-1s), zoom_pulse (beat punch, 0.3-0.8s), black_white (flashback/contrast moment), vignette (moody focus). Use sparingly: at most one every ~5s." },
  { name: "addBackgroundMusic", schema: AddBackgroundMusicOpSchema, description: "Add a background music bed. query = mood/genre keywords. duckUnderSpeech lowers music while someone talks." },
  { name: "duckAudio", schema: DuckAudioOpSchema, description: "Duck EXISTING background music under speech. Only valid when music already exists; for new music use addBackgroundMusic with duckUnderSpeech." },
  { name: "applyFilter", schema: ApplyFilterOpSchema, description: "Colour look. preset one of NOIR_BW, VIVID, CINEMATIC_TEAL_ORANGE, VINTAGE_WARM, CYBER_NEON, GLOW, NORMAL; brightness/contrast/saturation are multipliers around 1.0." },
  { name: "addTransition", schema: AddTransitionOpSchema, description: "Add a transition at cut boundaries. fromClipId/toClipId '*' = every cut. Types: CROSSFADE, DISSOLVE, DIP_BLACK/DIP_WHITE (section change), ZOOM_SWOOSH/ZOOM_OUT (energy), WIPE/WIPE_RIGHT, SLIDE_LEFT/SLIDE_UP, GLITCH (tech/hype), BLUR_PUNCH. Keep 0.2-0.6s." },
  { name: "rippleDelete", schema: RippleDeleteOpSchema, description: "Delete one whole main-track clip (by id from 'main clips') and close the gap." },
  { name: "trimClip", schema: TrimClipOpSchema, description: "Shorten one main-track clip by removing seconds from its start and/or end (ripple; the rest of the video moves up)." },
  { name: "splitClip", schema: SplitClipOpSchema, description: "Split a main-track clip in two at a timeline second. Nothing changes visually; the parts get ids <clipId>_1 and <clipId>_2 so later calls in this response (applyFilter, changeSpeed, rotateClip, addTransition) can target one part." },
  { name: "moveClip", schema: MoveClipOpSchema, description: "Reorder: move a whole main-track clip to another position. Total duration is unchanged; captions and zooms travel with the footage." },
  { name: "reorderSegment", schema: ReorderSegmentOpSchema, description: "Reorder: move an arbitrary time range (e.g. 'put the punchline first') to another position. Total duration is unchanged." },
  { name: "changeAspectRatio", schema: ChangeAspectRatioOpSchema, description: "Change the canvas aspect ratio. mode 'fill' crops the footage to fill the frame (same as reframeSubject); mode 'fit' shows the whole frame with bars in `background` (#RRGGBB)." },
  { name: "adjustVolume", schema: AdjustVolumeOpSchema, description: "Set a volume level. trackId 'original' = the video's own sound (voice), 'music' = the background music (only when music exists)." },
  { name: "rotateClip", schema: RotateClipOpSchema, description: "Rotate (absolute 0/90/180/270 clockwise) and/or mirror the footage. clipId 'all' for the whole video. Use for sideways or upside-down footage." },
  { name: "autoSoundDesign", schema: AutoSoundDesignOpSchema, description: "Automatically synthesize acoustic sound design across the entire video: whooshes under zooms/cuts, UI pops on caption highlights, and sub-bass drops on punchlines." },
  { name: "addSoundEffect", schema: AddSoundEffectOpSchema, description: "Place a specific acoustic sound effect (whoosh, pop, sub_drop, riser, impact, glitch, bell) at a precise timeline second to punctuate key moments." },
];

export const FINISH_TOOL_NAME = "finish_edit";

export const FinishEditArgsSchema = z.object({
  summary: z.string().min(1).max(1200).describe("1-3 friendly sentences telling the creator exactly what you changed (or, if nothing, why / what you need)."),
  requiresConfirmation: z.boolean().default(false).describe("true only for large destructive restructures the creator should approve first."),
  brandWatermark: z
    .enum(["add", "remove", "keep"])
    .optional()
    .describe('Brand logo watermark: "add" when the creator wants the logo (only works when the brand has a logo), "remove" to take it off, "keep" (default) to leave it as is.'),
  preserve: z
    .object({
      lockedRanges: z
        .array(z.object({ startSec: z.number().nonnegative(), endSec: z.number().positive() }))
        .max(20)
        .optional()
        .describe("Parts of the CURRENT timeline (seconds) the creator asked to keep untouched (no cuts, speed, reorder or overlays there)."),
      lockedTracks: z
        .array(z.enum(["music", "captions", "broll", "sfx", "effects", "text"]))
        .optional()
        .describe("Tracks the creator asked not to change (e.g. \"don't touch the music\" -> music)."),
    })
    .optional()
    .describe("Only when the creator explicitly asks to keep/not change something. Locks are enforced by the server; operations that break them are dropped."),
});

/** Tools in the OpenAI function format (also accepted by the Claude/Gemini adapters in AIProviderService). */
export function buildDirectorToolDefinitions() {
  const tools: Array<{ type: string; function: { name: string; description: string; parameters: any } }> = DIRECTOR_TOOL_SPECS.map((spec) => ({
    type: "function",
    function: {
      name: spec.name,
      description: spec.description,
      parameters: zodToPortableJsonSchema(spec.schema, ["type"]),
    },
  }));
  tools.push({
    type: "function",
    function: {
      name: FINISH_TOOL_NAME,
      description: "Call exactly once, last, with a short summary for the creator.",
      parameters: zodToPortableJsonSchema(FinishEditArgsSchema),
    },
  });
  return tools;
}

export interface ToolCallValidation {
  operations: CreativeOperation[];
  errors: string[];
  finish?: z.infer<typeof FinishEditArgsSchema>;
}

/** Validates raw tool calls against the Zod schemas. Unknown tools are errors. */
export function validateDirectorToolCalls(calls: Array<{ name: string; args: any }>): ToolCallValidation {
  const allowed = new Set(DIRECTOR_TOOL_SPECS.map((s) => s.name as string));
  const operations: CreativeOperation[] = [];
  const errors: string[] = [];
  let finish: ToolCallValidation["finish"];
  calls.forEach((call, i) => {
    if (call.name === FINISH_TOOL_NAME) {
      const r = FinishEditArgsSchema.safeParse(call.args || {});
      if (r.success) finish = r.data;
      else errors.push(`call #${i} ${FINISH_TOOL_NAME}: ${r.error.errors.map((e) => `${e.path.join(".") || "(root)"} ${e.message}`).join("; ")}`);
      return;
    }
    if (!allowed.has(call.name)) {
      errors.push(`call #${i}: unknown tool "${call.name}"`);
      return;
    }
    const r = CreativeOperationSchema.safeParse({ ...(call.args || {}), type: call.name });
    if (r.success) operations.push(r.data);
    else errors.push(`call #${i} ${call.name}: ${r.error.errors.map((e) => `${e.path.join(".") || "(root)"} ${e.message}`).join("; ")}`);
  });
  return { operations, errors, finish };
}
