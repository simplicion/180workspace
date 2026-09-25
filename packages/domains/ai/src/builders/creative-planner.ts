import {
  CreativeEditPlan,
  CreativeOperation,
  TimelineContext,
  DirectorState,
  MediaIntelligenceGraph,
  MediaAssetDescriptor,
  DeterministicPlanner,
  EditIR,
  RationalTimeMath,
  buildDirectorToolDefinitions,
  validateDirectorToolCalls,
  PlannerSource,
  DirectorHistoryTurn,
} from "@workspace/video-contracts";
import { AIProviderService, AIClient, AISettings } from "../kernel/ai-provider.service";

export interface PlanGenerationParams {
  prompt: string;
  timelineContext: TimelineContext;
  mediaGraph: MediaIntelligenceGraph;
  directorState?: DirectorState;
  availableAssets?: MediaAssetDescriptor[];
  companyId?: string;
  /** Earlier chat turns, oldest first. */
  history?: DirectorHistoryTurn[];
  /** Current timeline, used to describe the edit state to the LLM. */
  currentEditIR?: EditIR;
  /**
   * Inject an LLM client (tests, or callers that already resolved one).
   * `null` = explicitly no LLM; `undefined` = resolve from the company's AI settings.
   */
  llmClient?: AIClient | null;
  /** Model id override for the injected/resolved client. */
  llmModel?: string;
  /** Extra prompt sections (brand, calendar piece, script alignment), inserted before the request. */
  contextSections?: string[];
}

export interface PlannerOutcome {
  plan: CreativeEditPlan;
  plannerSource: PlannerSource;
  /** Human-readable reason: model used, or exactly why we fell back. */
  plannerReason: string;
  /** Number of LLM calls made (0, 1, or 2 with the repair retry). */
  llmAttempts: number;
  /** Validation errors from the first LLM attempt that triggered a repair (for telemetry). */
  repairedErrors?: string[];
  /** finish_edit `brandWatermark` from the LLM (undefined = keep). */
  brandWatermark?: "add" | "remove" | "keep";
}

const MAX_TRANSCRIPT_WORDS = 2500;
const MAX_HISTORY_TURNS = 12;

/** Model defaults per provider. Anthropic default follows the product decision (latest Sonnet). */
function modelFor(provider: string, override?: string): string | undefined {
  if (override) return override;
  if (provider === "claude") return process.env.AI_DIRECTOR_CLAUDE_MODEL || "claude-sonnet-5";
  if (provider === "openai") return process.env.AI_DIRECTOR_OPENAI_MODEL || undefined;
  return undefined;
}

export class CreativePlanner {
  /**
   * Backwards-compatible entry point: returns only the plan.
   * Prefer `planWithSource`, which also reports whether an LLM or the deterministic engine planned.
   */
  static async plan(params: PlanGenerationParams): Promise<CreativeEditPlan> {
    return (await this.planWithSource(params)).plan;
  }

  /**
   * LLM-first planning via structured tool calling:
   *   1. resolve an LLM client (company key or platform env key)
   *   2. model calls one tool per CreativeOperation (schemas derived from the Zod union)
   *   3. every call is Zod-validated; on failure ONE repair retry is made with the errors
   *   4. no key / call failure / still-invalid output => deterministic planner, and the
   *      outcome says so explicitly (plannerSource + plannerReason). Never silent.
   */
  static async planWithSource(params: PlanGenerationParams): Promise<PlannerOutcome> {
    const { client, reason: noClientReason, model } = await this.resolveClient(params);
    if (!client) {
      return this.deterministicOutcome(params, noClientReason, 0);
    }
    if (typeof client.generateWithTools !== "function") {
      return this.deterministicOutcome(params, `LLM provider "${client.provider}" does not support tool calling`, 0);
    }

    const tools = buildDirectorToolDefinitions();
    const basePrompt = this.buildPrompt(params);
    const options: any = { max_tokens: 16000, temperature: 0.2 };
    if (model) options.model = model;
    const label = `${client.provider}${model ? `/${model}` : ""}`;

    let first;
    try {
      first = await client.generateWithTools(basePrompt, tools, options);
    } catch (err: any) {
      return this.deterministicOutcome(params, `LLM call failed (${label}): ${truncate(err?.message || String(err), 240)}`, 1);
    }

    const firstCalls = first?.toolCalls || [];
    if (firstCalls.length === 0) {
      const text = (first?.text || "").trim();
      if (!text) return this.deterministicOutcome(params, `LLM (${label}) returned an empty response`, 1);
      // A text-only answer is a legitimate conversational reply (greeting, clarifying question).
      return {
        plan: this.buildPlan(params, [], text, false),
        plannerSource: "llm",
        plannerReason: `${label} replied without edits (conversational turn)`,
        llmAttempts: 1,
      };
    }

    let validation = validateDirectorToolCalls(firstCalls);
    let attempts = 1;
    let repairedErrors: string[] | undefined;

    if (validation.errors.length > 0) {
      repairedErrors = validation.errors;
      attempts = 2;
      const repairPrompt = this.buildRepairPrompt(basePrompt, firstCalls, validation.errors);
      let second;
      try {
        second = await client.generateWithTools(repairPrompt, tools, options);
      } catch (err: any) {
        return this.deterministicOutcome(params, `LLM repair call failed (${label}): ${truncate(err?.message || String(err), 240)}`, 2);
      }
      const retry = validateDirectorToolCalls(second?.toolCalls || []);
      if (retry.errors.length > 0 || (retry.operations.length === 0 && !retry.finish)) {
        const errs = retry.errors.length > 0 ? retry.errors : ["no tool calls in repair response"];
        return this.deterministicOutcome(
          params,
          `LLM output (${label}) failed validation after 1 repair attempt: ${truncate(errs.join(" | "), 400)}`,
          2
        );
      }
      validation = retry;
    }

    const summary = validation.finish?.summary || this.summarizeOperations(validation.operations);
    return {
      plan: this.buildPlan(params, validation.operations, summary, validation.finish?.requiresConfirmation ?? false),
      plannerSource: "llm",
      plannerReason: `${label} tool-calling plan (${attempts} attempt${attempts === 1 ? "" : "s"}${repairedErrors ? ", repaired" : ""})`,
      llmAttempts: attempts,
      repairedErrors,
      brandWatermark: validation.finish?.brandWatermark,
    };
  }

  private static async resolveClient(params: PlanGenerationParams): Promise<{ client: AIClient | null; reason: string; model?: string }> {
    if (params.llmClient !== undefined) {
      if (params.llmClient === null) return { client: null, reason: "LLM disabled for this request" };
      return { client: params.llmClient, reason: "", model: modelFor(params.llmClient.provider, params.llmModel) };
    }
    if (!params.companyId) {
      return { client: null, reason: "no workspace (company) context, so no LLM key could be resolved" };
    }
    let settings: AISettings;
    try {
      // Lazy import: keeps prisma out of the module graph for callers that inject a client.
      const { AICompanyConfigService } = await import("../kernel/ai-company-config.service");
      settings = (await AICompanyConfigService.getCompanyAISettings(params.companyId)).settings;
    } catch (err: any) {
      return { client: null, reason: `could not load AI settings: ${truncate(err?.message || String(err), 160)}` };
    }
    const client = await AIProviderService.getInstance().getClient(settings);
    if (!client) {
      return { client: null, reason: `no LLM key configured for this workspace (provider "${settings.aiProvider || "none"}")` };
    }
    return { client, reason: "", model: modelFor(client.provider, params.llmModel) };
  }

  private static deterministicOutcome(params: PlanGenerationParams, reason: string, attempts: number): PlannerOutcome {
    const plan = this.planDeterministically(
      params.prompt,
      params.timelineContext,
      params.mediaGraph,
      params.directorState,
      params.availableAssets
    );
    return { plan, plannerSource: "deterministic", plannerReason: reason, llmAttempts: attempts };
  }

  private static buildPlan(
    params: PlanGenerationParams,
    operations: CreativeOperation[],
    explanation: string,
    requiresConfirmation: boolean
  ): CreativeEditPlan {
    const ctx = params.timelineContext;
    const reframe = operations.find((o) => o.type === "reframeSubject" || o.type === "changeAspectRatio") as any;
    const aspect = reframe?.targetAspect || ctx.currentAspect;
    return {
      version: "1.0.0",
      intent: {
        platform: aspect === "9:16" ? "tiktok" : "general",
        aspectRatio: aspect,
        resolution: ctx.currentResolution,
        stylePreset: "CUSTOM",
        energy: "medium",
        pacing: "dynamic",
        captionStyle: "HORMOZI_BOUNCE",
        audioStyle: "VOICE_PRIORITY_DUCKED",
        visualStyle: "CLEAN_ATTENTION",
      },
      constraints: ctx.userConstraints,
      selectedSegments: [],
      removedSegments: [],
      reorderedSegments: [],
      brollPlan: [],
      captionPlan: [],
      operations,
      confidence: 0.9,
      explanation,
      requiresConfirmation,
    };
  }

  static summarizeOperations(ops: CreativeOperation[]): string {
    if (ops.length === 0) return "No changes were needed.";
    const names = Array.from(new Set(ops.map((o) => o.type)));
    return `Applied ${ops.length} edit${ops.length === 1 ? "" : "s"}: ${names.join(", ")}.`;
  }

  /** Builds the full director prompt. Exported for tests / prompt inspection. */
  static buildPrompt(params: PlanGenerationParams): string {
    const ctx = params.timelineContext;
    const g = params.mediaGraph;
    const lines: string[] = [];

    lines.push(
      `You are the AI Director inside 180 Social Studio, a short-form video editor. You edit the creator's video by CALLING TOOLS. Each tool call is one timeline operation; the server validates every argument and applies them deterministically.`,
      ``,
      `Rules:`,
      `- All times are SECONDS on the CURRENT timeline described below (0 .. ${ctx.projectDurationSec.toFixed(2)}). Never go past the end.`,
      `- Times in one response all refer to the timeline as it is NOW, before any of your operations; the server orders cuts safely. Do not adjust later times for earlier cuts.`,
      `- Do what the creator asked. For vague style requests ("make it punchier for TikTok") choose a small set of concrete, tasteful operations (e.g. remove pauses, captions, 1-3 zooms on key moments, vertical reframe).`,
      `- Use the transcript to find moments ("the punchline", "when I talk about the gym"). A zoom on a moment should start just before the key words.`,
      `- Prefer removeSilences over many removeRange calls for pauses, and autoCaptions for captions.`,
      `- Colours are #RRGGBB (yellow = #FFE600, white = #FFFFFF).`,
      `- If something is impossible (e.g. captions without a transcript), do NOT fake it: skip that tool and say so in finish_edit.`,
      `- Finish with exactly one finish_edit call containing a short, specific summary of what you changed.`,
      ``
    );

    lines.push(`## Current timeline`);
    lines.push(`- duration: ${ctx.projectDurationSec.toFixed(2)}s, canvas ${ctx.currentAspect} (${ctx.currentResolution.width}x${ctx.currentResolution.height}), ${ctx.clipsCount} clip(s)`);
    if (params.currentEditIR) lines.push(...this.describeEditIR(params.currentEditIR));
    lines.push(``);

    lines.push(`## Media analysis (timeline seconds)`);
    const words = g.transcript || [];
    if (words.length === 0) {
      lines.push(`Transcript: NONE AVAILABLE (captions, filler removal and transcript-based edits are not possible).`);
    } else {
      const shown = words.slice(0, MAX_TRANSCRIPT_WORDS);
      lines.push(`Transcript (${words.length} words, format start-end:word${words.length > shown.length ? `, first ${shown.length} shown` : ""}):`);
      lines.push(shown.map((w) => `${w.startSeconds.toFixed(2)}-${w.endSeconds.toFixed(2)}:${w.word}`).join(" "));
    }
    const sil = g.silences || [];
    lines.push(
      sil.length === 0
        ? `Silences: none detected/supplied.`
        : `Silences (start+duration): ${sil.slice(0, 200).map((s) => `${s.startSeconds.toFixed(2)}+${s.durationSeconds.toFixed(2)}`).join(", ")}`
    );
    const sceneStarts = (g.scenes || []).map((s) => s.startSeconds).filter((t) => t > 0);
    if (sceneStarts.length) lines.push(`Scene cuts at: ${sceneStarts.slice(0, 100).map((t) => t.toFixed(2)).join(", ")}`);
    if (g.faces?.[0]?.averageCoords) lines.push(`Main face centre (0..1): x=${g.faces[0].averageCoords.x.toFixed(2)}, y=${g.faces[0].averageCoords.y.toFixed(2)}`);
    const assets = params.availableAssets || [];
    if (assets.length > 0) {
      lines.push(`Available assets for B-roll (assetId: name, duration): ${assets.slice(0, 30).map((a) => `${a.id}: ${a.name}, ${a.durationSeconds}s`).join("; ")}`);
    }
    const c = ctx.userConstraints;
    const constraints = [
      c.doNotRemoveIntro ? "do not cut anything in the first 5s" : null,
      c.doNotAddMusic ? "do not add music" : null,
      ...(c.protectedTimeRanges || []).map((r) => `do not cut ${r.startSec}s-${r.startSec + r.durationSec}s`),
    ].filter(Boolean);
    if (constraints.length) lines.push(`Creator constraints: ${constraints.join("; ")}`);
    lines.push(``);

    const history = (params.history || []).slice(-MAX_HISTORY_TURNS);
    if (history.length) {
      lines.push(`## Conversation so far (oldest first)`);
      for (const t of history) lines.push(`${t.role === "user" ? "Creator" : "Director"}: ${truncate(t.content, 600)}`);
      lines.push(``);
    }

    if (params.contextSections?.length) lines.push(...params.contextSections);

    lines.push(`## Creator's request`);
    lines.push(JSON.stringify(params.prompt));
    return lines.join("\n");
  }

  private static describeEditIR(ir: EditIR): string[] {
    const s = (t: any) => RationalTimeMath.toSeconds(t).toFixed(2);
    const out: string[] = [];
    const main = ir.tracks.videoTracks[0];
    if (main) {
      const clips = main.clips.slice(0, 40).map((c) => {
        const rot = c.transform?.rotationDeg ? ` rot${c.transform.rotationDeg}` : "";
        const flip = c.transform?.flipH ? " mirrored" : "";
        const mute = (c.volumeDb ?? 0) <= -60 ? " muted" : "";
        return `${c.id}[${s(c.timelineRange.start)}+${s(c.timelineRange.duration)}${(c.speedMultiplier || 1) !== 1 ? ` @${c.speedMultiplier}x` : ""}${rot}${flip}${mute}]`;
      });
      out.push(`- main clips: ${clips.join(" ")}${main.clips.length > 40 ? " ..." : ""}`);
    }
    const caps = ir.tracks.captionTrack.filter((c) => c.role !== "title");
    const titles = ir.tracks.captionTrack.filter((c) => c.role === "title");
    out.push(`- captions: ${caps.length}${caps[0] ? ` (preset ${caps[0].style.preset}, text ${caps[0].style.textColor}, highlight ${caps[0].style.highlightColor})` : ""}; titles: ${titles.map((t) => `"${truncate(t.text, 40)}"@${s(t.timeRange.start)}`).join(", ") || "none"}`);
    out.push(`- zooms: ${ir.tracks.cameraTrack.map((z) => `${s(z.timeRange.start)}+${s(z.timeRange.duration)} x${z.scale}`).join(", ") || "none"}`);
    const broll = ir.tracks.videoTracks.filter((t) => t.type === "B_ROLL_OVERLAY").flatMap((t) => t.clips);
    out.push(`- b-roll overlays: ${broll.map((b) => `${b.assetId}@${s(b.timelineRange.start)}+${s(b.timelineRange.duration)}`).join(", ") || "none"}`);
    const bgm = ir.tracks.audioTracks.find((t) => t.type === "BGM" && t.clips.length > 0);
    out.push(`- music: ${bgm ? `yes (track "${bgm.id}", ${bgm.volumeDb}dB${bgm.duckWithSpeech ? ", ducked under speech" : ""})` : "none"}`);
    const original = ir.tracks.audioTracks.find((t) => t.id === "original");
    out.push(`- original audio (trackId "original"): ${original ? original.volumeDb : 0}dB`);
    return out;
  }

  private static buildRepairPrompt(basePrompt: string, calls: Array<{ name: string; args: any }>, errors: string[]): string {
    return [
      basePrompt,
      ``,
      `## Your previous attempt was rejected by the validator`,
      `Previous tool calls: ${truncate(JSON.stringify(calls.map((c) => ({ name: c.name, args: c.args }))), 6000)}`,
      `Errors:`,
      ...errors.map((e) => `- ${e}`),
      ``,
      `Call the tools again with the COMPLETE corrected set of operations (not only the fixed ones), then finish_edit.`,
    ].join("\n");
  }

  /**
   * Deterministic local planner (keyword + telemetry heuristics). Used only as a labelled
   * fallback when no LLM is available or the LLM output could not be validated.
   */
  public static planDeterministically(
    prompt: string,
    context: TimelineContext,
    graph: MediaIntelligenceGraph,
    directorState?: DirectorState,
    availableAssets: MediaAssetDescriptor[] = []
  ): CreativeEditPlan {
    return DeterministicPlanner.plan(prompt, context, graph, directorState, availableAssets);
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
