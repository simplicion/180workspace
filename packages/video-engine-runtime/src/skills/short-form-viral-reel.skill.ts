import { DirectorSkill, VisualCueRule } from "./base-skill";
import { ResolvedDirectorStyle } from "@workspace/video-contracts";

export class ShortFormViralReelSkill implements DirectorSkill {
  id = "short-form-viral-reel";
  name = "Short-Form Viral Reel & High-Retention Hook";
  genre = "Reels / TikTok / Shorts / Hormozi Style";
  description =
    "Designed for maximum viral retention. Embeds 3D animated emojis, rapid spring camera punches every 3-5s, Hormozi-style bouncing captions, and crisp high-transient sound design.";
  defaultPresetKey = "HORMOZI_VIRAL" as const;

  pacingMultiplier = 1.30;
  deadAirTrimThresholdSeconds = 0.30;
  zoomFrequencySeconds = 4.5;
  zoomScale = 1.30;

  captionPreset = "HORMOZI_BOUNCE" as const;
  captionColors = {
    primary: "#FFFFFF",
    highlight: "#00FF88", // Electric Green
  };
  safeMarginVPercent = 0.22;

  soundDesignEnabled = true;
  duckingDb = -18.0;

  retentionRules = {
    maxVisualStagnationSeconds: 3.5,
    requireHookInFirstSeconds: 2.0,
    targetOverlayDensityPerMinute: 6,
  };

  visualCueRules: VisualCueRule[] = [
    {
      keywords: ["money", "dollar", "profit", "cash", "sales", "revenue", "grow", "scale", "rich"],
      category: "EMOJI_3D",
      suggestedAssetQuery: "fluent_money_bag_3d",
      mood: "EXCITED_VIRAL",
      preferredPosition: "UPPER_RIGHT",
      durationSeconds: 2.5,
      sfxType: "DING",
    },
    {
      keywords: ["secret", "hack", "trick", "unlock", "hidden", "key", "strategy"],
      category: "EMOJI_3D",
      suggestedAssetQuery: "fluent_glowing_key_3d",
      mood: "EXCITED_VIRAL",
      preferredPosition: "UPPER_LEFT",
      durationSeconds: 2.5,
      sfxType: "POP",
    },
    {
      keywords: ["warning", "mistake", "stop", "never", "fail", "wrong", "trap"],
      category: "WARNING_BADGE",
      suggestedAssetQuery: "danger_hazard_octagon_badge",
      mood: "URGENT_WARNING",
      preferredPosition: "UPPER_LEFT",
      durationSeconds: 2.5,
      sfxType: "ALERT",
    },
    {
      keywords: ["fire", "insane", "crazy", "huge", "massive", "unbelievable", "boom"],
      category: "EMOJI_3D",
      suggestedAssetQuery: "fluent_fire_flame_3d",
      mood: "EXCITED_VIRAL",
      preferredPosition: "UPPER_RIGHT",
      durationSeconds: 2.2,
      sfxType: "WHOOSH",
    },
    {
      keywords: ["ant", "bug", "insect", "small", "tiny"],
      category: "ICON_VECTOR",
      suggestedAssetQuery: "ant_insect_danger_icon",
      mood: "URGENT_WARNING",
      preferredPosition: "UPPER_RIGHT",
      durationSeconds: 2.5,
      sfxType: "POP",
    },
  ];

  matchScore(prompt: string, transcriptSummary?: string): number {
    const combined = `${prompt} ${transcriptSummary || ""}`.toLowerCase();
    let score = 0;
    const viralTokens = [
      "viral", "reel", "tiktok", "shorts", "hormozi", "mrbeast", "hook",
      "retention", "fast", "punchy", "growth", "instagram"
    ];
    for (const token of viralTokens) {
      if (combined.includes(token)) score += 20;
    }
    return Math.min(score, 100);
  }

  resolveStyle(prompt: string): ResolvedDirectorStyle {
    return {
      presetKey: "HORMOZI_VIRAL",
      targetAspect: "9:16",
      pacingMultiplier: this.pacingMultiplier,
      zoomFrequencySeconds: this.zoomFrequencySeconds,
      zoomScale: this.zoomScale,
      deadAirTrimThresholdSeconds: this.deadAirTrimThresholdSeconds,
      captionPreset: this.captionPreset,
      captionColors: { ...this.captionColors },
      brollFrequencySeconds: 5.0,
      soundDesignEnabled: this.soundDesignEnabled,
      duckingDb: this.duckingDb,
      safeMarginVPercent: this.safeMarginVPercent,
      aestheticRationale:
        "Short-Form Viral: 1.30x speed-cadence cuts, rapid spring zooms every 4.5s, electric green 3-word kinetic captions in safe zone, 3D animated emoji pop-ins with acoustic SFX.",
    };
  }
}
