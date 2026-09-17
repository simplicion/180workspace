import crypto from "crypto";
import * as path from "path";
import { ProductionPlan, ProductionTask } from "@workspace/video-contracts";
import { SkillRegistry } from "../skills/skill-registry";

export interface PlannerInputOptions {
  userPrompt: string;
  inputFiles: string[];
  outputPath: string;
  targetAspect?: "16:9" | "9:16" | "1:1";
  customStyleKey?: string;
  skillId?: string;
}

export class ProductionPlanner {
  /**
   * Decomposes raw media inputs, active Director Skill, and user directing prompt into a DAG-ordered ProductionPlan
   */
  static createPlan(options: PlannerInputOptions): ProductionPlan {
    const planId = crypto.randomUUID();

    // 1. Resolve Skill & Style
    const skillRegistry = SkillRegistry.getInstance();
    const activeSkill = options.skillId
      ? skillRegistry.get(options.skillId) || skillRegistry.matchBestSkill(options.userPrompt)
      : skillRegistry.matchBestSkill(options.userPrompt);

    const resolvedStyle = activeSkill.resolveStyle(options.userPrompt);
    const targetAspect = options.targetAspect || resolvedStyle.targetAspect;
    const isVertical = targetAspect === "9:16";

    // Filter raw source files (ignore previous render outputs)
    const isExportOrTestFile = (filename: string) => {
      const base = path.basename(filename).toLowerCase();
      return (
        base.startsWith("master_") ||
        base.startsWith("test_") ||
        base.startsWith("hevc_") ||
        base.startsWith("ffmpeg_") ||
        base.startsWith("render_") ||
        base.startsWith("export_") ||
        base.startsWith("final_") ||
        base.endsWith("_out.mp4") ||
        base.endsWith("_output.mp4")
      );
    };

    const sourceFiles = options.inputFiles.filter((f) => !isExportOrTestFile(f));
    const effectiveFiles = sourceFiles.length > 0 ? sourceFiles : options.inputFiles;

    const tasks: ProductionTask[] = [];

    // Stage 1: Ingestion & Telemetry
    tasks.push({
      id: "task_01_probe",
      title: "Inspect Media Streams & Dimensions",
      description: "Analyze raw video and audio stream codecs, resolutions, and durations",
      stage: "INGESTION_AND_TELEMETRY",
      toolName: "probe_media",
      toolInput: { filePaths: effectiveFiles },
      dependencies: [],
      status: "PENDING",
      progressPercent: 0,
    });

    tasks.push({
      id: "task_02_transcribe",
      title: "Extract Speech Cadence & STT",
      description: "Extract 16kHz audio and generate word-level timestamps using Whisper STT",
      stage: "INGESTION_AND_TELEMETRY",
      toolName: "speech_transcribe",
      toolInput: { filePaths: effectiveFiles, language: "hi" },
      dependencies: ["task_01_probe"],
      status: "PENDING",
      progressPercent: 0,
    });

    // Stage 2: Narrative Curation & Blooper Pruning
    tasks.push({
      id: "task_03_curate_takes",
      title: "Curate Story Arc & Discard Bloopers",
      description: "Prune false starts and repeated takes to assemble winning narrative sequence",
      stage: "NARRATIVE_CURATION",
      toolName: "take_curator",
      toolInput: { targetDurationSec: 60.0 },
      dependencies: ["task_02_transcribe"],
      status: "PENDING",
      progressPercent: 0,
    });

    tasks.push({
      id: "task_04_mood_classifier",
      title: `Extract Visual Cues for "${activeSkill.name}"`,
      description: "Analyze transcript cadence and sentiment to anchor domain diagrams and caution stickers",
      stage: "NARRATIVE_CURATION",
      toolName: "mood_classifier",
      toolInput: { userPrompt: options.userPrompt, skillId: activeSkill.id },
      dependencies: ["task_03_curate_takes"],
      status: "PENDING",
      progressPercent: 0,
    });

    // Stage 3: Timeline Composition & Multimodal Sourcing
    tasks.push({
      id: "task_05_asset_search",
      title: "Source & Normalize Transparent Visual Assets",
      description: "Retrieve medical diagrams, transparent PNG vectors, and warning badges from web and vector engine",
      stage: "TIMELINE_COMPOSITION",
      toolName: "asset_search",
      toolInput: {},
      dependencies: ["task_04_mood_classifier"],
      status: "PENDING",
      progressPercent: 0,
    });

    tasks.push({
      id: "task_06_sfx_search",
      title: "Synthesize Acoustic Sound Design Profiles",
      description: "Synthesize 48kHz pops, whooshes, dings, and caution alerts for tactile feedback",
      stage: "TIMELINE_COMPOSITION",
      toolName: "sfx_search",
      toolInput: {},
      dependencies: ["task_04_mood_classifier"],
      status: "PENDING",
      progressPercent: 0,
    });

    tasks.push({
      id: "task_07_assemble_timeline",
      title: "Compile Multi-Track EditIR AST",
      description: `Reframe and sequence winning takes into ${targetAspect} timeline`,
      stage: "TIMELINE_COMPOSITION",
      toolName: "timeline_assembler",
      toolInput: {
        targetAspect,
        directorPreset: resolvedStyle.presetKey,
        pacingMultiplier: resolvedStyle.pacingMultiplier,
      },
      dependencies: ["task_03_curate_takes"],
      status: "PENDING",
      progressPercent: 0,
    });

    tasks.push({
      id: "task_08_motion_overlay",
      title: "Composite Motion Overlays & Aligned SFX",
      description: "Position diagrams in upper-third safe zones with 60fps spring pop-in physics and synced SFX",
      stage: "TIMELINE_COMPOSITION",
      toolName: "motion_overlay",
      toolInput: { enableSfx: true },
      dependencies: ["task_05_asset_search", "task_06_sfx_search", "task_07_assemble_timeline"],
      status: "PENDING",
      progressPercent: 0,
    });

    // Stage 4: Attention Zooms & Safe-Zone Captions
    tasks.push({
      id: "task_09_camera_zooms",
      title: "Apply 60fps Spring Camera Zooms",
      description: "Generate dynamic camera punches to eliminate jump-cut jarring effects",
      stage: "ATTENTION_AND_CAPTIONING",
      toolName: "camera_zoom_solver",
      toolInput: {
        zoomScale: resolvedStyle.zoomScale,
        frequencySeconds: resolvedStyle.zoomFrequencySeconds,
      },
      dependencies: ["task_08_motion_overlay"],
      status: "PENDING",
      progressPercent: 0,
    });

    tasks.push({
      id: "task_10_kinetic_captions",
      title: "Burn Kinetic Subtitles in Safe Zone",
      description: `Format 3-word kinetic captions with ${resolvedStyle.captionColors.highlight} highlights in safe envelope`,
      stage: "ATTENTION_AND_CAPTIONING",
      toolName: "kinetic_caption_burner",
      toolInput: {
        primaryColor: resolvedStyle.captionColors.primary,
        highlightColor: resolvedStyle.captionColors.highlight,
        fontSize: isVertical ? 52 : 44,
        positionYPercent: isVertical ? 0.76 : 0.85,
        wordsPerSegment: 3,
      },
      dependencies: ["task_08_motion_overlay"],
      status: "PENDING",
      progressPercent: 0,
    });

    // Stage 5: Critic Retention QA Audit
    tasks.push({
      id: "task_11_critic_audit",
      title: "Audit Timeline Retention & Safe Zones",
      description: "Verify hook strength, pacing, audio clarity, and overlay safe margins",
      stage: "CRITIC_QA_AUDIT",
      toolName: "critic_retention_audit",
      toolInput: { minAcceptableScore: 70 },
      dependencies: ["task_09_camera_zooms", "task_10_kinetic_captions"],
      status: "PENDING",
      progressPercent: 0,
    });

    // Stage 6: Master Hardware Render
    tasks.push({
      id: "task_12_master_render",
      title: "Hardware-Accelerated Master Render",
      description: "Execute single-pass lossless stream-copy, overlay compositing, and subtitle burn",
      stage: "MASTER_EXPORT",
      toolName: "lossless_splicer_render",
      toolInput: { outputPath: options.outputPath },
      dependencies: ["task_11_critic_audit"],
      status: "PENDING",
      progressPercent: 0,
    });

    return {
      id: planId,
      title: `AI Director [${activeSkill.name}]: ${resolvedStyle.presetKey} (${targetAspect})`,
      userPrompt: options.userPrompt,
      targetAspect,
      directorPreset: resolvedStyle.presetKey,
      tasks,
      status: "PENDING",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      summary: `Decomposed into ${tasks.length} discrete DAG tasks across 6 production stages utilizing the ${activeSkill.name} skill package.`,
    };
  }
}
