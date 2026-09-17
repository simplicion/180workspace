import {
  CreativeEditPlan,
  CreativeOperation,
  TimelineContext,
  DirectorState,
} from "./creative-plan.schema";
import { MediaIntelligenceGraph } from "./media-intelligence.schema";
import { MediaAssetDescriptor } from "./project.schema";
import { DirectorStyleResolver } from "./director-style-resolver";
import { DirectorIntentClassifier } from "./director-intent-classifier";

export class DeterministicPlanner {
  /**
   * 100% Deterministic Local Creative Director.
   * Algorithmically formulates a real CreativeEditPlan based on actual silences,
   * transcript emphasis words, face tracking coordinates, and imported project media.
   */
  public static plan(
    prompt: string,
    context: TimelineContext,
    graph: MediaIntelligenceGraph,
    _directorState?: DirectorState,
    availableAssets: MediaAssetDescriptor[] = []
  ): CreativeEditPlan {
    const p = prompt.toLowerCase().trim();
    const operations: CreativeOperation[] = [];

    // 0. Classify Intent Scope (Surgical vs Holistic)
    const classifiedScope = DirectorIntentClassifier.classifyIntent(prompt);

    // Check for conversational greetings or general queries
    const isGreeting = /^(hi|hii+|hello|hey|heyy+|howdy|yo|greetings|good\s+(morning|afternoon|evening)|sup|what's\s+up)[!?.]*$/i.test(p);
    const isHelpOrQuery = /^(help|who\s+are\s+you|what\s+can\s+you\s+do|how\s+does\s+this\s+work|what\s+should\s+i\s+do)[!?.]*$/i.test(p);

    if (isGreeting || isHelpOrQuery) {
      let greetingText = "";
      if (context.clipsCount === 0) {
        greetingText = `Hey there! 👋 I'm your Creative Director co-pilot.\n\nI'm here to help you structure, pace, and polish your video. Right now your timeline is clean. Upload your clips into the **Asset Bins** on the left, or tell me what kind of video you'd like to create (e.g. an Instagram Reel, a YouTube video, or a quick punchy product promo)!`;
      } else {
        greetingText = `Hey! 👋 Great to collaborate with you. I see you've got ${context.clipsCount} clip(s) on your timeline (${context.projectDurationSec.toFixed(1)}s total, ${context.currentAspect} format).\n\nTell me what you're aiming for—we can brainstorm an engaging opening hook, trim awkward pauses, format it for vertical Reels/TikTok, or add kinetic captions. How would you like to direct this video?`;
      }

      return {
        version: "1.0.0",
        intent: {
          platform: "general",
          aspectRatio: context.currentAspect,
          resolution: context.currentResolution,
          stylePreset: "CUSTOM",
          energy: "medium",
          pacing: "dynamic",
          captionStyle: "HORMOZI_BOUNCE",
          audioStyle: "VOICE_PRIORITY_DUCKED",
          visualStyle: "CLEAN_ATTENTION",
        },
        constraints: context.userConstraints,
        selectedSegments: [],
        removedSegments: [],
        reorderedSegments: [],
        brollPlan: [],
        captionPlan: [],
        operations: [],
        confidence: 0.98,
        explanation: greetingText,
        requiresConfirmation: false,
      };
    }

    // Resolve Conscious Director Style Parameters
    const resolvedStyle = DirectorStyleResolver.resolve(prompt);
    const targetAspect = resolvedStyle.targetAspect;
    const isHighEnergy = resolvedStyle.pacingMultiplier > 1.15;
    const isSurgical = classifiedScope.isSurgicalPatch;

    // 1. Aspect Ratio & Re-framing Operation (Only if not surgical or specifically allowed)
    if (!isSurgical && targetAspect !== context.currentAspect) {
      if (targetAspect === "9:16") {
        operations.push({
          type: "changeAspectRatio",
          targetAspect: "9:16",
          width: 1080,
          height: 1920,
        });
        operations.push({
          type: "reframeSubject",
          targetAspect: "9:16",
          smoothingFactor: 0.85,
        });
      } else if (targetAspect === "16:9") {

        operations.push({
          type: "changeAspectRatio",
          targetAspect: "16:9",
          width: 1920,
          height: 1080,
        });
        operations.push({
          type: "reframeSubject",
          targetAspect: "16:9",
          smoothingFactor: 0.85,
        });
      }
    }

    // 2. Dead Air & Silence Ripple Cuts
    const wantsCutSilences = isSurgical
      ? classifiedScope.allowedMutations.includes("TRIM_SILENCE")
      : p.includes("trim") || p.includes("silence") || p.includes("pause") || p.includes("dead air") || p.includes("cleanup") || isHighEnergy;
    let removedDurationAccumulator = 0;

    if (wantsCutSilences && graph.silences.length > 0) {
      for (const sil of graph.silences) {
        if (context.userConstraints.doNotRemoveIntro && sil.startSeconds < 5.0) {
          continue;
        }

        if (sil.classification === "DEAD_AIR" || (sil.classification === "START_SILENCE" && !context.userConstraints.doNotRemoveIntro)) {
          operations.push({
            type: "removeRange",
            startSec: sil.startSeconds,
            durationSec: sil.durationSeconds,
            ripple: true,
            reason: sil.contextReason,
          });
          removedDurationAccumulator += sil.durationSeconds;
        }
      }
    }

    // 3. Autonomous Shortening (e.g. "make it 30 seconds" or "turn into 30s")
    const shortenMatch = prompt.match(/\b(?:make it|turn this into|shorten to)\s+(\d+)\s*(?:seconds?|s)\b/i);
    let targetShortenDurationSec: number | undefined;
    if (shortenMatch && !isSurgical) {
      targetShortenDurationSec = parseInt(shortenMatch[1], 10);
    }

    let requiresConfirmation = false;
    let confirmationDetails: any;

    if (targetShortenDurationSec && targetShortenDurationSec < context.projectDurationSec) {
      requiresConfirmation = true;

      const sorted = [...graph.highlights].sort((a, b) => b.retentionCandidateScore - a.retentionCandidateScore);
      let accumulatedSec = 0;
      const keepSegmentIds = new Set<string>();

      for (const seg of sorted) {
        if (accumulatedSec + seg.durationSeconds <= targetShortenDurationSec + 2.0) {
          keepSegmentIds.add(seg.id);
          accumulatedSec += seg.durationSeconds;
        }
      }

      for (const seg of graph.highlights) {
        if (!keepSegmentIds.has(seg.id) && seg.durationSeconds >= 1.5) {
          if (!context.userConstraints.doNotRemoveIntro || seg.startSeconds >= 5.0) {
            operations.push({
              type: "removeRange",
              startSec: seg.startSeconds,
              durationSec: seg.durationSeconds,
              ripple: true,
              reason: `Autonomous shortening: low-information segment (${seg.summary})`,
            });
            removedDurationAccumulator += seg.durationSeconds;
          }
        }
      }

      confirmationDetails = {
        whatFound: `I analyzed ${context.projectDurationSec.toFixed(1)}s of footage with ${graph.transcript.length} words across ${graph.sentences.length} sentences.`,
        whatWillChange: `I will condense the timeline to approximately ${targetShortenDurationSec}s by prioritizing your strongest claims, removing ${removedDurationAccumulator.toFixed(1)}s of dead air, and reframing to ${targetAspect}.`,
        assumptions: "Preserves the most informative sections while cutting secondary explanations.",
      };
    }

    // 4. Auto-Zoom / Spring Punch Keyframing
    const wantsZooms = isSurgical
      ? classifiedScope.allowedMutations.includes("ADD_ZOOMS")
      : p.includes("zoom") || p.includes("punch") || p.includes("camera") || isHighEnergy;
    if (wantsZooms) {
      const emphasisWords = graph.transcript.filter((w) => w.isEmphasis || w.emphasisScore > 0.7);
      let lastZoomEnd = 0;
      const faceCoords = graph.faces[0]?.averageCoords || { x: 0.5, y: targetAspect === "9:16" ? 0.38 : 0.42 };

      for (const ew of emphasisWords) {
        if (ew.startSeconds - lastZoomEnd >= 2.5) {
          operations.push({
            type: "addZoom",
            startSec: ew.startSeconds,
            durationSec: 1.4,
            targetType: "FACE",
            targetCoords: faceCoords,
            scale: isHighEnergy ? 1.35 : 1.25,
            motionBlur: true,
            reason: `Emphasis punch on key word: "${ew.word}"`,
          });
          lastZoomEnd = ew.startSeconds + 1.4;
        }
      }

      if (operations.filter((o) => o.type === "addZoom").length === 0 && context.projectDurationSec > 4) {
        operations.push({
          type: "addZoom",
          startSec: 1.2,
          durationSec: 1.6,
          targetType: "FACE",
          targetCoords: faceCoords,
          scale: resolvedStyle.zoomScale,
          motionBlur: true,
          reason: "Introductory visual attention punch",
        });
      }
    }

    // 5. Kinetic Captions
    const wantsCaptions = isSurgical
      ? classifiedScope.allowedMutations.includes("ADD_CAPTIONS") || classifiedScope.allowedMutations.includes("MUTATE_CAPTIONS")
      : p.includes("caption") || p.includes("subtitle") || p.includes("hormozi") || p.includes("text") || isHighEnergy;
    const activeCaptionHighlight = classifiedScope.captionColorOverride || resolvedStyle.captionColors.highlight;

    if (wantsCaptions && graph.transcript.length > 0) {
      const words = graph.transcript;
      const chunkSize = targetAspect === "9:16" ? 4 : 5;

      for (let i = 0; i < words.length; i += chunkSize) {
        const slice = words.slice(i, i + chunkSize);
        const startSec = slice[0].startSeconds;
        const endSec = slice[slice.length - 1].endSeconds;
        const text = slice.map((w) => w.word).join(" ");

        operations.push({
          type: "addCaption",
          startSec,
          durationSec: Math.max(0.5, endSec - startSec),
          text,
          highlightColor: activeCaptionHighlight,
          textColor: resolvedStyle.captionColors.primary || "#FFFFFF",
          words: slice.map((w, wIdx) => ({
            word: w.word,
            startSec: w.startSeconds,
            endSec: w.endSeconds,
            highlight: w.isEmphasis || wIdx === 0,
            scale: w.isEmphasis ? 1.2 : 1.0,
            color: (w.isEmphasis || wIdx === 0) ? activeCaptionHighlight : (resolvedStyle.captionColors.primary || "#FFFFFF"),
          })),
          stylePreset: resolvedStyle.captionPreset === "HORMOZI_BOUNCE" ? "HORMOZI_BOUNCE" : "ALI_ABDAAL_CLEAN",
        });
      }
    }

    // 6. Contextual B-Roll & Visual Graphics Insertion
    const wantsBroll = isSurgical
      ? classifiedScope.allowedMutations.includes("INSERT_GRAPHICS")
      : p.includes("b-roll") || p.includes("broll") || p.includes("product") || p.includes("footage") || p.includes("overlay") || p.includes("visual");
    if (wantsBroll && availableAssets.length > 1) {
      const secondaryAsset = availableAssets.find((a) => !context.assetIds.includes(a.id)) || availableAssets[1];
      if (secondaryAsset) {
        const insertTime = Math.min(context.projectDurationSec * 0.4, 4.0);
        operations.push({
          type: "insertBroll",
          assetId: secondaryAsset.id,
          timelineStartSec: insertTime,
          durationSec: Math.min(3.0, secondaryAsset.durationSeconds || 3.0),
          sourceStartSec: 0,
          cropMode: "center",
          reason: `Contextual B-roll cutaway using uploaded asset: ${secondaryAsset.name}`,
        });
      }
    }

    // 7. Audio Ducking
    const wantsDucking = isSurgical
      ? classifiedScope.allowedMutations.includes("DUCK_AUDIO")
      : p.includes("duck") || p.includes("music") || p.includes("bgm") || p.includes("audio") || isHighEnergy;

    if (wantsDucking) {
      operations.push({
        type: "duckAudio",
        duckDb: resolvedStyle.duckingDb,
        attackMs: 120,
        releaseMs: 350,
      });
    }

    // 8. Visual Filters & Tone Grade (Arbitrary / Named Presets)
    const wantsFilter =
      p.includes("filter") ||
      p.includes("grade") ||
      p.includes("look") ||
      p.includes("noir") ||
      p.includes("black and white") ||
      p.includes("b&w") ||
      p.includes("monochrome") ||
      p.includes("vivid") ||
      p.includes("teal") ||
      p.includes("vintage") ||
      p.includes("warm") ||
      p.includes("retro") ||
      p.includes("cyber") ||
      p.includes("neon") ||
      p.includes("glow") ||
      p.includes("brightness") ||
      p.includes("contrast") ||
      p.includes("saturation");

    if (wantsFilter) {
      let filterPreset = "NORMAL";
      let brightness = 1.0;
      let contrast = 1.0;
      let saturation = 1.0;

      if (p.includes("noir") || p.includes("black and white") || p.includes("b&w") || p.includes("monochrome")) {
        filterPreset = "NOIR_BW";
        contrast = 1.3;
        saturation = 0.0;
      } else if (p.includes("vivid") || p.includes("saturated") || p.includes("punchy")) {
        filterPreset = "VIVID";
        brightness = 1.05;
        contrast = 1.2;
        saturation = 1.35;
      } else if (p.includes("teal") || p.includes("orange") || p.includes("blockbuster") || p.includes("cinematic")) {
        filterPreset = "CINEMATIC_TEAL_ORANGE";
        brightness = 0.98;
        contrast = 1.25;
        saturation = 1.2;
      } else if (p.includes("vintage") || p.includes("warm") || p.includes("70s") || p.includes("retro")) {
        filterPreset = "VINTAGE_WARM";
        brightness = 1.05;
        contrast = 1.1;
        saturation = 1.15;
      } else if (p.includes("cyber") || p.includes("neon") || p.includes("futuristic")) {
        filterPreset = "CYBER_NEON";
        brightness = 1.1;
        contrast = 1.35;
        saturation = 1.5;
      } else if (p.includes("glow") || p.includes("soft") || p.includes("dreamy")) {
        filterPreset = "GLOW";
        brightness = 1.12;
        contrast = 1.08;
        saturation = 1.1;
      }

      operations.push({
        type: "applyFilter",
        clipId: context.selectedClipId || undefined,
        preset: filterPreset,
        brightness,
        contrast,
        saturation,
        reason: `Applied visual tone filter (${filterPreset})`,
      });
    }

    // 9. Detach Audio
    const wantsDetachAudio = p.includes("detach audio") || p.includes("split audio") || p.includes("extract audio") || p.includes("separate audio");
    if (wantsDetachAudio && (context.selectedClipId || context.clipsCount > 0)) {
      operations.push({
        type: "detachAudio",
        clipId: context.selectedClipId || "main_clip",
        reason: "Detached clip audio into separate audio track",
      });
    }

    let explanation = "";
    if (targetShortenDurationSec) {
      explanation = `Shortened project to approximately ${targetShortenDurationSec}s while retaining high-retention highlights and framing for ${targetAspect}.`;
    } else if (operations.length > 0) {
      requiresConfirmation = true;
      confirmationDetails = {
        whatFound: `I analyzed your project (${context.clipsCount} clip${context.clipsCount === 1 ? "" : "s"}, ${context.projectDurationSec.toFixed(1)}s total). Detected ${graph.silences.filter((s) => s.classification === "DEAD_AIR").length} silence pause(s) and speech beats.`,
        whatWillChange: [
          targetAspect !== context.currentAspect ? `• Reframe canvas to ${targetAspect}` : null,
          removedDurationAccumulator > 0 ? `• Ripple-trim ${removedDurationAccumulator.toFixed(1)}s of dead air pauses` : null,
          wantsZooms ? `• Add punch-in camera zooms on key emphasis beats` : null,
          wantsCaptions ? `• Synchronize kinetic word captions` : null,
          wantsDucking ? `• Duck background audio during speech` : null,
        ]
          .filter(Boolean)
          .join("\n") || `• Apply ${operations.length} styling operations`,
        assumptions: "Optimized for high retention, narrative flow, and engagement.",
      };

      explanation =
        `Here is a creative edit direction I recommend:\n\n` +
        `1. **Opening Hook**: Start directly when dialogue begins to capture attention immediately.\n` +
        `2. **Pacing & Cuts**: ${removedDurationAccumulator > 0 ? `Ripple-trim ${removedDurationAccumulator.toFixed(1)}s of dead air to keep momentum fast.` : `Keep cuts rhythmic and aligned to speech beats.`}\n` +
        `3. **Visual Polish**: ${wantsZooms ? `Add dynamic spring zoom punches on emphasis words.` : `Maintain clean subject centering.`}\n` +
        `4. **Subtitles**: ${wantsCaptions ? `Layer bouncing kinetic captions for sound-off viewers.` : `Keep visual canvas clean and uncluttered.`}\n\n` +
        `Would you like me to proceed and apply this plan to your timeline?`;
    } else {
      explanation = `I reviewed your project (${context.clipsCount} clip${context.clipsCount === 1 ? "" : "s"}, ${context.projectDurationSec.toFixed(1)}s total). Everything is set up nicely.\n\nTell me how you'd like to shape it—for example, we could trim pauses, reframe for vertical Reels, add dynamic captions, or punch up the intro!`;
    }

    return {
      version: "1.0.0",
      intent: {
        platform: targetAspect === "9:16" ? "instagram" : "youtube",
        aspectRatio: targetAspect,
        resolution: targetAspect === "9:16" ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 },
        stylePreset: resolvedStyle.presetKey as any,
        energy: isHighEnergy ? "high" : "medium",
        pacing: isHighEnergy ? "fast-natural" : "dynamic",
        captionStyle: resolvedStyle.captionPreset === "HORMOZI_BOUNCE" ? "HORMOZI_BOUNCE" : "ALI_ABDAAL_CLEAN",
        audioStyle: "VOICE_PRIORITY_DUCKED",
        visualStyle: "CLEAN_ATTENTION",
      },
      constraints: context.userConstraints,
      selectedSegments: [],
      removedSegments: [],
      reorderedSegments: [],
      brollPlan: [],
      captionPlan: [],
      operations,
      confidence: 0.94,
      explanation,
      requiresConfirmation,
      confirmationDetails,
    };
  }
}
