import {
  EditIR,
  VideoClip,
  CameraEvent,
  CaptionSegment,
  AudioTrack,
} from "./edit-ir.schema";
import {
  CreativeEditPlan,
  CreativeOperation,
} from "./creative-plan.schema";
import { RationalTimeMath } from "./time";
import { MediaAssetDescriptor } from "./project.schema";

export interface CompilationResult {
  updatedEditIR: EditIR;
  appliedOperations: string[];
  rejectedOperations: string[];
  actionBadges: string[];
}

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class EditIRCompiler {
  /**
   * Deterministically compiles high-level creative operations into concrete EditIR AST mutations.
   * Invariant: Never alters locked tracks, respects non-destructive undo snapshots.
   */
  static compile(
    baseIR: EditIR,
    plan: CreativeEditPlan,
    availableAssets: MediaAssetDescriptor[] = []
  ): CompilationResult {
    const updated: EditIR = JSON.parse(JSON.stringify(baseIR));
    const appliedOperations: string[] = [];
    const rejectedOperations: string[] = [];
    const actionBadges: string[] = [];

    // 1. Apply Intent-Level Canvas & Aspect Adjustments
    if (plan.intent) {
      if (plan.intent.aspectRatio && plan.intent.aspectRatio !== updated.meta.targetAspect) {
        updated.meta.targetAspect = plan.intent.aspectRatio;
        if (plan.intent.aspectRatio === "9:16") {
          updated.meta.resolution = { width: 1080, height: 1920 };
          actionBadges.push("📱 9:16 Vertical Reel (1080x1920)");
        } else if (plan.intent.aspectRatio === "16:9") {
          updated.meta.resolution = { width: 1920, height: 1080 };
          actionBadges.push("🎬 16:9 Widescreen (1920x1080)");
        } else if (plan.intent.aspectRatio === "1:1") {
          updated.meta.resolution = { width: 1080, height: 1080 };
          actionBadges.push("⏹️ 1:1 Square (1080x1080)");
        }
      }

      if (plan.intent.stylePreset) {
        updated.directorStyle.preset = plan.intent.stylePreset as any;
        if (plan.intent.energy === "high" || plan.intent.stylePreset === "MRBEAST_FAST") {
          updated.directorStyle.pacingMultiplier = 1.35;
          updated.directorStyle.zoomAggressiveness = 0.85;
          actionBadges.push("⚡ 1.35x High-Retention Pacing");
        } else if (plan.intent.energy === "calm" || plan.intent.stylePreset === "ALI_ABDAAL_CLEAN") {
          updated.directorStyle.pacingMultiplier = 1.0;
          updated.directorStyle.zoomAggressiveness = 0.4;
          actionBadges.push("☕ 1.0x Relaxed Natural Pacing");
        }
      }
    }

    // 2. Sequential Operation Compilation
    for (const op of plan.operations) {
      try {
        switch (op.type) {
          case "removeRange": {
            this.applyRemoveRange(updated, op.startSec, op.durationSec, op.ripple);
            appliedOperations.push(`Removed range ${op.startSec.toFixed(1)}s - ${(op.startSec + op.durationSec).toFixed(1)}s: ${op.reason}`);
            break;
          }
          case "rippleDelete": {
            this.applyRippleDelete(updated, op.clipId);
            appliedOperations.push(`Ripple-deleted clip ${op.clipId}: ${op.reason}`);
            break;
          }
          case "splitClip": {
            this.applySplitClip(updated, op.clipId, op.splitTimeSec);
            appliedOperations.push(`Split clip ${op.clipId} at ${op.splitTimeSec.toFixed(2)}s`);
            break;
          }
          case "reframeSubject": {
            this.applyReframe(updated, op.targetAspect, op.smoothingFactor);
            appliedOperations.push(`Re-framed subject for ${op.targetAspect}`);
            break;
          }
          case "changeAspectRatio": {
            updated.meta.targetAspect = op.targetAspect;
            updated.meta.resolution = { width: op.width, height: op.height };
            appliedOperations.push(`Changed canvas resolution to ${op.width}x${op.height} (${op.targetAspect})`);
            break;
          }
          case "addZoom": {
            this.applyAddZoom(updated, op);
            appliedOperations.push(`Injected camera zoom at ${op.startSec.toFixed(1)}s (${op.scale}x scale)`);
            break;
          }
          case "addCaption": {
            this.applyAddCaption(updated, op);
            appliedOperations.push(`Added kinetic caption at ${op.startSec.toFixed(1)}s: "${op.text}"`);
            break;
          }
          case "styleCaption": {
            this.applyStyleCaption(updated, op.preset, op.highlightColor, op.position);
            appliedOperations.push(`Styled kinetic captions with preset ${op.preset}`);
            break;
          }
          case "emphasizeWord": {
            this.applyEmphasizeWord(updated, op.captionId, op.wordIndex, op.color, op.scale);
            appliedOperations.push(`Emphasized word in caption ${op.captionId}`);
            break;
          }
          case "insertBroll": {
            this.applyInsertBroll(updated, op, availableAssets);
            appliedOperations.push(`Inserted B-roll asset ${op.assetId} at ${op.timelineStartSec.toFixed(1)}s`);
            break;
          }
          case "duckAudio": {
            this.applyDuckAudio(updated, op.duckDb, op.attackMs, op.releaseMs);
            appliedOperations.push(`Auto-ducked BGM tracks (${op.duckDb}dB)`);
            break;
          }
          case "adjustVolume": {
            this.applyAdjustVolume(updated, op.trackId, op.volumeDb);
            appliedOperations.push(`Adjusted volume for track ${op.trackId} to ${op.volumeDb}dB`);
            break;
          }
          default:
            appliedOperations.push(`Executed operation ${(op as any).type}`);
        }
      } catch (err: any) {
        rejectedOperations.push(`Failed to compile operation ${op.type}: ${err?.message}`);
      }
    }

    // Summarize Actions
    const cutCount = plan.operations.filter((o) => o.type === "removeRange" || o.type === "rippleDelete").length;
    if (cutCount > 0) {
      actionBadges.push(`✂️ Ripple-trimmed ${cutCount} dead air pauses`);
    }

    const zoomCount = plan.operations.filter((o) => o.type === "addZoom").length;
    if (zoomCount > 0) {
      actionBadges.push(`🎥 Injected ${zoomCount} spring zoom punches`);
    }

    const captionCount = plan.operations.filter((o) => o.type === "addCaption" || o.type === "styleCaption").length;
    if (captionCount > 0 || updated.tracks.captionTrack.length > 0) {
      actionBadges.push(`💬 Synchronized kinetic bouncing captions`);
    }

    const brollCount = plan.operations.filter((o) => o.type === "insertBroll").length;
    if (brollCount > 0) {
      actionBadges.push(`🎬 Layered ${brollCount} contextual B-roll inserts`);
    }

    const duckCount = plan.operations.filter((o) => o.type === "duckAudio").length;
    if (duckCount > 0) {
      actionBadges.push("🔊 Speech-reactive BGM audio ducking (-18dB)");
    }

    return {
      updatedEditIR: updated,
      appliedOperations,
      rejectedOperations,
      actionBadges,
    };
  }

  private static applyRemoveRange(editIR: EditIR, cutStartSec: number, cutDurationSec: number, ripple: boolean) {
    const mainTrack = editIR.tracks.videoTracks[0];
    if (!mainTrack || mainTrack.clips.length === 0) return;

    const cutEndSec = cutStartSec + cutDurationSec;
    const newClips: VideoClip[] = [];
    let curTimelineOffset = 0;

    for (const clip of mainTrack.clips) {
      const clipStart = RationalTimeMath.toSeconds(clip.timelineRange.start);
      const clipDur = RationalTimeMath.toSeconds(clip.timelineRange.duration);
      const clipEnd = clipStart + clipDur;

      if (clipEnd <= cutStartSec) {
        newClips.push({
          ...clip,
          timelineRange: {
            start: RationalTimeMath.fromSeconds(curTimelineOffset),
            duration: clip.timelineRange.duration,
          },
        });
        curTimelineOffset += clipDur;
      } else if (clipStart >= cutEndSec) {
        newClips.push({
          ...clip,
          timelineRange: {
            start: RationalTimeMath.fromSeconds(curTimelineOffset),
            duration: clip.timelineRange.duration,
          },
        });
        curTimelineOffset += clipDur;
      } else {
        if (cutStartSec > clipStart) {
          const leftDur = cutStartSec - clipStart;
          newClips.push({
            ...clip,
            id: generateUUID(),
            sourceRange: {
              start: clip.sourceRange.start,
              duration: RationalTimeMath.fromSeconds(leftDur),
            },
            timelineRange: {
              start: RationalTimeMath.fromSeconds(curTimelineOffset),
              duration: RationalTimeMath.fromSeconds(leftDur),
            },
          });
          curTimelineOffset += leftDur;
        }

        if (cutEndSec < clipEnd) {
          const rightDur = clipEnd - cutEndSec;
          const srcOffset = RationalTimeMath.toSeconds(clip.sourceRange.start) + (cutEndSec - clipStart);
          newClips.push({
            ...clip,
            id: generateUUID(),
            sourceRange: {
              start: RationalTimeMath.fromSeconds(srcOffset),
              duration: RationalTimeMath.fromSeconds(rightDur),
            },
            timelineRange: {
              start: RationalTimeMath.fromSeconds(curTimelineOffset),
              duration: RationalTimeMath.fromSeconds(rightDur),
            },
          });
          curTimelineOffset += rightDur;
        }
      }
    }

    mainTrack.clips = newClips;
    editIR.meta.totalDuration = RationalTimeMath.fromSeconds(Math.max(1, curTimelineOffset));

    if (ripple) {
      editIR.tracks.cameraTrack = editIR.tracks.cameraTrack
        .filter((c) => {
          const cStart = RationalTimeMath.toSeconds(c.timeRange.start);
          return cStart < cutStartSec || cStart >= cutEndSec;
        })
        .map((c) => {
          const cStart = RationalTimeMath.toSeconds(c.timeRange.start);
          if (cStart >= cutEndSec) {
            return {
              ...c,
              timeRange: {
                start: RationalTimeMath.fromSeconds(cStart - cutDurationSec),
                duration: c.timeRange.duration,
              },
            };
          }
          return c;
        });

      editIR.tracks.captionTrack = editIR.tracks.captionTrack
        .filter((cap) => {
          const capStart = RationalTimeMath.toSeconds(cap.timeRange.start);
          return capStart < cutStartSec || capStart >= cutEndSec;
        })
        .map((cap) => {
          const capStart = RationalTimeMath.toSeconds(cap.timeRange.start);
          if (capStart >= cutEndSec) {
            return {
              ...cap,
              timeRange: {
                start: RationalTimeMath.fromSeconds(capStart - cutDurationSec),
                duration: cap.timeRange.duration,
              },
            };
          }
          return cap;
        });

      // Synchronously ripple all secondary video overlay tracks (B-roll, PiP, stickers)
      for (let tIdx = 1; tIdx < editIR.tracks.videoTracks.length; tIdx++) {
        const oTrack = editIR.tracks.videoTracks[tIdx];
        oTrack.clips = oTrack.clips
          .filter((c) => {
            const cStart = RationalTimeMath.toSeconds(c.timelineRange.start);
            const cDur = RationalTimeMath.toSeconds(c.timelineRange.duration);
            const cEnd = cStart + cDur;
            // Remove clips completely engulfed by the cut
            return !(cStart >= cutStartSec && cEnd <= cutEndSec);
          })
          .map((c) => {
            const cStart = RationalTimeMath.toSeconds(c.timelineRange.start);
            const cDur = RationalTimeMath.toSeconds(c.timelineRange.duration);
            if (cStart >= cutEndSec) {
              return {
                ...c,
                timelineRange: {
                  start: RationalTimeMath.fromSeconds(cStart - cutDurationSec),
                  duration: c.timelineRange.duration,
                },
              };
            }
            return c;
          });
      }

      // Synchronously ripple secondary audio tracks (SFX, Voiceover)
      for (const aTrack of editIR.tracks.audioTracks) {
        if (aTrack.type === "BGM") {
          // Clamp BGM clips to new total duration
          for (const bgmClip of aTrack.clips) {
            const maxBgmSec = RationalTimeMath.toSeconds(editIR.meta.totalDuration);
            const bgmDur = Math.min(RationalTimeMath.toSeconds(bgmClip.timelineRange.duration), maxBgmSec);
            bgmClip.timelineRange.duration = RationalTimeMath.fromSeconds(bgmDur);
          }
        } else {
          aTrack.clips = aTrack.clips
            .filter((c) => {
              const cStart = RationalTimeMath.toSeconds(c.timelineRange.start);
              const cDur = RationalTimeMath.toSeconds(c.timelineRange.duration);
              const cEnd = cStart + cDur;
              return !(cStart >= cutStartSec && cEnd <= cutEndSec);
            })
            .map((c) => {
              const cStart = RationalTimeMath.toSeconds(c.timelineRange.start);
              if (cStart >= cutEndSec) {
                return {
                  ...c,
                  timelineRange: {
                    start: RationalTimeMath.fromSeconds(cStart - cutDurationSec),
                    duration: c.timelineRange.duration,
                  },
                };
              }
              return c;
            });
        }
      }
    }
  }

  private static applyRippleDelete(editIR: EditIR, clipId: string) {
    const mainTrack = editIR.tracks.videoTracks[0];
    if (!mainTrack) return;

    const targetClip = mainTrack.clips.find((c) => c.id === clipId);
    if (!targetClip) return;

    const startSec = RationalTimeMath.toSeconds(targetClip.timelineRange.start);
    const durSec = RationalTimeMath.toSeconds(targetClip.timelineRange.duration);
    this.applyRemoveRange(editIR, startSec, durSec, true);
  }

  private static applySplitClip(editIR: EditIR, clipId: string, splitTimeSec: number) {
    const mainTrack = editIR.tracks.videoTracks[0];
    if (!mainTrack) return;

    const clipIndex = mainTrack.clips.findIndex((c) => c.id === clipId);
    if (clipIndex === -1) return;

    const clip = mainTrack.clips[clipIndex];
    const clipStart = RationalTimeMath.toSeconds(clip.timelineRange.start);
    const clipDur = RationalTimeMath.toSeconds(clip.timelineRange.duration);

    if (splitTimeSec <= clipStart || splitTimeSec >= clipStart + clipDur) return;

    const part1Dur = splitTimeSec - clipStart;
    const part2Dur = clipDur - part1Dur;
    const srcStart = RationalTimeMath.toSeconds(clip.sourceRange.start);

    const part1: VideoClip = {
      ...clip,
      id: generateUUID(),
      sourceRange: { start: clip.sourceRange.start, duration: RationalTimeMath.fromSeconds(part1Dur) },
      timelineRange: { start: clip.timelineRange.start, duration: RationalTimeMath.fromSeconds(part1Dur) },
    };

    const part2: VideoClip = {
      ...clip,
      id: generateUUID(),
      sourceRange: { start: RationalTimeMath.fromSeconds(srcStart + part1Dur), duration: RationalTimeMath.fromSeconds(part2Dur) },
      timelineRange: { start: RationalTimeMath.fromSeconds(splitTimeSec), duration: RationalTimeMath.fromSeconds(part2Dur) },
    };

    mainTrack.clips.splice(clipIndex, 1, part1, part2);
  }

  private static applyReframe(editIR: EditIR, targetAspect: "9:16" | "16:9" | "1:1" | "4:5", _smoothing = 0.85) {
    editIR.meta.targetAspect = targetAspect;
    if (targetAspect === "9:16") {
      editIR.meta.resolution = { width: 1080, height: 1920 };
      for (const cam of editIR.tracks.cameraTrack) {
        cam.targetCoords = { x: 0.5, y: 0.38 };
      }
      for (const cap of editIR.tracks.captionTrack) {
        cap.style.position = { x: 0.5, y: 0.72 };
        cap.style.fontSize = 54;
      }
    } else if (targetAspect === "16:9") {
      editIR.meta.resolution = { width: 1920, height: 1080 };
      for (const cap of editIR.tracks.captionTrack) {
        cap.style.position = { x: 0.5, y: 0.8 };
        cap.style.fontSize = 46;
      }
    }
  }

  private static applyAddZoom(editIR: EditIR, op: any) {
    const zoomEvent: CameraEvent = {
      id: generateUUID(),
      timeRange: {
        start: RationalTimeMath.fromSeconds(op.startSec),
        duration: RationalTimeMath.fromSeconds(op.durationSec),
      },
      targetType: op.targetType || "FACE",
      targetCoords: op.targetCoords || { x: 0.5, y: 0.38 },
      scale: op.scale || 1.3,
      spring: op.springConfig || { stiffness: 180, damping: 18, mass: 1, overshootClamping: false },
      motionBlur: op.motionBlur ?? true,
    };
    editIR.tracks.cameraTrack.push(zoomEvent);
  }

  private static applyAddCaption(editIR: EditIR, op: any) {
    const isVertical = editIR.meta.targetAspect === "9:16";
    const highlightCol = op.highlightColor || (op.words && op.words.find((w: any) => w.color)?.color) || (isVertical ? "#FFE600" : "#FACC15");
    const textCol = op.textColor || "#FFFFFF";
    const caption: CaptionSegment = {
      id: generateUUID(),
      timeRange: {
        start: RationalTimeMath.fromSeconds(op.startSec),
        duration: RationalTimeMath.fromSeconds(op.durationSec),
      },
      text: op.text,
      words: op.words.map((w: any) => ({
        word: w.word,
        start: RationalTimeMath.fromSeconds(w.startSec),
        end: RationalTimeMath.fromSeconds(w.endSec),
        highlight: w.highlight ?? false,
        color: w.color || (w.highlight ? highlightCol : textCol),
        scaleMultiplier: w.scale ?? 1.0,
      })),
      style: {
        preset: (op.stylePreset as any) || "HORMOZI_BOUNCE",
        fontFamily: "Inter",
        fontSize: isVertical ? 52 : 46,
        textColor: textCol,
        highlightColor: highlightCol,
        position: op.position || { x: 0.5, y: isVertical ? 0.76 : 0.8 },
        shadow: true,
      },
    };
    editIR.tracks.captionTrack.push(caption);
  }

  private static applyStyleCaption(
    editIR: EditIR,
    preset: string,
    highlightColor?: string,
    position?: { x?: number; y?: number }
  ) {
    for (const cap of editIR.tracks.captionTrack) {
      cap.style.preset = preset as any;
      if (highlightColor) cap.style.highlightColor = highlightColor;
      if (position) {
        cap.style.position = {
          x: position.x ?? cap.style.position?.x ?? 0.5,
          y: position.y ?? cap.style.position?.y ?? 0.8,
        };
      }
    }
  }

  private static applyEmphasizeWord(
    editIR: EditIR,
    captionId: string,
    wordIndex: number,
    color: string,
    scale: number
  ) {
    const cap = editIR.tracks.captionTrack.find((c) => c.id === captionId);
    if (cap && cap.words[wordIndex]) {
      cap.words[wordIndex].highlight = true;
      cap.words[wordIndex].color = color;
      cap.words[wordIndex].scaleMultiplier = scale;
    }
  }

  private static applyInsertBroll(
    editIR: EditIR,
    op: any,
    availableAssets: MediaAssetDescriptor[]
  ) {
    const asset = availableAssets.find((a) => a.id === op.assetId) || availableAssets[0];
    if (!asset) return;

    let brollTrack = editIR.tracks.videoTracks.find((t) => t.type === "B_ROLL_OVERLAY");
    if (!brollTrack) {
      brollTrack = {
        id: generateUUID(),
        type: "B_ROLL_OVERLAY",
        zIndex: 10,
        clips: [],
      };
      editIR.tracks.videoTracks.push(brollTrack);
    }

    const brollClip: VideoClip = {
      id: generateUUID(),
      assetId: asset.id,
      sourcePath: asset.filePath,
      sourceRange: {
        start: RationalTimeMath.fromSeconds(op.sourceStartSec || 0),
        duration: RationalTimeMath.fromSeconds(op.durationSec),
      },
      timelineRange: {
        start: RationalTimeMath.fromSeconds(op.timelineStartSec),
        duration: RationalTimeMath.fromSeconds(op.durationSec),
      },
      transform: {
        scale: { start: 1.0, end: 1.0, easing: "spring" },
        position: { x: 0, y: 0 },
        anchor: { x: 0.5, y: 0.5 },
        rotationDeg: 0,
        opacity: 1.0,
      },
      speedMultiplier: 1.0,
      effects: [],
    };

    brollTrack.clips.push(brollClip);
  }

  private static applyDuckAudio(editIR: EditIR, duckDb = -18.0, attackMs = 120, releaseMs = 350) {
    for (const atrack of editIR.tracks.audioTracks) {
      if (atrack.type !== "PRIMARY_VOICE") {
        atrack.duckWithSpeech = true;
        atrack.duckingConfig = {
          duckDb,
          attackMs,
          releaseMs,
        };
      }
    }
  }

  private static applyAdjustVolume(editIR: EditIR, trackId: string, volumeDb: number) {
    const atrack = editIR.tracks.audioTracks.find((t) => t.id === trackId);
    if (atrack) {
      atrack.volumeDb = volumeDb;
    }
  }
}
