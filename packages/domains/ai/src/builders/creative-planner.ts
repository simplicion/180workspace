import {
  CreativeEditPlan,
  CreativeEditPlanSchema,
  TimelineContext,
  DirectorState,
  MediaIntelligenceGraph,
  MediaAssetDescriptor,
  DeterministicPlanner,
} from "@workspace/video-contracts";
import { AIProviderService } from "../kernel/ai-provider.service";
import { AICompanyConfigService } from "../kernel/ai-company-config.service";

export interface PlanGenerationParams {
  prompt: string;
  timelineContext: TimelineContext;
  mediaGraph: MediaIntelligenceGraph;
  directorState?: DirectorState;
  availableAssets?: MediaAssetDescriptor[];
  companyId?: string;
}

export class CreativePlanner {
  /**
   * Plans structured autonomous video edits.
   * Leverages company-configured LLM (Gemini, Claude, OpenAI) with strict schema adherence,
   * or falls back seamlessly to the Deterministic Local Creative Director engine.
   */
  static async plan(params: PlanGenerationParams): Promise<CreativeEditPlan> {
    const { prompt, timelineContext, mediaGraph, directorState, availableAssets, companyId } = params;

    // 1. Attempt Cloud LLM Generation if configured
    if (companyId) {
      try {
        const { settings } = await AICompanyConfigService.getCompanyAISettings(companyId);
        const isConfigured = Boolean(
          (settings.aiProvider === "gemini" && settings.geminiKey) ||
          (settings.aiProvider === "openai" && settings.openaiKey) ||
          (settings.aiProvider === "claude" && settings.claudeKey) ||
          (settings.aiProvider === "custom" && settings.customAiKey && settings.customAiUrl)
        );

        if (isConfigured) {
          const planFromLLM = await this.generateFromLLM(settings, prompt, timelineContext, mediaGraph);
          if (planFromLLM) {
            return planFromLLM;
          }
        }
      } catch (err: any) {
        console.warn("[CreativePlanner] Cloud AI planning fallback to deterministic engine:", err?.message);
      }
    }

    // 2. Deterministic Local Creative Director Engine (100% Offline & Analytical)
    return this.planDeterministically(prompt, timelineContext, mediaGraph, directorState, availableAssets);
  }

  /**
   * Prompts configured LLM with compact structured context and validates JSON schema output.
   */
  private static async generateFromLLM(
    settings: any,
    prompt: string,
    context: TimelineContext,
    graph: MediaIntelligenceGraph
  ): Promise<CreativeEditPlan | null> {
    const aiProvider = AIProviderService.getInstance();
    const client = await aiProvider.getClient(settings);
    if (!client) return null;

    const p = prompt.toLowerCase().trim();
    const isGreeting = /^(hi|hii+|hello|hey|heyy+|howdy|yo|greetings|good\s+(morning|afternoon|evening)|sup|what's\s+up)[!?.]*$/i.test(p);
    const isHelpOrQuery = /^(help|who\s+are\s+you|what\s+can\s+you\s+do|how\s+does\s+this\s+work|what\s+should\s+i\s+do)[!?.]*$/i.test(p);

    if (isGreeting || isHelpOrQuery) {
      const chatPrompt = `You are an elite, friendly video Creative Director co-pilot in 180 Media Studio.
The creator just said: "${prompt}".
The current timeline has ${context.clipsCount} clip(s) totaling ${context.projectDurationSec.toFixed(1)}s in ${context.currentAspect} aspect ratio.

Respond warmly, conversationally, and creatively in 2-3 engaging sentences. Introduce yourself as their Creative Director, acknowledge what is currently on their timeline, and invite them to share their vision or ask for editing/hook suggestions. Do NOT output code, JSON, or compiler jargon.`;

      try {
        const reply = await client.generate(chatPrompt);
        if (reply && reply.trim()) {
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
            explanation: reply.trim(),
            requiresConfirmation: false,
          };
        }
      } catch (err: any) {
        console.warn("[CreativePlanner] LLM greeting generation failed:", err?.message);
      }
    }

    const deadAirCount = graph.silences.filter((s) => s.classification === "DEAD_AIR").length;
    const topHook = graph.candidateHooks[0]?.transcriptSnippet || "None";
    const totalWords = graph.transcript.length;

    const systemPrompt = `You are an elite video creative director co-pilot in 180 Media Studio.
Given the project context, discuss the creative direction with the creator and propose structured edits with their consent.

Project Duration: ${context.projectDurationSec}s
Current Aspect: ${context.currentAspect}
Clips Count: ${context.clipsCount}
Dead Air Silences Detected: ${deadAirCount}
Top Hook Candidate: "${topHook}"
Total Words: ${totalWords}
User Message: "${prompt}"

Output a JSON object conforming to CreativeEditPlan schema:
{
  "explanation": "Your natural, collaborative creative proposal discussing the opening hook, pacing, and visual style. Ask if they want you to proceed with this edit.",
  "requiresConfirmation": true,
  "confirmationDetails": {
    "whatFound": "Summary of findings in media",
    "whatWillChange": "Clear bullet points of proposed changes",
    "assumptions": "Creative retention rationale"
  },
  "operations": []
}

Output strictly valid JSON. No markdown code blocks.`;

    try {
      const response = await client.generate(systemPrompt);
      const cleaned = response.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      // The prompt above only asks the model for explanation/confirmationDetails/operations —
      // backfill the schema's other required fields from what we already know about the
      // timeline rather than trusting the LLM to emit a fully-shaped CreativeEditPlan verbatim.
      if (!parsed.intent) {
        parsed.intent = {
          platform: "general",
          aspectRatio: context.currentAspect,
          resolution: context.currentResolution,
          stylePreset: "CUSTOM",
          energy: "medium",
          pacing: "dynamic",
          captionStyle: "HORMOZI_BOUNCE",
          audioStyle: "VOICE_PRIORITY_DUCKED",
          visualStyle: "CLEAN_ATTENTION",
        };
      }
      if (parsed.confirmationDetails && Array.isArray(parsed.confirmationDetails.whatWillChange)) {
        parsed.confirmationDetails.whatWillChange = parsed.confirmationDetails.whatWillChange.join("\n");
      }
      if (parsed.explanation && (!parsed.operations || parsed.operations.length === 0)) {
        parsed.requiresConfirmation = false;
      }
      const validated = CreativeEditPlanSchema.parse(parsed);

      // This prompt template only ever asks the LLM for explanation/confirmationDetails —
      // it never requests real operations, so a validated plan with none is conversational
      // framing, not an edit. Returning it as-is would silently make EditIRCompiler apply
      // zero changes; fall through to the deterministic engine instead, which is the only
      // thing in this pipeline that actually derives operations from real telemetry.
      if (validated.operations.length === 0) {
        return null;
      }
      return validated;
    } catch (err: any) {
      console.warn("[CreativePlanner] LLM parsing failed:", err?.message);
      return null;
    }
  }

  /**
   * 100% Deterministic Local Creative Director.
   * Algorithmically formulates a real CreativeEditPlan based on actual silences,
   * transcript emphasis words, face tracking coordinates, and imported project media.
   */
  public static planDeterministically(
    prompt: string,
    context: TimelineContext,
    graph: MediaIntelligenceGraph,
    directorState?: DirectorState,
    availableAssets: MediaAssetDescriptor[] = []
  ): CreativeEditPlan {
    return DeterministicPlanner.plan(prompt, context, graph, directorState, availableAssets);
  }
}
