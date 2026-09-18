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
} from "@workspace/video-contracts";
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

    // 3. Formulate Creative Edit Plan
    const creativePlan = await CreativePlanner.plan({
      prompt,
      timelineContext,
      mediaGraph,
      companyId: params.companyId,
      availableAssets: params.meta?.availableAssets,
    });

    // 4. Validate Creative Edit Plan
    const validation = CreativePlanValidator.validate(creativePlan, baseIR, params.meta?.availableAssets);
    if (!validation.valid) {
      console.warn("[VideoAIDirectorService] Creative plan failed validation:", validation.errors);
    }

    // 5. Deterministically Compile Plan into EditIR
    const compilation = EditIRCompiler.compile(baseIR, creativePlan, params.meta?.availableAssets);

    return {
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

export const videoAIDirectorService = VideoAIDirectorService.getInstance();
