-- 180 Manager: chat transcripts and text-based video intelligence (media never stored server-side).
-- CreateTable
CREATE TABLE "ManagerConversation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL DEFAULT '180 Manager Chat',
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagerConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagerMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "intent" TEXT,
    "suggestedActions" JSONB DEFAULT '[]',
    "delegatedAgent" TEXT,
    "tokenUsage" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagerMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostVideoIntelligence" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "postId" TEXT,
    "assetUrl" TEXT,
    "durationSec" DOUBLE PRECISION,
    "hookScore" INTEGER NOT NULL DEFAULT 0,
    "visualHookAnalysis" TEXT,
    "audioHookTranscript" TEXT,
    "pacingScore" INTEGER NOT NULL DEFAULT 0,
    "cutsPerMinute" DOUBLE PRECISION,
    "energyLevel" TEXT,
    "detectedFormat" TEXT,
    "speechTranscript" TEXT,
    "viralityHypothesis" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostVideoIntelligence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ManagerConversation_companyId_projectId_idx" ON "ManagerConversation"("companyId", "projectId");

CREATE INDEX "ManagerMessage_conversationId_idx" ON "ManagerMessage"("conversationId");

CREATE UNIQUE INDEX "PostVideoIntelligence_postId_key" ON "PostVideoIntelligence"("postId");

CREATE INDEX "PostVideoIntelligence_companyId_projectId_idx" ON "PostVideoIntelligence"("companyId", "projectId");

-- AddForeignKey
ALTER TABLE "ManagerConversation" ADD CONSTRAINT "ManagerConversation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerConversation" ADD CONSTRAINT "ManagerConversation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerMessage" ADD CONSTRAINT "ManagerMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ManagerConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostVideoIntelligence" ADD CONSTRAINT "PostVideoIntelligence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostVideoIntelligence" ADD CONSTRAINT "PostVideoIntelligence_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostVideoIntelligence" ADD CONSTRAINT "PostVideoIntelligence_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

