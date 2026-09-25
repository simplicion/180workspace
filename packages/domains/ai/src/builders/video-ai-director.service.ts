import { IUniversalBuilder, BuilderGenerationParams, BuilderResult } from "./universal-builder.interface";
import {
  EditIR,
  EditIRSchema,
  MediaTelemetryManifest,
  RationalTimeMath,
  MediaIntelligenceGraph,
  CameraEvent,
  CaptionSegment,
  VideoClip,
  DirectorStylePreset,
  DirectorStyleResolver,
  CreativePlanValidator,
  EditIRCompiler,
  MediaGraphBuilder,
  PlanExpander,
  MobileAIDirectRequest,
  MobileEditIR,
  CreativeOperation,
  PlannerSource,
  editIRFromMobileMedia,
  editIRFromMobile,
  graphFromMobileMedia,
  toMobileEditIR,
  resolveMusicFromCatalog,
  DirectorContext,
  ScriptAlignment,
  MobileWatermark,
  alignScriptToTranscript,
  brandWatermark,
  describeDirectorContext,
  withTimeout,
} from "@workspace/video-contracts";
import {
  styleAgent,
  brollResearchAgent,
  soundAgent,
  buildGreetingProposal,
  greetingReply,
  applyBrandDefaults,
  watermarkIntent,
  SfxSuggestion,
} from "./director-sub-agents";
import type { AIClient } from "../kernel/ai-provider.service";
import { ContextResolver } from "./context-resolver";
import { CreativePlanner } from "./creative-planner";
import { MediaAnalysisService } from "../media/media-analysis.service";
import crypto from "crypto";

export class VideoAIDirectorService implements IUniversalBuilder<EditIR> {
  public readonly builderType = "video" as any;
  private static instance: VideoAIDirectorService;

  public static getInstance(): VideoAIDirectorService {
    if (!VideoAIDirectorService.instance) {
      VideoAIDirectorService.instance = new VideoAIDirectorService();
    }
    return VideoAIDirectorService.instance;
  }

  /**
   * Compiles an autonomous edit plan into concrete EditIR AST mutations.
   * Follows the production pipeline:
   * USER INTENT -> CONTEXT RESOLVER -> CREATIVE PLANNER -> VALIDATION -> EDITIR COMPILATION
   */
  async compileAST(params: BuilderGenerationParams): Promise<BuilderResult<EditIR>> {
    const baseIR = params.existingAST || this.synthesizeDeterministicEditIR(
      params.meta?.telemetry || {
        mediaId: "sample_media",
        sourcePath: params.meta?.videoPath || "source.mp4",
        duration: RationalTimeMath.fromSeconds(15.0),
        totalFrames: 450,
        transcript: [],
        silenceGaps: [],
        energyPeaks: [],
        sceneCuts: [],
        trackedObjects: [],
      },
      params.meta?.stylePreset || "MRBEAST_FAST"
    );

    const prompt = params.prompt || `Apply ${params.meta?.stylePreset || "MRBEAST_FAST"} autonomous style`;

    // 1. Resolve Timeline Context
    const timelineContext = ContextResolver.resolveTimelineContext({
      editIR: baseIR,
      selectedClipId: params.meta?.selectedClipId,
      selectedRange: params.meta?.selectedRange,
      playheadSec: params.meta?.playheadSec,
      userConstraints: params.meta?.userConstraints,
    });

    // 2. Resolve or Build Media Intelligence Graph
    const technicalMetadata = {
      durationSeconds: timelineContext.projectDurationSec,
      width: baseIR.meta.resolution.width,
      height: baseIR.meta.resolution.height,
      fps: 30,
      hasAudio: true,
      fileSizeBytes: 1024 * 1024 * 20,
      sha256Hash: "hash_placeholder",
      isVariableFrameRate: false,
    };
    const telemetryTranscript = (params.meta?.telemetry?.transcript || []).map((t: any, idx: number) => ({
      id: `w_${idx}`,
      word: t.word,
      startSeconds: t.startSeconds,
      endSeconds: t.endSeconds,
      confidence: t.confidence || 0.95,
      isEmphasis: t.isEmphasis || false,
      emphasisScore: t.isEmphasis ? 0.9 : 0.2,
      energyScore: 0.5,
    }));
    const telemetrySilences = (params.meta?.telemetry?.silenceGaps || []).map((s: any, idx: number) => {
      const start = RationalTimeMath.toSeconds(s.timeRange.start);
      const dur = RationalTimeMath.toSeconds(s.timeRange.duration);
      return {
        id: `sil_${idx}`,
        timeRange: s.timeRange,
        startSeconds: start,
        durationSeconds: dur,
        averageDecibels: s.averageDecibels || -40,
        classification: dur > 0.5 ? "DEAD_AIR" as const : "SHORT_NATURAL_PAUSE" as const,
        recommendation: dur > 0.5 ? "REMOVE" as const : "KEEP" as const,
        confidence: 0.95,
        contextReason: "Pause detected via silencedetect",
      };
    });

    // A real (non-placeholder) source path lets us run actual ffmpeg scene-cut/silence
    // detection and transcription instead of falling back to MediaGraphBuilder's empty
    // defaults for everything except whatever telemetry the caller happened to supply.
    const primarySourcePath = baseIR.tracks.videoTracks[0]?.clips[0]?.sourcePath;
    const hasRealSource = !!primarySourcePath && primarySourcePath !== "source.mp4";

    let mediaGraph: MediaIntelligenceGraph;
    if (params.meta?.mediaGraph) {
      mediaGraph = params.meta.mediaGraph;
    } else if (hasRealSource) {
      try {
        const analyzedGraph = await MediaAnalysisService.getOrBuildGraph({
          assetId: timelineContext.assetIds[0] || "asset_01",
          sourcePath: primarySourcePath!,
          technicalMetadata,
          // Don't pay for re-transcription if the caller already supplied a real transcript.
          skipTranscription: telemetryTranscript.length > 0,
        });
        mediaGraph = telemetryTranscript.length > 0
          ? { ...analyzedGraph, transcript: telemetryTranscript, words: telemetryTranscript }
          : analyzedGraph;
      } catch (err: any) {
        console.warn("[VideoAIDirectorService] real media analysis failed, falling back to placeholder graph:", err?.message);
        mediaGraph = MediaGraphBuilder.build({
          assetId: timelineContext.assetIds[0] || "asset_01",
          technicalMetadata,
          transcript: telemetryTranscript,
          silences: telemetrySilences,
        });
      }
    } else {
      mediaGraph = MediaGraphBuilder.build({
        assetId: timelineContext.assetIds[0] || "asset_01",
        technicalMetadata,
        transcript: telemetryTranscript,
        silences: telemetrySilences,
      });
    }

    // 3. Formulate Creative Edit Plan (LLM tool-calling first, labelled deterministic fallback)
    const outcome = await CreativePlanner.planWithSource({
      prompt,
      timelineContext,
      mediaGraph,
      companyId: params.companyId,
      availableAssets: params.meta?.availableAssets,
      currentEditIR: baseIR,
      history: normalizeHistory(params.history),
      llmClient: params.meta?.llmClient,
      contextSections: Array.isArray(params.meta?.contextSections) ? params.meta.contextSections : undefined,
    });
    const expansionWarnings: string[] = [];
    const creativePlan = PlanExpander.expand(outcome.plan, mediaGraph, expansionWarnings);

    // 4. Validate Creative Edit Plan
    const validation = CreativePlanValidator.validate(creativePlan, baseIR, params.meta?.availableAssets);
    if (!validation.valid) {
      console.warn("[VideoAIDirectorService] Creative plan failed validation:", validation.errors);
    }

    // 5. Deterministically Compile Plan into EditIR
    const compilation = EditIRCompiler.compile(baseIR, creativePlan, params.meta?.availableAssets);

    return {
      plannerSource: outcome.plannerSource,
      plannerReason: outcome.plannerReason,
      operations: outcome.plan.operations,
      appliedOperations: compilation.appliedOperations,
      rejectedOperations: compilation.rejectedOperations,
      warnings: [...expansionWarnings, ...validation.errors],
      success: true,
      builderType: this.builderType,
      entityId: compilation.updatedEditIR.meta.projectId,
      title: compilation.updatedEditIR.meta.title,
      editUrl: `/video-studio/editor/${compilation.updatedEditIR.meta.projectId}`,
      reply: creativePlan.explanation,
      explanation: creativePlan.explanation,
      actions: compilation.actionBadges,
      ast: compilation.updatedEditIR,
      requiresConfirmation: creativePlan.requiresConfirmation,
      confirmationDetails: creativePlan.confirmationDetails,
    } as BuilderResult<EditIR>;
  }

  /**
   * Mobile AI Director: the client keeps the media on device and supplies its own analysis
   * (duration/size/transcript/silences). Returns the new timeline as MobileEditIR (ms).
   */
  async directMobile(
    request: MobileAIDirectRequest,
    opts: {
      companyId?: string;
      llmClient?: AIClient | null;
      llmModel?: string;
      /** Resolve a stock b-roll query to an HTTPS video URL (null when unavailable). */
      resolveStockVideo?: (query: string, aspect: string) => Promise<string | null>;
      /**
       * Resolve a music mood query to an HTTPS audio track (null when nothing fits).
       * Defaults to the built-in royalty-free catalogue (`resolveMusicFromCatalog`).
       */
      resolveStockMusic?: (query: string, durationSec: number) => Promise<ResolvedMusicTrack | string | null>;
      /** Optional SFX search (metadata + HTTPS previews only), e.g. Freesound when FREESOUND_API_KEY is set. */
      resolveSfx?: (query: string) => Promise<SfxSuggestion[]>;
      /** Brand + calendar piece context loaded by the server (never taken from the client). */
      context?: DirectorContext;
      /** Overall budget for all stock lookups (b-roll, music, SFX) in this turn. Default 8000 ms. */
      stockTimeoutMs?: number;
      /** Max LLM calls in this turn. Default 3 (the planner uses at most 2). */
      llmCallBudget?: number;
    } = {}
  ): Promise<MobileDirectResult> {
    const media = { ...request.media, assetId: request.media.assetId || "primary" };
    const projectId = request.currentEditIR?.projectId || request.projectId || crypto.randomUUID();
    const baseIR = request.currentEditIR
      ? editIRFromMobile({ ...request.currentEditIR, projectId })
      : editIRFromMobileMedia(media, projectId);
    const ctx: DirectorContext = opts.context || { warnings: [] };
    const words = media.transcript?.words || [];
    const prompt = (request.prompt || "").trim();
    const intent: "edit" | "greet" = request.intent === "greet" || !prompt ? "greet" : "edit";
    const stockBudgetMs = opts.stockTimeoutMs ?? 8000;
    const stockDeadline = Date.now() + stockBudgetMs;
    const remaining = () => Math.max(0, stockDeadline - Date.now());

    const warnings: string[] = [...ctx.warnings];
    if (!words.length) {
      warnings.push("no transcript supplied: captions, filler removal and transcript-aware edits are unavailable");
    }

    // Style agent + script alignment (deterministic, from the server-loaded context).
    const style = styleAgent(ctx);
    if (ctx.brand) warnings.push(...style.warnings);
    const alignment: ScriptAlignment | null =
      ctx.piece?.sections.length && words.length ? alignScriptToTranscript(ctx.piece.sections, words) : null;

    const graph = graphFromMobileMedia(media, baseIR);
    const timelineContext = ContextResolver.resolveTimelineContext({ editIR: baseIR });

    // LLM budget: every planner call goes through this counter.
    const budget = opts.llmCallBudget ?? 3;
    let llmCalls = 0;
    const countedClient = (c: AIClient | null | undefined): AIClient | null | undefined => {
      if (!c || typeof c.generateWithTools !== "function") return c;
      const inner = c.generateWithTools.bind(c);
      return {
        ...c,
        generateWithTools: async (p: any, tools: any, options: any) => {
          if (llmCalls >= budget) throw new Error(`LLM call budget (${budget}) for this turn is used up`);
          llmCalls++;
          return inner(p, tools, options);
        },
      } as AIClient;
    };

    let outcome: { plan: any; plannerSource: PlannerSource; plannerReason: string; brandWatermark?: "add" | "remove" | "keep" };
    let proposal: ReturnType<typeof buildGreetingProposal> | null = null;
    let sfx: SfxSuggestion[] = [];
    let brandApplied: string[] = [];

    if (intent === "greet") {
      // Opening turn: the sub-agents build a proposal. No LLM call (fast, predictable, labelled).
      const broll = words.length ? brollResearchAgent({ words, baseIR, assetId: media.assetId }) : [];
      const sound = await soundAgent({ ctx, resolveSfx: opts.resolveSfx, timeoutMs: Math.min(3000, remaining()), warnings });
      sfx = sound.sfx;
      proposal = buildGreetingProposal({
        ctx, style, alignment, baseIR, assetId: media.assetId, words,
        hasSilences: !!media.silences?.length, broll, music: sound.music,
      });
      outcome = {
        plan: {
          version: "1.0.0",
          intent: {
            platform: "general", aspectRatio: baseIR.meta.targetAspect, resolution: baseIR.meta.resolution, stylePreset: "CUSTOM",
            energy: "medium", pacing: "dynamic", captionStyle: style.captionPreset, audioStyle: "VOICE_PRIORITY_DUCKED", visualStyle: "CLEAN_ATTENTION",
          },
          constraints: timelineContext.userConstraints,
          selectedSegments: [], removedSegments: [], reorderedSegments: [], brollPlan: [], captionPlan: [],
          operations: proposal.operations,
          confidence: 0.8,
          explanation: "",
          requiresConfirmation: true,
        },
        plannerSource: "deterministic",
        plannerReason: "opening proposal built from the brand profile, the calendar script and the transcript (no LLM call)",
        brandWatermark: proposal.watermark ? "add" : "keep",
      };
    } else {
      const contextSections = describeDirectorContext(ctx, style, alignment);
      if (contextSections.length) contextSections.push(`(SOURCE times equal timeline times until cuts are made; map them through the main clips above.)`, ``);
      const planned = await CreativePlanner.planWithSource({
        prompt,
        timelineContext,
        mediaGraph: graph,
        companyId: opts.companyId,
        history: request.history,
        currentEditIR: baseIR,
        llmClient: countedClient(opts.llmClient),
        llmModel: opts.llmModel,
        contextSections: contextSections.length ? contextSections : undefined,
      });
      outcome = planned;
      if (ctx.brand) brandApplied = applyBrandDefaults(planned.plan.operations, prompt, style);
    }

    const expanded = PlanExpander.expand(outcome.plan, graph, warnings);
    const validation = CreativePlanValidator.validate(expanded, baseIR, []);
    let planToCompile = expanded;
    if (!validation.valid) {
      // Drop only the offending operations, and say so.
      const bad = new Set<number>();
      for (const e of validation.errors) {
        const m = e.match(/^Operation #(\d+)/);
        if (m) bad.add(parseInt(m[1], 10));
        warnings.push(e);
      }
      planToCompile = { ...expanded, operations: expanded.operations.filter((_, i) => !bad.has(i)) };
    }

    const compilation = EditIRCompiler.compile(baseIR, planToCompile, []);
    const finalIR = compilation.updatedEditIR;

    // B-roll research: resolve stock queries (the server resolver tries Pexels, then Pixabay) under the turn deadline.
    for (const track of finalIR.tracks.videoTracks) {
      if (track.type !== "B_ROLL_OVERLAY") continue;
      for (const clip of track.clips) {
        if (!clip.sourcePath.startsWith("stock-query://")) continue;
        const query = decodeURIComponent(clip.sourcePath.slice("stock-query://".length));
        let url: string | null = null;
        if (opts.resolveStockVideo) {
          if (remaining() <= 0) {
            warnings.push(`b-roll "${query}": stock lookup skipped (the ${stockBudgetMs} ms stock budget for this turn is used up)`);
          } else {
            try {
              url = await withTimeout(opts.resolveStockVideo(query, finalIR.meta.targetAspect), remaining(), `b-roll "${query}" stock lookup`);
            } catch (err: any) {
              warnings.push(`b-roll "${query}": stock lookup failed (${err?.message || err})`);
            }
          }
        }
        if (url) clip.sourcePath = url;
        else warnings.push(`b-roll "${query}" needs a stock URL: resolve it on the client via /stock/search`);
      }
    }

    // Resolve music mood queries to real tracks the same way (catalogue by default).
    const resolveMusic = opts.resolveStockMusic || (async (q: string, durSec: number) => resolveMusicFromCatalog(q, durSec));
    const timelineSec = RationalTimeMath.toSeconds(finalIR.meta.totalDuration);
    for (const track of finalIR.tracks.audioTracks) {
      if (track.type !== "BGM") continue;
      for (const clip of track.clips) {
        if (!clip.sourcePath.startsWith("stock-music://")) continue;
        const query = clip.sourceQuery || decodeURIComponent(clip.sourcePath.slice("stock-music://".length)) || "background music";
        clip.sourceQuery = query;
        let found: ResolvedMusicTrack | null = null;
        try {
          // The local catalogue is instant; the budget only bites for injected network resolvers.
          const r = await withTimeout(Promise.resolve(resolveMusic(query, timelineSec)), Math.max(remaining(), 250), `music "${query}" lookup`);
          found = typeof r === "string" ? { url: r } : r;
        } catch (err: any) {
          warnings.push(`music "${query}": music lookup failed (${err?.message || err})`);
        }
        if (found && /^https:\/\//i.test(found.url)) {
          clip.sourcePath = found.url;
          const credit = found.attribution ? ` Credit required when publishing: ${found.attribution}.` : found.license ? ` Licence: ${found.license}.` : "";
          warnings.push(`music "${query}": using ${found.title ? `"${found.title}"` : found.url}.${credit}`);
        } else {
          warnings.push(`music "${query}" needs a track URL: no royalty-free track matched this mood; resolve it on the client via /stock/music`);
        }
      }
    }

    // Keep every source the client already knows about (manual editor), refreshed by `media`.
    const sources = [
      ...(request.currentEditIR?.sources || []).filter((s) => s.assetId !== media.assetId),
      { assetId: media.assetId, durationMs: media.durationMs, width: media.width, height: media.height },
    ];
    const projected = toMobileEditIR({
      editIR: finalIR,
      sources,
      sourceWords: words.map((w) => ({ startSec: w.startMs / 1000, endSec: w.endMs / 1000 })),
      primaryAssetId: media.assetId,
    });
    warnings.push(...projected.warnings);

    // Brand font on captions created this turn (the client's own font choices are kept).
    const oldCaptionIds = new Set((request.currentEditIR?.captions || []).map((c) => c.id));
    if (ctx.brand) {
      for (const cap of projected.editIR.captions) if (!oldCaptionIds.has(cap.id)) cap.style.fontFamily = style.fontFamily;
    }

    // Watermark: keep the client's, add/remove on request, never invent one without a brand logo.
    let watermark: MobileWatermark | undefined = request.currentEditIR?.watermark;
    const wantWm = intent === "greet" ? outcome.brandWatermark || "keep" : watermarkIntent(prompt, outcome.brandWatermark);
    if (wantWm === "add") {
      const wm = brandWatermark(ctx.brand);
      if (wm) {
        watermark = watermark ? { ...watermark, imageUrl: wm.imageUrl } : wm;
        if (intent === "edit") brandApplied.push("brand logo watermark");
      } else if (intent === "edit") {
        warnings.push("watermark: this project has no brand logo (HTTPS image) to use");
      }
    } else if (wantWm === "remove") {
      watermark = undefined;
    }
    const editIR: MobileEditIR = { ...projected.editIR };
    delete (editIR as any).watermark;
    if (watermark) editIR.watermark = watermark;

    let summary: string;
    if (intent === "greet" && proposal) {
      summary = greetingReply(proposal, editIR.durationMs / 1000);
    } else {
      summary = outcome.plan.explanation;
      if (outcome.plannerSource === "deterministic") {
        summary = compilation.appliedOperations.length > 0
          ? `Applied ${compilation.appliedOperations.length} change(s) with the offline rule-based director: ${compilation.appliedOperations.slice(0, 4).join("; ")}${compilation.appliedOperations.length > 4 ? "; ..." : ""}`
          : `The offline rule-based director could not map this request to an edit. (${outcome.plannerReason})`;
      }
      if (brandApplied.length) summary += ` Brand: ${brandApplied.join(", ")}.`;
    }
    if (compilation.rejectedOperations.length > 0) {
      summary += ` ${compilation.rejectedOperations.length} requested change(s) could not be applied.`;
    }

    return {
      intent,
      plannerSource: outcome.plannerSource,
      plannerReason: outcome.plannerReason,
      summary,
      reply: summary,
      operations: outcome.plan.operations,
      appliedOperations: compilation.appliedOperations,
      rejectedOperations: compilation.rejectedOperations,
      warnings: Array.from(new Set(warnings)),
      requiresConfirmation: intent === "greet" ? true : outcome.plannerSource === "llm" ? outcome.plan.requiresConfirmation : false,
      editIR,
      ast: finalIR,
      llmCalls,
      ...(proposal ? { proposal: { steps: proposal.steps } } : {}),
      ...(alignment ? { scriptAlignment: alignment } : {}),
      ...(sfx.length ? { sfxSuggestions: sfx } : {}),
      ...(ctx.brand || ctx.piece ? { context: summarizeContext(ctx, style) } : {}),
    };
  }

  /**
   * Conversational AI Director Copilot: modifies existing EditIR based on natural language instructions.
   */
  async patchAST(
    entityId: string,
    instruction: string,
    params: BuilderGenerationParams
  ): Promise<BuilderResult<EditIR>> {
    return this.compileAST({
      ...params,
      prompt: instruction,
    });
  }

  async deleteEntity(entityId: string, _companyId: string): Promise<{ success: boolean; message: string }> {
    return { success: true, message: `Video project ${entityId} deleted.` };
  }

  /**
   * Deterministic local synthesis guaranteeing 100% testability and reliability.
   */
  public synthesizeDeterministicEditIR(
    telemetry: MediaTelemetryManifest,
    stylePreset: DirectorStylePreset = "MRBEAST_FAST"
  ): EditIR {
    const totalDurationSec = RationalTimeMath.toSeconds(telemetry.duration);
    const projectId = crypto.randomUUID();
    const style = DirectorStyleResolver.resolve(stylePreset);

    // 1. Camera Zoom Events
    const cameraTrack: CameraEvent[] = [];
    if (totalDurationSec >= 3.0) {
      cameraTrack.push({
        id: crypto.randomUUID(),
        timeRange: {
          start: RationalTimeMath.fromSeconds(1.5),
          duration: RationalTimeMath.fromSeconds(Math.min(2.5, totalDurationSec - 1.5)),
        },
        targetType: "FACE",
        targetCoords: { x: 0.5, y: 0.38 },
        scale: style.zoomScale,
        spring: { stiffness: 180, damping: 18, mass: 1, overshootClamping: false },
        motionBlur: true,
      });
    }

    // 2. Kinetic Captions
    const captionTrack: CaptionSegment[] = [];
    if (telemetry.transcript && telemetry.transcript.length > 0) {
      captionTrack.push({
        id: crypto.randomUUID(),
        timeRange: {
          start: RationalTimeMath.fromSeconds(0.5),
          duration: RationalTimeMath.fromSeconds(Math.min(4.0, totalDurationSec)),
        },
        text: "Turn ideas into production videos",
        words: [
          { word: "Turn", start: RationalTimeMath.fromSeconds(0.5), end: RationalTimeMath.fromSeconds(0.9), highlight: false, scaleMultiplier: 1.0 },
          { word: "Ideas", start: RationalTimeMath.fromSeconds(0.9), end: RationalTimeMath.fromSeconds(1.4), highlight: true, color: style.captionColors.highlight, scaleMultiplier: 1.15 },
          { word: "Instantly", start: RationalTimeMath.fromSeconds(1.4), end: RationalTimeMath.fromSeconds(2.2), highlight: true, color: style.captionColors.highlight, scaleMultiplier: 1.2 },
        ],
        style: {
          preset: style.captionPreset === "HORMOZI_BOUNCE" ? "HORMOZI_BOUNCE" : "ALI_ABDAAL_CLEAN",
          fontFamily: "Inter",
          fontSize: 52,
          textColor: style.captionColors.primary,
          highlightColor: style.captionColors.highlight,
          position: { x: 0.5, y: 0.76 }, // Guaranteed safe zone above platform navigation
          shadow: true,
        },
      });
    }

    // 3. Master Video Track with Primary Footage Clip
    const mainClip: VideoClip = {
      id: crypto.randomUUID(),
      assetId: telemetry.mediaId,
      sourcePath: telemetry.sourcePath,
      sourceRange: {
        start: RationalTimeMath.fromSeconds(0),
        duration: telemetry.duration,
      },
      timelineRange: {
        start: RationalTimeMath.fromSeconds(0),
        duration: telemetry.duration,
      },
      transform: {
        scale: { start: 1.0, end: 1.0, easing: "spring" },
        position: { x: 0.0, y: 0.0 },
        anchor: { x: 0.5, y: 0.5 },
        rotationDeg: 0,
        opacity: 1.0,
      },
      speedMultiplier: 1.0,
      effects: [],
    };

    return {
      version: "1.0.0",
      meta: {
        projectId,
        title: telemetry.mediaId,
        targetAspect: "16:9",
        resolution: { width: 1920, height: 1080 },
        fps: { numerator: 30, denominator: 1 },
        totalDuration: telemetry.duration,
      },
      directorStyle: {
        preset: stylePreset,
        pacingMultiplier: stylePreset === "MRBEAST_FAST" ? 1.3 : 1.0,
        zoomAggressiveness: stylePreset === "MRBEAST_FAST" ? 0.75 : 0.4,
        brollFrequencySeconds: 12.0,
      },
      tracks: {
        videoTracks: [
          {
            id: crypto.randomUUID(),
            type: "MAIN_VIDEO",
            zIndex: 0,
            clips: [mainClip],
          },
        ],
        cameraTrack,
        captionTrack,
        audioTracks: [
          {
            id: crypto.randomUUID(),
            type: "BGM",
            volumeDb: -14.0,
            duckWithSpeech: true,
            duckingConfig: {
              duckDb: -18.0,
              attackMs: 120,
              releaseMs: 350,
            },
            clips: [],
          },
        ],
      },
    };
  }
}

export interface ResolvedMusicTrack {
  /** HTTPS audio URL. */
  url: string;
  title?: string;
  license?: string;
  /** Credit line the licence requires (e.g. CC BY). */
  attribution?: string;
  durationSec?: number;
}

export interface MobileDirectResult {
  /** "greet" for the opening turn (a proposal with requiresConfirmation:true), else "edit". */
  intent: "edit" | "greet";
  plannerSource: PlannerSource;
  plannerReason: string;
  summary: string;
  reply: string;
  operations: CreativeOperation[];
  appliedOperations: string[];
  rejectedOperations: string[];
  warnings: string[];
  requiresConfirmation: boolean;
  editIR: MobileEditIR;
  ast: EditIR;
  /** LLM calls made in this turn (never more than llmCallBudget, default 3). */
  llmCalls: number;
  /** Greeting turn: the proposal steps, in order. */
  proposal?: { steps: string[] };
  /** Transcript vs calendar script (when the piece has a script and a transcript was sent). */
  scriptAlignment?: ScriptAlignment;
  /** Informational SFX previews (not placed on the timeline in mobile-editir/1). */
  sfxSuggestions?: SfxSuggestion[];
  /** What the director knew about the brand and the piece. */
  context?: DirectorContextSummary;
}

export interface DirectorContextSummary {
  brand?: { projectId: string; name?: string; highlightColor: string; textColor: string; captionPreset: string; font: string; hasLogo: boolean; pacing: string };
  piece?: { calendarPieceId?: string; postId?: string; headline?: string; platform?: string; targetDurationSec?: number; hasScript: boolean };
}

function summarizeContext(ctx: DirectorContext, style: ReturnType<typeof styleAgent>): DirectorContextSummary {
  return {
    ...(ctx.brand ? { brand: { projectId: ctx.brand.projectId, name: ctx.brand.name, highlightColor: style.highlightColor, textColor: style.textColor, captionPreset: style.captionPreset, font: style.fontFamily, hasLogo: !!ctx.brand.logoUrl, pacing: style.pacing } } : {}),
    ...(ctx.piece ? { piece: { calendarPieceId: ctx.piece.calendarPieceId, postId: ctx.piece.postId, headline: ctx.piece.headline, platform: ctx.piece.platform, targetDurationSec: ctx.piece.targetDurationSec, hasScript: ctx.piece.sections.length > 0 } } : {}),
  };
}

function normalizeHistory(history: BuilderGenerationParams["history"]) {
  if (!Array.isArray(history)) return undefined;
  return history
    .map((h) => ({
      role: (h.role === "assistant" || h.sender === "assistant" || h.sender === "ai" ? "assistant" : "user") as "user" | "assistant",
      content: String(h.content ?? h.text ?? ""),
    }))
    .filter((h) => h.content.trim().length > 0);
}

export const videoAIDirectorService = VideoAIDirectorService.getInstance();
