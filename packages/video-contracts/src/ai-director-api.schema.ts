import { z } from "zod";
import { MobileMediaDescriptorSchema, MobileEditIRSchema } from "./mobile-edit-ir";

/** Chat turn supplied by the client (oldest first). */
export const DirectorHistoryTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(4000),
});

export type DirectorHistoryTurn = z.infer<typeof DirectorHistoryTurnSchema>;

/**
 * POST /media-editor/ai-direct — mobile form (client supplies its own media analysis).
 * Contract doc: docs/social-studio-mobile/AI_DIRECTOR_CONTRACT.md §2.1
 */
export const MobileAIDirectRequestSchema = z.object({
  /**
   * The command. May be empty only for `intent:"greet"` (the opening turn); otherwise 1..2000 chars.
   */
  prompt: z.string().trim().max(2000).default(""),
  /** "greet" = opening turn: brand-aware greeting + a proposal that requires confirmation. */
  intent: z.enum(["edit", "greet"]).optional(),
  history: z.array(DirectorHistoryTurnSchema).max(20).optional(),
  /**
   * Social project id (brand consciousness is loaded from it) and, when no currentEditIR is sent,
   * the id echoed as `editIR.projectId`. An id the server cannot resolve to a project of the
   * caller's company is ignored for brand purposes (a warning is returned).
   */
  projectId: z.string().min(1).max(128).optional(),
  /** Calendar piece being edited: script, hook, platform and target length are loaded from it. */
  calendarPieceId: z.string().min(1).max(128).optional(),
  /** Social post being edited (its calendar piece and project are followed when set). */
  postId: z.string().min(1).max(128).optional(),
  media: MobileMediaDescriptorSchema,
  currentEditIR: MobileEditIRSchema.nullable().optional(),
}).superRefine((v, ctx) => {
  const greet = v.intent === "greet" || (!v.prompt && (v.projectId || v.calendarPieceId || v.postId));
  if (!v.prompt && !greet) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["prompt"], message: "prompt is required (1..2000 chars) unless intent is \"greet\"" });
  }
});

export type MobileAIDirectRequest = z.infer<typeof MobileAIDirectRequestSchema>;

export type PlannerSource = "llm" | "deterministic";
