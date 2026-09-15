import { z } from "zod";
import { EditIRSchema } from "./edit-ir.schema";
import { CommandTransactionSchema } from "./commands.schema";

/**
 * Imported Media Asset Reference Descriptor
 */
export const MediaAssetDescriptorSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  filePath: z.string(),
  fileSizeBytes: z.number().int(),
  mimeType: z.string(),
  durationSeconds: z.number(),
  width: z.number().int(),
  height: z.number().int(),
  fps: z.number(),
  hasAudio: booleanSchema(true),
  codecVideo: z.string().optional(),
  codecAudio: z.string().optional(),
  proxyPath: z.string().optional(),
  waveformPath: z.string().optional(),
  thumbnailPath: z.string().optional(),
  sha256Hash: z.string(),
});

function booleanSchema(def: boolean) {
  return z.boolean().default(def);
}

export type MediaAssetDescriptor = z.infer<typeof MediaAssetDescriptorSchema>;

/**
 * Project Package (.vproj) Manifest
 */
export const ProjectPackageManifestSchema = z.object({
  schemaVersion: z.literal(1),
  engineVersion: z.string().default("0.1.0"),
  project: z.object({
    id: z.string().uuid(),
    name: z.string(),
    companyId: z.string().uuid().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
  assets: z.array(MediaAssetDescriptorSchema),
  editIR: EditIRSchema,
  history: z.array(CommandTransactionSchema).default([]),
});

export type ProjectPackageManifest = z.infer<typeof ProjectPackageManifestSchema>;
