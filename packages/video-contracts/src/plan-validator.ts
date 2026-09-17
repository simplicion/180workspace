import {
  CreativeEditPlan,
  CreativeEditPlanSchema,
  CreativeOperation,
} from "./creative-plan.schema";
import { EditIR } from "./edit-ir.schema";
import { MediaAssetDescriptor } from "./project.schema";

export interface PlanValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  validatedPlan?: CreativeEditPlan;
}

export class CreativePlanValidator {
  /**
   * Validates a CreativeEditPlan against schema, asset registry, timeline bounds,
   * track permissions, and explicit user constraints.
   */
  static validate(
    plan: any,
    currentEditIR: EditIR,
    availableAssets: MediaAssetDescriptor[] = []
  ): PlanValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Strict Schema Validation
    const parseResult = CreativeEditPlanSchema.safeParse(plan);
    if (!parseResult.success) {
      return {
        valid: false,
        errors: parseResult.error.errors.map((e) => `Schema error at ${e.path.join(".")}: ${e.message}`),
        warnings: [],
      };
    }

    const validatedPlan = parseResult.data;
    const knownAssetIds = new Set(availableAssets.map((a) => a.id));
    const lockedTrackIds = new Set(validatedPlan.constraints.lockedTrackIds || []);

    // 2. Validate Operations
    for (let i = 0; i < validatedPlan.operations.length; i++) {
      const op = validatedPlan.operations[i];

      // Check track locking
      if ("trackId" in op && op.trackId && lockedTrackIds.has(op.trackId)) {
        errors.push(`Operation #${i} (${op.type}) attempts to modify locked track ${op.trackId}`);
      }

      // Check asset references for B-roll or replacement
      if (op.type === "insertBroll" || op.type === "addImage") {
        if (knownAssetIds.size > 0 && !knownAssetIds.has(op.assetId)) {
          errors.push(`Operation #${i} (${op.type}) references unknown assetId "${op.assetId}"`);
        }
      }

      // Check timestamps sanity
      if ("startSec" in op && op.startSec < 0) {
        errors.push(`Operation #${i} (${op.type}) has negative startSec: ${op.startSec}`);
      }
      if ("durationSec" in op && op.durationSec <= 0) {
        errors.push(`Operation #${i} (${op.type}) has non-positive durationSec: ${op.durationSec}`);
      }

      // 3. User Constraints Enforcement
      if (validatedPlan.constraints.doNotRemoveIntro && op.type === "removeRange") {
        if (op.startSec < 5.0) {
          errors.push(`Operation #${i} (removeRange at ${op.startSec}s) violates constraint 'doNotRemoveIntro'`);
        }
      }

      // Check protected time ranges
      if (op.type === "removeRange" || op.type === "rippleDelete") {
        for (const prot of validatedPlan.constraints.protectedTimeRanges) {
          const protEnd = prot.startSec + prot.durationSec;
          if (op.type === "removeRange") {
            const opEnd = op.startSec + op.durationSec;
            if (Math.max(op.startSec, prot.startSec) < Math.min(opEnd, protEnd)) {
              errors.push(
                `Operation #${i} (removeRange) intersects protected time range (${prot.startSec}s - ${protEnd}s)`
              );
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      validatedPlan: errors.length === 0 ? validatedPlan : undefined,
    };
  }
}
