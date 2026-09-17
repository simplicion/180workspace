import { VisualCueTarget } from "../tools/analysis/mood-classifier.tool";
import { MoodTone } from "../skills/base-skill";

export interface EntityExtractionOptions {
  userPrompt?: string;
  genre?: string;
  minIntervalSeconds?: number;
  defaultDurationSeconds?: number;
}

export class SemanticEntityExtractor {
  /**
   * Common salient entities and their preferred visual/SFX taxonomy
   */
  private static readonly KNOWN_ENTITIES: Record<
    string,
    {
      category: VisualCueTarget["category"];
      sfxType: VisualCueTarget["sfxType"];
      mood: MoodTone;
      defaultQuery: string;
    }
  > = {
    // Animals & Creatures
    panda: { category: "EMOJI_3D", sfxType: "POP", mood: "PLAYFUL_COMEDIC", defaultQuery: "panda" },
    dinosaur: { category: "EMOJI_3D", sfxType: "WHOOSH", mood: "EXCITED_VIRAL", defaultQuery: "dinosaur" },
    ant: { category: "ICON_VECTOR", sfxType: "ALERT", mood: "URGENT_WARNING", defaultQuery: "ant" },
    fire: { category: "EMOJI_3D", sfxType: "WHOOSH", mood: "EXCITED_VIRAL", defaultQuery: "fire" },
    money: { category: "EMOJI_3D", sfxType: "DING", mood: "EXCITED_VIRAL", defaultQuery: "money_bag" },
    rocket: { category: "EMOJI_3D", sfxType: "WHOOSH", mood: "EXCITED_VIRAL", defaultQuery: "rocket" },
    brain: { category: "EMOJI_3D", sfxType: "POP", mood: "CALM_EDUCATIONAL", defaultQuery: "brain" },

    // Medical & Anatomy
    sciatica: { category: "ANATOMICAL_DIAGRAM", sfxType: "ALERT", mood: "CLINICAL_AUTHORITY", defaultQuery: "sciatica_nerve" },
    nerve: { category: "ANATOMICAL_DIAGRAM", sfxType: "ALERT", mood: "CLINICAL_AUTHORITY", defaultQuery: "nerve_compression" },
    spine: { category: "ANATOMICAL_DIAGRAM", sfxType: "POP", mood: "CLINICAL_AUTHORITY", defaultQuery: "spine_vertebra" },
    back: { category: "ANATOMICAL_DIAGRAM", sfxType: "POP", mood: "CLINICAL_AUTHORITY", defaultQuery: "back_anatomy" },
    massage: { category: "CALLOUT_CARD", sfxType: "ALERT", mood: "URGENT_WARNING", defaultQuery: "massage_caution" },
    doctor: { category: "CALLOUT_CARD", sfxType: "CHIME", mood: "CLINICAL_AUTHORITY", defaultQuery: "verified_doctor" },

    // Safety & Attention
    danger: { category: "WARNING_BADGE", sfxType: "ALERT", mood: "URGENT_WARNING", defaultQuery: "danger_hazard" },
    warning: { category: "WARNING_BADGE", sfxType: "ALERT", mood: "URGENT_WARNING", defaultQuery: "warning_badge" },
    wrong: { category: "WARNING_BADGE", sfxType: "ALERT", mood: "URGENT_WARNING", defaultQuery: "cross_prohibited" },
    check: { category: "CALLOUT_CARD", sfxType: "DING", mood: "CLINICAL_AUTHORITY", defaultQuery: "green_checkmark" },
    growth: { category: "METRIC_STAT", sfxType: "DING", mood: "EXCITED_VIRAL", defaultQuery: "growth_chart" },
  };

  /**
   * Open-world entity and visual anchor extractor.
   * Scans transcript tokens and prompt to identify salient visual moments.
   */
  static extractAnchors(
    segments: Array<{ text?: string; transcript?: string; durationSec?: number; words?: any[] }>,
    options: EntityExtractionOptions = {}
  ): VisualCueTarget[] {
    const minInterval = options.minIntervalSeconds ?? 6.0;
    const defaultDuration = options.defaultDurationSeconds ?? 3.5;
    const cues: VisualCueTarget[] = [];
    const alternatingPositions: Array<"UPPER_RIGHT" | "UPPER_LEFT"> = ["UPPER_RIGHT", "UPPER_LEFT"];

    let currentTimelineOffset = 0;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const text = (seg.text || seg.transcript || (seg.words ? seg.words.map((w: any) => w.word).join(" ") : "")).toLowerCase();
      const segDuration = seg.durationSec || 8.0;

      // Tokenize words
      const words = text
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3);

      let foundCueInSeg = false;

      // 1. Check known salient entity dictionary (handles plurals and phrases)
      for (const [entityKey, entityDef] of Object.entries(this.KNOWN_ENTITIES)) {
        if (foundCueInSeg) break;
        if (text.includes(entityKey)) {
          const triggerTime = Number((currentTimelineOffset + Math.min(1.0, segDuration * 0.2)).toFixed(2));
          const lastCue = cues[cues.length - 1];

          if (!lastCue || triggerTime - lastCue.timestampSec >= minInterval) {
            const pos = alternatingPositions[cues.length % alternatingPositions.length];
            cues.push({
              id: `cue_${cues.length + 1}_${entityKey}`,
              timestampSec: triggerTime,
              durationSec: defaultDuration,
              category: entityDef.category,
              assetQuery: entityDef.defaultQuery,
              mood: entityDef.mood,
              position: pos,
              sfxType: entityDef.sfxType,
              spokenContextText: entityKey,
            });
            foundCueInSeg = true;
          }
        }
      }

      // 2. Open-world noun/concept fallback if prompt mentions specific visual objects
      if (!foundCueInSeg && options.userPrompt) {
        const promptLower = options.userPrompt.toLowerCase();
        const promptTokens = promptLower
          .replace(/[^a-z0-9\s-]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length >= 4 && !["video", "short", "edit", "make", "create"].includes(w));

        for (const pt of promptTokens) {
          if (foundCueInSeg) break;
          if (text.includes(pt)) {
            const triggerTime = Number((currentTimelineOffset + Math.min(1.0, segDuration * 0.2)).toFixed(2));
            const lastCue = cues[cues.length - 1];
            if (!lastCue || triggerTime - lastCue.timestampSec >= minInterval) {
              const pos = alternatingPositions[cues.length % alternatingPositions.length];
              cues.push({
                id: `cue_prompt_${cues.length + 1}_${pt}`,
                timestampSec: triggerTime,
                durationSec: defaultDuration,
                category: "ICON_VECTOR",
                assetQuery: pt,
                mood: "CALM_EDUCATIONAL",
                position: pos,
                sfxType: "POP",
                spokenContextText: pt,
              });
              foundCueInSeg = true;
            }
          }
        }
      }

      currentTimelineOffset += segDuration;
    }

    return cues;
  }
}
