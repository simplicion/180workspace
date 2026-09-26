-- Social OS P1/P4: agent run event log, per-project agent memory, project media index.
CREATE TABLE IF NOT EXISTS "AgentRunEvent" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "projectId" TEXT,
    "companyId" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "ts" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentRunEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AgentRunEvent_companyId_projectId_idx" ON "AgentRunEvent"("companyId", "projectId");
CREATE INDEX IF NOT EXISTS "AgentRunEvent_runId_idx" ON "AgentRunEvent"("runId");
CREATE INDEX IF NOT EXISTS "AgentRunEvent_ts_idx" ON "AgentRunEvent"("ts");

CREATE TABLE "AgentMemory" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'all',
    "key" TEXT,
    "text" TEXT NOT NULL,
    "payload" JSONB,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgentMemory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AgentMemory_companyId_projectId_kind_idx" ON "AgentMemory"("companyId", "projectId", "kind");
CREATE INDEX "AgentMemory_companyId_projectId_key_idx" ON "AgentMemory"("companyId", "projectId", "key");

CREATE TABLE "MediaIndexEntry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "startMs" INTEGER,
    "endMs" INTEGER,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MediaIndexEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MediaIndexEntry_companyId_projectId_idx" ON "MediaIndexEntry"("companyId", "projectId");
CREATE INDEX "MediaIndexEntry_companyId_projectId_assetId_kind_idx" ON "MediaIndexEntry"("companyId", "projectId", "assetId", "kind");
