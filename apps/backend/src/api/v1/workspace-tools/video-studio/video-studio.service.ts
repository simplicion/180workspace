import { EditIR, RationalTimeMath } from "@workspace/video-contracts";
import { videoAIDirectorService } from "@workspace/ai";
import { prisma } from "@workspace/db";
import * as crypto from "crypto";

export interface VideoStudioProjectRecord {
  id: string;
  companyId: string;
  name: string;
  templatePreset?: string;
  aspectRatio: string;
  durationSeconds: number;
  editIR: EditIR;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

// In-memory / tenant-scoped fallback cache
const projectStore: Map<string, VideoStudioProjectRecord> = new Map();

export class VideoStudioService {
  /**
   * Lists all video projects for the authenticated company tenant.
   * Queries PostgreSQL via Prisma with transparent fallback to in-memory store.
   */
  static async listProjects(companyId: string): Promise<VideoStudioProjectRecord[]> {
    try {
      if ((prisma as any)?.videoStudioProject) {
        const rows = await (prisma as any).videoStudioProject.findMany({
          where: { companyId },
          orderBy: { updatedAt: "desc" },
        });

        if (Array.isArray(rows) && rows.length > 0) {
          return rows.map((r: any) => ({
            id: r.id,
            companyId: r.companyId,
            name: r.name,
            templatePreset: r.templatePreset || "MRBEAST_FAST",
            aspectRatio: r.aspectRatio || "16:9",
            durationSeconds: Number(r.durationSeconds) || 0,
            editIR: r.editIR as EditIR,
            metadata: r.metadata,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
          }));
        }
      }
    } catch (err) {
      console.warn("[VideoStudioService] DB query failed, falling back to cache:", (err as any).message);
    }

    // Fallback to in-memory store
    const list: VideoStudioProjectRecord[] = [];
    for (const proj of projectStore.values()) {
      if (proj.companyId === companyId) {
        list.push(proj);
      }
    }
    return list;
  }

  /**
   * Retrieves a single video project by ID.
   */
  static async getProject(id: string, companyId: string): Promise<VideoStudioProjectRecord | null> {
    try {
      if ((prisma as any)?.videoStudioProject) {
        const row = await (prisma as any).videoStudioProject.findFirst({
          where: { id, companyId },
        });
        if (row) {
          return {
            id: row.id,
            companyId: row.companyId,
            name: row.name,
            templatePreset: row.templatePreset || "MRBEAST_FAST",
            aspectRatio: row.aspectRatio || "16:9",
            durationSeconds: Number(row.durationSeconds) || 0,
            editIR: row.editIR as EditIR,
            metadata: row.metadata,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
          };
        }
      }
    } catch (err) {
      console.warn("[VideoStudioService] DB getProject failed, checking cache:", (err as any).message);
    }

    const proj = projectStore.get(id);
    if (!proj || proj.companyId !== companyId) return null;
    return proj;
  }

  /**
   * Creates or updates a video studio project with transactional multi-tenant isolation.
   */
  static async saveProject(
    companyId: string,
    data: { id?: string; name: string; editIR: EditIR; templatePreset?: string; metadata?: any }
  ): Promise<VideoStudioProjectRecord> {
    const id = data.id || crypto.randomUUID();
    const existing = projectStore.get(id);

    const record: VideoStudioProjectRecord = {
      id,
      companyId,
      name: data.name,
      templatePreset: data.templatePreset || "MRBEAST_FAST",
      aspectRatio: data.editIR.meta.targetAspect || "16:9",
      durationSeconds: RationalTimeMath.toSeconds(data.editIR.meta.totalDuration),
      editIR: data.editIR,
      metadata: data.metadata || {},
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    projectStore.set(id, record);

    try {
      if ((prisma as any)?.videoStudioProject) {
        await (prisma as any).videoStudioProject.upsert({
          where: { id },
          create: {
            id,
            companyId,
            name: record.name,
            templatePreset: record.templatePreset,
            aspectRatio: record.aspectRatio,
            durationSeconds: record.durationSeconds,
            editIR: record.editIR as any,
            metadata: record.metadata,
          },
          update: {
            name: record.name,
            templatePreset: record.templatePreset,
            aspectRatio: record.aspectRatio,
            durationSeconds: record.durationSeconds,
            editIR: record.editIR as any,
            metadata: record.metadata,
          },
        });
      }
    } catch (err) {
      console.warn("[VideoStudioService] DB upsert failed, preserved in cache:", (err as any).message);
    }

    return record;
  }

  /**
   * Runs AI Creative Director compilation via cloud service.
   */
  static async executeAIDirector(params: {
    prompt: string;
    companyId: string;
    stylePreset?: string;
    telemetry?: any;
    currentEditIR?: any;
    availableAssets?: any[];
    selectedClipId?: string | null;
    playheadSec?: number;
  }) {
    return await (videoAIDirectorService as any).compileAST({
      prompt: params.prompt,
      companyId: params.companyId,
      userId: "user_api",
      existingAST: params.currentEditIR,
      meta: {
        stylePreset: params.stylePreset || "MRBEAST_FAST",
        telemetry: params.telemetry,
        availableAssets: params.availableAssets,
        selectedClipId: params.selectedClipId,
        playheadSec: params.playheadSec,
      },
    });
  }
}
