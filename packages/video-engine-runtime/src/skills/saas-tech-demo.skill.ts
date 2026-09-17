import { DirectorSkill, VisualCueRule } from "./base-skill";
import { ResolvedDirectorStyle } from "@workspace/video-contracts";

export class SaaSTechDemoSkill implements DirectorSkill {
  id = "saas-tech-demo";
  name = "SaaS Product Demo & Tech Explainer";
  genre = "Software / DevTools / Screencast / Product Walkthrough";
  description =
    "Optimized for modern software companies and technical founders. Sleek UI callout cards, ice-blue typography accents, gentle zooms, and subtle UI sound design.";
  defaultPresetKey = "SAAS_DEMO" as const;

  pacingMultiplier = 1.05;
  deadAirTrimThresholdSeconds = 0.6;
  zoomFrequencySeconds = 10.0;
  zoomScale = 1.15;

  captionPreset = "ALI_ABDAAL_CLEAN" as const;
  captionColors = {
    primary: "#FFFFFF",
    highlight: "#38BDF8", // Ice Blue
  };
  safeMarginVPercent = 0.18;

  soundDesignEnabled = true;
  duckingDb = -15.0;

  retentionRules = {
    maxVisualStagnationSeconds: 7.0,
    requireHookInFirstSeconds: 4.0,
    targetOverlayDensityPerMinute: 3,
  };

  visualCueRules: VisualCueRule[] = [
    {
      keywords: ["ai", "agent", "autonomous", "code", "software", "api", "cloud", "model", "llm"],
      category: "ICON_VECTOR",
      suggestedAssetQuery: "tech_ai_sparkle_neural_icon",
      mood: "CALM_EDUCATIONAL",
      preferredPosition: "UPPER_RIGHT",
      durationSeconds: 3.0,
      sfxType: "CHIME",
    },
    {
      keywords: ["feature", "tool", "dashboard", "analytics", "graph", "metric", "speed", "fast"],
      category: "METRIC_STAT",
      suggestedAssetQuery: "tech_speed_analytics_card",
      mood: "CALM_EDUCATIONAL",
      preferredPosition: "UPPER_RIGHT",
      durationSeconds: 3.0,
      sfxType: "POP",
    },
  ];

  matchScore(prompt: string, transcriptSummary?: string): number {
    const combined = `${prompt} ${transcriptSummary || ""}`.toLowerCase();
    let score = 0;
    const techTokens = ["saas", "software", "code", "coding", "agent", "demo", "tech", "app", "ui", "platform"];
    for (const token of techTokens) {
      if (combined.includes(token)) score += 20;
    }
    return Math.min(score, 100);
  }

  resolveStyle(prompt: string): ResolvedDirectorStyle {
    const isVertical = prompt.toLowerCase().includes("9:16") || prompt.toLowerCase().includes("reel");
    return {
      presetKey: "SAAS_DEMO",
      targetAspect: isVertical ? "9:16" : "16:9",
      pacingMultiplier: this.pacingMultiplier,
      zoomFrequencySeconds: this.zoomFrequencySeconds,
      zoomScale: this.zoomScale,
      deadAirTrimThresholdSeconds: this.deadAirTrimThresholdSeconds,
      captionPreset: this.captionPreset,
      captionColors: { ...this.captionColors },
      brollFrequencySeconds: 8.0,
      soundDesignEnabled: this.soundDesignEnabled,
      duckingDb: this.duckingDb,
      safeMarginVPercent: this.safeMarginVPercent,
      aestheticRationale:
        "SaaS Tech Demo: Calm technical pacing, ice-blue accents, smooth spring UI focuses, and subtle acoustic interface clicks.",
    };
  }
}
