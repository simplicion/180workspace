import { z } from "zod";
import crypto from "crypto";
import { VideoDirectorTool, DirectorExecutionContext } from "../base-tool";
import { EditIR, RationalTimeMath, VideoClip } from "@workspace/video-contracts";
import { CuratedTakeManifest } from "../../intelligence/semantic-take-curator";

export const TimelineAssemblyInputSchema = z.object({
  targetAspect: z.enum(["16:9", "9:16", "1:1"]).default("9:16"),
  directorPreset: z.string().default("HORMOZI_VIRAL"),
  pacingMultiplier: z.number().default(1.25),
});

export type TimelineAssemblyInput = z.infer<typeof TimelineAssemblyInputSchema>;

export class TimelineAssemblyTool extends VideoDirectorTool<TimelineAssemblyInput, EditIR> {
  readonly name = "timeline_assembler";
  readonly description = "Compiles keeper source ranges into a sequential multi-track EditIR AST with proper aspect framing";
  readonly stage = "TIMELINE_COMPOSITION" as const;
  readonly inputSchema = TimelineAssemblyInputSchema;

  async execute(input: TimelineAssemblyInput, context: DirectorExecutionContext): Promise<EditIR> {
    const curated: CuratedTakeManifest | undefined = context.artifacts.get("curatedManifest");
    const isVertical = input.targetAspect === "9:16";
    const resolution = isVertical ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
    const projectId = context.projectId || crypto.randomUUID();

    const videoClips: VideoClip[] = [];
    let timelineSec = 0;

    if (curated && curated.keeperSegments.length > 0) {
      for (let i = 0; i < curated.keeperSegments.length; i++) {
        const seg = curated.keeperSegments[i];
        const clipStartSec = timelineSec;
        const clipDurSec = seg.durationSec;

        videoClips.push({
          id: crypto.randomUUID(),
          assetId: seg.id,
          sourcePath: seg.clipPath,
          sourceRange: {
            start: RationalTimeMath.fromSeconds(seg.sourceStartSec),
            duration: RationalTimeMath.fromSeconds(clipDurSec),
          },
          timelineRange: {
            start: RationalTimeMath.fromSeconds(clipStartSec),
            duration: RationalTimeMath.fromSeconds(clipDurSec),
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
        });

        timelineSec += clipDurSec;
      }
    }

    const editIR: EditIR = {
      version: "1.0.0",
      meta: {
        projectId,
        title: "Autonomous AI Production",
        targetAspect: input.targetAspect,
        resolution,
        fps: { numerator: 30, denominator: 1 },
        totalDuration: RationalTimeMath.fromSeconds(timelineSec),
      },
      directorStyle: {
        preset: input.directorPreset as any,
        pacingMultiplier: input.pacingMultiplier,
        zoomAggressiveness: 0.6,
        brollFrequencySeconds: 15.0,
      },
      tracks: {
        videoTracks: [
          {
            id: crypto.randomUUID(),
            type: "MAIN_VIDEO",
            zIndex: 0,
            clips: videoClips,
          },
        ],
        cameraTrack: [],
        captionTrack: [],
        audioTracks: [],
      },
    };

    context.artifacts.set("editIR", editIR);
    context.log?.(`Assembled timeline with ${videoClips.length} clips. Total duration: ${timelineSec.toFixed(1)}s`);
    return editIR;
  }
}
