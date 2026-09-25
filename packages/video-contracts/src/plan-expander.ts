import { CreativeEditPlan, CreativeOperation } from "./creative-plan.schema";
import { MediaIntelligenceGraph, TranscriptWordIntelligence, ClassifiedSilence } from "./media-intelligence.schema";
import { EditIR } from "./edit-ir.schema";
import { RationalTimeMath } from "./time";
import { MediaGraphBuilder } from "./media-graph";
import { MobileMediaDescriptor, mapSourceToTimeline } from "./mobile-edit-ir";

/**
 * PlanExpander turns high-level, transcript-driven operations (removeSilences, cleanFillers,
 * autoCaptions) into concrete primitive operations the EditIRCompiler executes.
 * The graph passed in must be in CURRENT TIMELINE coordinates (see graphFromMobileMedia).
 */
export class PlanExpander {
  static expand(plan: CreativeEditPlan, graph: MediaIntelligenceGraph, warnings: string[] = []): CreativeEditPlan {
    const out: CreativeOperation[] = [];
    for (const op of plan.operations) {
      switch (op.type) {
        case "removeSilences": {
          const cuts = this.silenceCuts(graph, op.minDurationSec, op.paddingSec);
          if (cuts.length === 0) {
            warnings.push(graph.silences.length === 0
              ? "removeSilences: no silence data (send media.silences or a transcript)"
              : `removeSilences: no pauses of ${op.minDurationSec}s or longer were found`);
          }
          out.push(...cuts);
          break;
        }
        case "cleanFillers": {
          const cuts = this.fillerCuts(graph, op.fillerTypes);
          if (graph.transcript.length === 0) warnings.push("cleanFillers: no transcript supplied");
          out.push(...cuts, op);
          break;
        }
        case "autoCaptions": {
          if (graph.transcript.length === 0) {
            warnings.push("autoCaptions: no transcript supplied, so captions were skipped");
            break;
          }
          out.push({ type: "clearCaptions" }, ...this.captionOps(graph.transcript, op));
          break;
        }
        default:
          out.push(op);
      }
    }
    return { ...plan, operations: out };
  }

  static silenceCuts(graph: MediaIntelligenceGraph, minDurationSec: number, paddingSec: number): CreativeOperation[] {
    const total = graph.technicalMetadata.durationSeconds;
    const ops: CreativeOperation[] = [];
    for (const s of graph.silences) {
      if (s.durationSeconds < minDurationSec) continue;
      const atStart = s.startSeconds <= 0.05;
      const atEnd = s.startSeconds + s.durationSeconds >= total - 0.05;
      const start = atStart ? 0 : s.startSeconds + paddingSec;
      const end = atEnd ? total : s.startSeconds + s.durationSeconds - paddingSec;
      if (end - start < 0.1) continue;
      ops.push({
        type: "removeRange",
        startSec: round3(start),
        durationSec: round3(end - start),
        ripple: true,
        reason: atStart ? "leading silence" : atEnd ? "trailing silence" : `pause (${s.durationSeconds.toFixed(2)}s)`,
      });
    }
    return ops;
  }

  static fillerCuts(graph: MediaIntelligenceGraph, fillerTypes: string[]): CreativeOperation[] {
    const words = graph.transcript;
    // Unicode-aware: keep letters, combining marks, digits and apostrophes (curly ones folded to ').
    const norm = (w: string) => w.normalize("NFC").toLowerCase().replace(/[‘’ʼ]/gu, "'").replace(/[^\p{L}\p{M}\p{N}']/gu, "");
    const patterns = fillerTypes.map((f) => f.toLowerCase().split(/\s+/).map(norm)).filter((p) => p.length > 0 && p[0]);
    const ops: CreativeOperation[] = [];
    for (let i = 0; i < words.length; i++) {
      for (const pat of patterns) {
        if (i + pat.length > words.length) continue;
        if (!pat.every((p, k) => norm(words[i + k].word) === p)) continue;
        const first = words[i];
        const last = words[i + pat.length - 1];
        // Extend into the following gap (up to 150ms) so the cut lands in silence.
        const next = words[i + pat.length];
        const end = next ? Math.min(next.startSeconds, last.endSeconds + 0.15) : last.endSeconds;
        ops.push({
          type: "removeRange",
          startSec: round3(first.startSeconds),
          durationSec: round3(Math.max(0.05, end - first.startSeconds)),
          ripple: true,
          reason: `filler word "${pat.join(" ")}"`,
        });
        i += pat.length - 1;
        break;
      }
    }
    return ops;
  }

  static captionOps(words: TranscriptWordIntelligence[], op: Extract<CreativeOperation, { type: "autoCaptions" }>): CreativeOperation[] {
    const ops: CreativeOperation[] = [];
    let chunk: TranscriptWordIntelligence[] = [];
    const flush = () => {
      if (chunk.length === 0) return;
      const start = chunk[0].startSeconds;
      const end = Math.max(chunk[chunk.length - 1].endSeconds, start + 0.3);
      const text = chunk.map((w) => (op.uppercase ? w.word.toUpperCase() : w.word)).join(" ");
      ops.push({
        type: "addCaption",
        startSec: round3(start),
        durationSec: round3(end - start),
        text,
        textColor: op.textColor,
        highlightColor: op.highlightColor,
        stylePreset: op.stylePreset,
        words: chunk.map((w) => ({
          word: op.uppercase ? w.word.toUpperCase() : w.word,
          startSec: round3(w.startSeconds),
          endSec: round3(Math.max(w.endSeconds, w.startSeconds + 0.02)),
          highlight: !!w.isEmphasis,
          scale: op.animation === "word_pop" ? 1.15 : 1.0,
          ...(w.isEmphasis ? { color: op.highlightColor } : {}),
        })),
        ...(op.fontSize ? { fontSize: op.fontSize } : {}),
        ...(op.position ? { position: op.position } : {}),
        uppercase: op.uppercase,
        animation: op.animation,
        ...(op.strokeColor ? { strokeColor: op.strokeColor } : {}),
        ...(op.strokeWidth !== undefined ? { strokeWidth: op.strokeWidth } : {}),
        ...(op.background ? { background: op.background } : {}),
      } as CreativeOperation);
      chunk = [];
    };
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const prev = chunk[chunk.length - 1];
      if (prev && (w.startSeconds - prev.endSeconds > 0.6 || /[.!?。！？।؟]$/u.test(prev.word))) flush();
      chunk.push(w);
      if (chunk.length >= op.wordsPerCaption) flush();
    }
    flush();
    return ops;
  }
}

const round3 = (v: number) => Math.round(v * 1000) / 1000;

/**
 * Builds a MediaIntelligenceGraph for a mobile client's clip, expressed in the CURRENT timeline
 * coordinates of `editIR` (source moments that were already cut away are dropped).
 * Silences come from the client, or are derived from transcript gaps (>= 0.5s) when omitted.
 */
export function graphFromMobileMedia(media: MobileMediaDescriptor, editIR: EditIR): MediaIntelligenceGraph {
  const assetId = media.assetId || "primary";
  const timelineDur = RationalTimeMath.toSeconds(editIR.meta.totalDuration);
  const srcDur = media.durationMs / 1000;
  const srcWords = (media.transcript?.words || [])
    .filter((w) => w.text.trim() && w.endMs >= w.startMs)
    .sort((a, b) => a.startMs - b.startMs);

  // Emphasis heuristic identical to the server transcriber: noticeably longer-than-median words.
  const durs = srcWords.map((w) => w.endMs - w.startMs).filter((d) => d > 0).sort((a, b) => a - b);
  const median = durs.length ? durs[Math.floor(durs.length / 2)] : 0;

  const words: TranscriptWordIntelligence[] = [];
  srcWords.forEach((w, idx) => {
    const s = mapSourceToTimeline(editIR, assetId, w.startMs / 1000);
    const e = mapSourceToTimeline(editIR, assetId, w.endMs / 1000);
    if (s == null || e == null || e < s) return;
    const d = w.endMs - w.startMs;
    const isEmphasis = median > 0 && d > median * 1.6 && w.text.replace(/[^\p{L}\p{M}\p{N}]/gu, "").length > 3;
    words.push({
      id: `w_${idx}`,
      word: w.text.trim(),
      startSeconds: round3(s),
      endSeconds: round3(e),
      confidence: 0.95,
      isEmphasis,
      emphasisScore: isEmphasis ? 0.8 : 0.2,
      energyScore: 0.5,
    });
  });

  let srcSilences: Array<{ start: number; end: number }> = (media.silences || []).map((s) => ({ start: s.startMs / 1000, end: s.endMs / 1000 }));
  if (!media.silences && srcWords.length > 0) {
    const gaps: Array<{ start: number; end: number }> = [];
    if (srcWords[0].startMs >= 300) gaps.push({ start: 0, end: srcWords[0].startMs / 1000 });
    for (let i = 1; i < srcWords.length; i++) {
      const gap = srcWords[i].startMs - srcWords[i - 1].endMs;
      if (gap >= 500) gaps.push({ start: srcWords[i - 1].endMs / 1000, end: srcWords[i].startMs / 1000 });
    }
    const lastEnd = srcWords[srcWords.length - 1].endMs / 1000;
    if (srcDur - lastEnd >= 0.3) gaps.push({ start: lastEnd, end: srcDur });
    srcSilences = gaps;
  }

  const silences: ClassifiedSilence[] = [];
  srcSilences.forEach((g, idx) => {
    const s = mapSourceToTimeline(editIR, assetId, g.start);
    const e = mapSourceToTimeline(editIR, assetId, g.end);
    if (s == null || e == null || e - s < 0.1) return;
    const dur = e - s;
    const classification = s <= 0.05 ? "START_SILENCE" : e >= timelineDur - 0.05 ? "END_SILENCE" : dur >= 0.5 ? "DEAD_AIR" : "SHORT_NATURAL_PAUSE";
    silences.push({
      id: `sil_${idx}`,
      timeRange: { start: RationalTimeMath.fromSeconds(s), duration: RationalTimeMath.fromSeconds(dur) },
      startSeconds: round3(s),
      durationSeconds: round3(dur),
      averageDecibels: -45,
      classification,
      recommendation: classification === "SHORT_NATURAL_PAUSE" ? "KEEP" : "REMOVE",
      confidence: 0.9,
      contextReason: classification === "DEAD_AIR" ? "pause between phrases" : classification.toLowerCase().replace("_", " "),
    });
  });

  return MediaGraphBuilder.build({
    assetId,
    technicalMetadata: {
      durationSeconds: timelineDur,
      width: media.width,
      height: media.height,
      fps: media.fps || 30,
      hasAudio: true,
      isVariableFrameRate: false,
      fileSizeBytes: 0,
      sha256Hash: "client-supplied",
    },
    transcript: words,
    silences,
  });
}
