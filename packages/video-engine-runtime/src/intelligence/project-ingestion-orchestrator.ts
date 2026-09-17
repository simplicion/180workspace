import * as path from "path";
import * as fs from "fs";
import crypto from "crypto";
import {
  EditIR,
  RationalTimeMath,
  DirectorStyleResolver,
  ResolvedDirectorStyle,
  VideoClip,
  CameraEvent,
  CaptionSegment,
} from "@workspace/video-contracts";
import { MediaProber } from "../prober";
import { TelemetryExtractor } from "../telemetry-extractor";
import { AssetClassifier, ProjectClassificationReport } from "./asset-classifier";
import { SemanticAssetMatcher, SemanticMatchResult } from "./semantic-asset-matcher";

export interface ProjectIngestionOptions {
  userPrompt?: string;
  targetAspect?: "16:9" | "9:16" | "1:1";
  customStyleKey?: string;
  outputDir?: string;
}

export interface ProjectAssemblyManifest {
  editIR: EditIR;
  classificationReport: ProjectClassificationReport;
  matchResult: SemanticMatchResult;
  resolvedStyle: ResolvedDirectorStyle;
  primaryARollPath: string;
  totalDurationSec: number;
  executionPlanSummary: string;
}

export class ProjectIngestionOrchestrator {
  /**
   * Universal batch ingestion: Ingests 15–20+ arbitrary project files (or folder path),
   * validates and classifies assets, extracts A-roll speech telemetry, matches supportive media,
   * resolves director style, and compiles an automated multi-track EditIR AST.
   */
  static async ingestAndAssemble(
    inputFilesOrDirectory: string | string[],
    options: ProjectIngestionOptions = {}
  ): Promise<ProjectAssemblyManifest> {
    let filePaths: string[] = [];

    if (typeof inputFilesOrDirectory === "string") {
      if (fs.existsSync(inputFilesOrDirectory) && fs.statSync(inputFilesOrDirectory).isDirectory()) {
        const entries = fs.readdirSync(inputFilesOrDirectory);
        filePaths = entries.map((e) => path.join(inputFilesOrDirectory, e));
      } else if (fs.existsSync(inputFilesOrDirectory)) {
        filePaths = [inputFilesOrDirectory];
      }
    } else if (Array.isArray(inputFilesOrDirectory)) {
      filePaths = inputFilesOrDirectory.filter((f) => fs.existsSync(f));
    }

    if (filePaths.length === 0) {
      throw new Error("ProjectIngestionOrchestrator: No valid input files found to ingest.");
    }

    // 1. Asset Classification (Identifies A-Roll, B-Roll, BGM, SFX, Brand Badges)
    const classificationReport = await AssetClassifier.classifyProjectFiles(filePaths);
    if (!classificationReport.primaryARoll) {
      throw new Error("ProjectIngestionOrchestrator: Failed to identify Primary A-Roll video stream in project assets.");
    }

    const primaryAsset = classificationReport.primaryARoll.asset;
    const primaryFilePath = primaryAsset.filePath;

    // 2. Telemetry Extraction from Primary A-Roll (Speech, silence, energy)
    const tempDir = options.outputDir || path.join(path.dirname(primaryFilePath), ".vproj_temp");
    const telemetry = await TelemetryExtractor.extract(primaryFilePath, tempDir);
    const totalDurationSec = RationalTimeMath.toSeconds(telemetry.duration);

    // 3. Resolve Conscious Director Style
    const prompt = options.userPrompt || "Create professional high-retention video";
    const resolvedStyle = DirectorStyleResolver.resolve(prompt);
    if (options.targetAspect) {
      resolvedStyle.targetAspect = options.targetAspect;
    }

    // 4. Semantic Asset Matching (Aligns transcript with supportive assets)
    const transcriptWords = (telemetry.transcript || []).map((t) => ({
      word: t.word,
      startSeconds: t.startSeconds,
      endSeconds: t.endSeconds,
      confidence: t.confidence || 0.95,
      isEmphasis: t.isEmphasis || false,
    }));

    const matchResult = SemanticAssetMatcher.matchAssetsToTranscript(
      transcriptWords,
      classificationReport,
      resolvedStyle,
      totalDurationSec
    );

    // 5. Compile Multi-Track EditIR AST
    const projectId = crypto.randomUUID();
    const isVertical = resolvedStyle.targetAspect === "9:16";
    const resolution = isVertical ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };

    // 5a. Primary A-Roll Video Track
    const mainClip: VideoClip = {
      id: crypto.randomUUID(),
      assetId: primaryAsset.id,
      sourcePath: primaryFilePath,
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

    // 5b. Camera Attention Track (Mathematical Spring Zooms)
    const cameraTrack: CameraEvent[] = [];
    const zoomInterval = resolvedStyle.zoomFrequencySeconds;
    for (let t = 1.5; t < totalDurationSec - 1.0; t += zoomInterval) {
      cameraTrack.push({
        id: crypto.randomUUID(),
        timeRange: {
          start: RationalTimeMath.fromSeconds(t),
          duration: RationalTimeMath.fromSeconds(Math.min(2.5, totalDurationSec - t)),
        },
        targetType: "FACE",
        targetCoords: { x: 0.5, y: 0.38 },
        scale: resolvedStyle.zoomScale,
        spring: { stiffness: 180, damping: 18, mass: 1, overshootClamping: false },
        motionBlur: true,
      });
    }

    // 5c. Kinetic Caption Track with Safe Zones
    const captionTrack: CaptionSegment[] = [];
    if (telemetry.transcript && telemetry.transcript.length > 0) {
      // Chunk transcript into 3-word kinetic segments
      const words = telemetry.transcript;
      for (let i = 0; i < words.length; i += 3) {
        const chunk = words.slice(i, i + 3);
        const startSec = chunk[0].startSeconds;
        const endSec = chunk[chunk.length - 1].endSeconds;
        const text = chunk.map((w) => w.word).join(" ");

        captionTrack.push({
          id: crypto.randomUUID(),
          timeRange: {
            start: RationalTimeMath.fromSeconds(startSec),
            duration: RationalTimeMath.fromSeconds(Math.max(0.6, endSec - startSec)),
          },
          text,
          words: chunk.map((w) => ({
            word: w.word,
            start: RationalTimeMath.fromSeconds(w.startSeconds),
            end: RationalTimeMath.fromSeconds(w.endSeconds),
            highlight: w.isEmphasis || false,
            color: w.isEmphasis ? resolvedStyle.captionColors.highlight : resolvedStyle.captionColors.primary,
            scaleMultiplier: w.isEmphasis ? 1.2 : 1.0,
          })),
          style: {
            preset: resolvedStyle.captionPreset === "HORMOZI_BOUNCE" ? "HORMOZI_BOUNCE" : "ALI_ABDAAL_CLEAN",
            fontFamily: "Inter",
            fontSize: isVertical ? 52 : 44,
            textColor: resolvedStyle.captionColors.primary,
            highlightColor: resolvedStyle.captionColors.highlight,
            position: { x: 0.5, y: isVertical ? 0.76 : 0.85 }, // Strict safe zone
            shadow: true,
          },
        });
      }
    }

    // 5d. Audio Tracks (BGM with Ducking & SFX)
    const audioTracks: any[] = [];
    if (classificationReport.bgmTracks.length > 0) {
      const bgm = classificationReport.bgmTracks[0];
      audioTracks.push({
        id: crypto.randomUUID(),
        type: "BGM",
        volumeDb: -14.0,
        duckWithSpeech: true,
        duckingConfig: {
          duckDb: resolvedStyle.duckingDb,
          attackMs: 120,
          releaseMs: 350,
        },
        clips: [
          {
            id: crypto.randomUUID(),
            assetId: bgm.asset.id,
            sourcePath: bgm.asset.filePath,
            timelineStart: 0,
            duration: totalDurationSec,
          },
        ],
      });
    }

    const editIR: EditIR = {
      version: "1.0.0",
      meta: {
        projectId,
        title: primaryAsset.name,
        targetAspect: resolvedStyle.targetAspect,
        resolution,
        fps: { numerator: 30, denominator: 1 },
        totalDuration: telemetry.duration,
      },
      directorStyle: {
        preset: resolvedStyle.presetKey as any,
        pacingMultiplier: resolvedStyle.pacingMultiplier,
        zoomAggressiveness: resolvedStyle.zoomScale > 1.25 ? 0.8 : 0.4,
        brollFrequencySeconds: resolvedStyle.brollFrequencySeconds,
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
        audioTracks,
      },
    };

    const executionPlanSummary = `Ingestion & assembly complete for ${filePaths.length} project assets. Resolved A-Roll (${primaryAsset.name}, ${totalDurationSec.toFixed(1)}s), ${cameraTrack.length} dynamic spring camera events, ${captionTrack.length} kinetic caption blocks in safe zone (y=${isVertical ? "76%" : "85%"}), ${matchResult.cues.length} supportive overlays, and ${audioTracks.length} ducked audio tracks.`;

    return {
      editIR,
      classificationReport,
      matchResult,
      resolvedStyle,
      primaryARollPath: primaryFilePath,
      totalDurationSec,
      executionPlanSummary,
    };
  }
}
