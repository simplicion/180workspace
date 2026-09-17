import { z } from "zod";
import crypto from "crypto";
import { VideoDirectorTool, DirectorExecutionContext } from "../base-tool";
import { CameraEvent, EditIR, RationalTimeMath } from "@workspace/video-contracts";
import { CuratedTakeManifest } from "../../intelligence/semantic-take-curator";

export const CameraZoomInputSchema = z.object({
  zoomScale: z.number().default(1.3),
  frequencySeconds: z.number().default(6.0),
  stiffness: z.number().default(180),
  damping: z.number().default(18),
});

export type CameraZoomInput = z.infer<typeof CameraZoomInputSchema>;

export class CameraZoomTool extends VideoDirectorTool<CameraZoomInput, CameraEvent[]> {
  readonly name = "camera_zoom_solver";
  readonly description = "Calculates mathematical spring-physics camera zooms at cut boundaries and high-retention emphasis moments";
  readonly stage = "ATTENTION_AND_CAPTIONING" as const;
  readonly inputSchema = CameraZoomInputSchema;

  async execute(input: CameraZoomInput, context: DirectorExecutionContext): Promise<CameraEvent[]> {
    const editIR: EditIR | undefined = context.artifacts.get("editIR");
    const curated: CuratedTakeManifest | undefined = context.artifacts.get("curatedManifest");

    if (!editIR) {
      throw new Error("CameraZoomTool: EditIR not found in execution context.");
    }

    const cameraEvents: CameraEvent[] = [];
    const totalDurationSec = RationalTimeMath.toSeconds(editIR.meta.totalDuration);

    if (curated && curated.keeperSegments.length > 0) {
      let timelineSec = 0;
      for (const seg of curated.keeperSegments) {
        if (seg.durationSec >= 4.0) {
          const zoomStart = timelineSec + Math.min(1.5, seg.durationSec * 0.25);
          const zoomDur = Math.min(2.5, seg.durationSec - 1.5);
          cameraEvents.push({
            id: crypto.randomUUID(),
            timeRange: {
              start: RationalTimeMath.fromSeconds(zoomStart),
              duration: RationalTimeMath.fromSeconds(zoomDur),
            },
            targetType: "FACE",
            targetCoords: { x: 0.5, y: 0.38 },
            scale: input.zoomScale,
            spring: {
              stiffness: input.stiffness,
              damping: input.damping,
              mass: 1,
              overshootClamping: false,
            },
            motionBlur: true,
          });
        }
        timelineSec += seg.durationSec;
      }
    } else {
      for (let t = 1.5; t < totalDurationSec - 1.0; t += input.frequencySeconds) {
        cameraEvents.push({
          id: crypto.randomUUID(),
          timeRange: {
            start: RationalTimeMath.fromSeconds(t),
            duration: RationalTimeMath.fromSeconds(Math.min(2.5, totalDurationSec - t)),
          },
          targetType: "FACE",
          targetCoords: { x: 0.5, y: 0.38 },
          scale: input.zoomScale,
          spring: {
            stiffness: input.stiffness,
            damping: input.damping,
            mass: 1,
            overshootClamping: false,
          },
          motionBlur: true,
        });
      }
    }

    editIR.tracks.cameraTrack = cameraEvents;
    context.log?.(`Generated ${cameraEvents.length} spring camera zoom punch events.`);
    return cameraEvents;
  }
}
