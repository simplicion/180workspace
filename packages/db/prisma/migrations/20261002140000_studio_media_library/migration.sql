-- Studio library metadata in the database (media files stay on the device).
CREATE TABLE "StudioMediaFolder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "colorValue" BIGINT NOT NULL DEFAULT 4283385573,
    "parentId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudioMediaFolder_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StudioMediaFolder_companyId_projectId_idx" ON "StudioMediaFolder"("companyId", "projectId");

CREATE TABLE "StudioMediaAsset" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT,
    "folderId" TEXT,
    "pieceId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "fileSizeBytes" BIGINT NOT NULL DEFAULT 0,
    "takeIndex" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "noteContent" TEXT,
    "noteCategory" TEXT,
    "deviceId" TEXT,
    "localPath" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudioMediaAsset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StudioMediaAsset_companyId_projectId_idx" ON "StudioMediaAsset"("companyId", "projectId");
CREATE INDEX "StudioMediaAsset_companyId_pieceId_idx" ON "StudioMediaAsset"("companyId", "pieceId");
