import * as path from "path";
import * as fs from "fs";
import { ProductionPlan, ProductionTask } from "@workspace/video-contracts";
import { DirectorToolRegistry } from "../tools/registry";
import { DirectorExecutionContext } from "../tools/base-tool";

export interface PlanExecutorOptions {
  tempDir: string;
  onTaskStart?: (task: ProductionTask) => void;
  onTaskProgress?: (task: ProductionTask, percent: number, message: string) => void;
  onTaskComplete?: (task: ProductionTask, result: any) => void;
  onTaskError?: (task: ProductionTask, error: Error) => void;
  log?: (message: string) => void;
}

export class PlanExecutor {
  /**
   * Executes a ProductionPlan DAG step-by-step using registered VideoDirectorTools
   */
  static async executePlan(
    plan: ProductionPlan,
    options: PlanExecutorOptions
  ): Promise<ProductionPlan> {
    const registry = DirectorToolRegistry.getInstance();
    const artifacts = new Map<string, any>();

    if (!fs.existsSync(options.tempDir)) {
      fs.mkdirSync(options.tempDir, { recursive: true });
    }

    const context: DirectorExecutionContext = {
      projectId: plan.id,
      tempDir: options.tempDir,
      artifacts,
      log: options.log || ((msg) => console.log(msg)),
    };

    plan.status = "RUNNING";
    plan.updatedAt = new Date().toISOString();

    const completedTaskIds = new Set<string>();

    for (let i = 0; i < plan.tasks.length; i++) {
      const task = plan.tasks[i];
      plan.currentTaskId = task.id;

      // Check dependencies
      for (const depId of task.dependencies) {
        if (!completedTaskIds.has(depId)) {
          throw new Error(`PlanExecutor: Dependency '${depId}' not satisfied for task '${task.id}'`);
        }
      }

      task.status = "RUNNING";
      options.onTaskStart?.(task);

      const tool = registry.getRequired(task.toolName);
      const startTime = Date.now();

      // Tool progress adapter
      context.onProgress = (percent, message) => {
        task.progressPercent = percent;
        options.onTaskProgress?.(task, percent, message);
      };

      try {
        const result = await tool.run(task.toolInput, context);
        task.status = "COMPLETED";
        task.progressPercent = 100;
        task.resultArtifact = typeof result === "object" && result !== null ? result : { value: result };
        task.durationMs = Date.now() - startTime;
        completedTaskIds.add(task.id);
        options.onTaskComplete?.(task, result);
      } catch (err: any) {
        task.status = "FAILED";
        task.error = err.message;
        task.durationMs = Date.now() - startTime;
        plan.status = "FAILED";
        options.onTaskError?.(task, err);
        throw new Error(`PlanExecutor failed at [${task.id}:${task.toolName}]: ${err.message}`);
      }
    }

    plan.status = "COMPLETED";
    plan.currentTaskId = undefined;
    plan.updatedAt = new Date().toISOString();
    return plan;
  }
}
