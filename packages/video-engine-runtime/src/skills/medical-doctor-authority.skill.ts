import { DirectorSkill, VisualCueRule, MoodTone } from "./base-skill";
import { ResolvedDirectorStyle } from "@workspace/video-contracts";

export class MedicalDoctorAuthoritySkill implements DirectorSkill {
  id = "medical-doctor-authority";
  name = "Medical Doctor Authority & Healthcare Credibility";
  genre = "Medical / Healthcare / Physiotherapy";
  description =
    "Engineered for physicians, chiropractors, physical therapists, and wellness authorities. Embeds anatomical diagrams, caution/red-flag warning badges, clinical checkmarks, and authoritative pacing.";
  defaultPresetKey = "HORMOZI_VIRAL" as const;

  pacingMultiplier = 1.15;
  deadAirTrimThresholdSeconds = 0.45;
  zoomFrequencySeconds = 6.0;
  zoomScale = 1.25;

  captionPreset = "HORMOZI_BOUNCE" as const;
  captionColors = {
    primary: "#FFFFFF",
    highlight: "#FFE600", // Electric Yellow
  };
  safeMarginVPercent = 0.22;

  soundDesignEnabled = true;
  duckingDb = -18.0;

  retentionRules = {
    maxVisualStagnationSeconds: 5.0,
    requireHookInFirstSeconds: 3.0,
    targetOverlayDensityPerMinute: 4,
  };

  visualCueRules: VisualCueRule[] = [
    {
      keywords: [
        "sciatica", "nerve", "sciatic", "spine", "lumbar", "disc", "compression", "pinched",
        "floor", "baithte", "pair", "so jata", "नर्व", "स्पाइन", "पैरों", "दर्द", "spinal", "anesthesia", "पोजिशन"
      ],
      category: "ANATOMICAL_DIAGRAM",
      suggestedAssetQuery: "sciatica_spine_nerve_diagram",
      mood: "CLINICAL_AUTHORITY",
      preferredPosition: "UPPER_RIGHT",
      durationSeconds: 3.5,
      sfxType: "POP",
    },
    {
      keywords: [
        "danger", "dangerous", "warning", "caution", "mistake", "wrong", "do not", "never", "worse",
        "irritate", "misconception", "क्लियर", "गलती", "सावधानी", "खतरा", "clear"
      ],
      category: "WARNING_BADGE",
      suggestedAssetQuery: "medical_caution_warning_badge",
      mood: "URGENT_WARNING",
      preferredPosition: "UPPER_LEFT",
      durationSeconds: 2.8,
      sfxType: "ALERT",
    },
    {
      keywords: [
        "massage", "foam roller", "ball", "gluteal", "piriformis", "stretch", "therapy",
        "दबाव", "प्रेशर", "मसाज", "दवाई", "सिग्नल", "pressure", "दवाई"
      ],
      category: "ANATOMICAL_DIAGRAM",
      suggestedAssetQuery: "gluteal_massage_therapy_illustration",
      mood: "CLINICAL_AUTHORITY",
      preferredPosition: "UPPER_RIGHT",
      durationSeconds: 3.2,
      sfxType: "POP",
    },
    {
      keywords: [
        "doctor", "physician", "clinic", "hospital", "specialist", "medical", "treatment", "diagnosis",
        "डॉक्टर", "अस्पताल", "इलाज", "सलाह", "consultation"
      ],
      category: "CALLOUT_CARD",
      suggestedAssetQuery: "verified_doctor_badge",
      mood: "CLINICAL_AUTHORITY",
      preferredPosition: "UPPER_RIGHT",
      durationSeconds: 3.0,
      sfxType: "CHIME",
    },
    {
      keywords: [
        "pain", "relief", "cure", "heal", "better", "solution", "technique", "safe", "exercise",
        "एक्सरसाइज", "राहत", "सही", "safe", "cure"
      ],
      category: "ICON_VECTOR",
      suggestedAssetQuery: "medical_health_cross_checkmark",
      mood: "CALM_EDUCATIONAL",
      preferredPosition: "UPPER_RIGHT",
      durationSeconds: 2.5,
      sfxType: "DING",
    },
  ];

  matchScore(prompt: string, transcriptSummary?: string): number {
    const combined = `${prompt} ${transcriptSummary || ""}`.toLowerCase();
    let score = 0;
    const medicalTokens = [
      "doctor", "dr.", "dr ", "medical", "clinic", "pain", "sciatica",
      "nerve", "spine", "physio", "therapy", "massage", "symptom", "patient",
      "hospital", "healthcare", "treatment"
    ];
    for (const token of medicalTokens) {
      if (combined.includes(token)) score += 20;
    }
    return Math.min(score, 100);
  }

  resolveStyle(prompt: string): ResolvedDirectorStyle {
    const isVertical = !prompt.toLowerCase().includes("16:9");
    return {
      presetKey: "HORMOZI_VIRAL",
      targetAspect: isVertical ? "9:16" : "16:9",
      pacingMultiplier: this.pacingMultiplier,
      zoomFrequencySeconds: this.zoomFrequencySeconds,
      zoomScale: this.zoomScale,
      deadAirTrimThresholdSeconds: this.deadAirTrimThresholdSeconds,
      captionPreset: this.captionPreset,
      captionColors: { ...this.captionColors },
      brollFrequencySeconds: 6.0,
      soundDesignEnabled: this.soundDesignEnabled,
      duckingDb: this.duckingDb,
      safeMarginVPercent: this.safeMarginVPercent,
      aestheticRationale:
        "Medical Doctor Authority: Authoritative pacing, high-contrast white & yellow kinetic captions in safe envelope (22% bottom margin), spring pop-in anatomical illustrations with synced acoustic sound cues, and speech-ducked BGM.",
    };
  }
}
