-- AlterTable
ALTER TABLE "SocialConversation" ADD COLUMN     "aiAgentActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isHumanTakeover" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SocialEngagementRule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT,
    "socialAccountId" TEXT,
    "postId" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "triggerType" TEXT NOT NULL,
    "triggerKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "matchMode" TEXT NOT NULL DEFAULT 'contains',
    "actionAutoLike" BOOLEAN NOT NULL DEFAULT true,
    "actionPublicReplies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "actionSendDm" BOOLEAN NOT NULL DEFAULT true,
    "actionDmTemplate" TEXT NOT NULL,
    "actionDmDeliverableUrl" TEXT,
    "actionDmButtons" JSONB DEFAULT '[]',
    "actionEnableAiAgent" BOOLEAN NOT NULL DEFAULT true,
    "aiAgentGoal" TEXT NOT NULL DEFAULT 'qualify_lead',
    "aiAgentPromptOverride" TEXT,
    "statsTriggeredCount" INTEGER NOT NULL DEFAULT 0,
    "statsDmsSentCount" INTEGER NOT NULL DEFAULT 0,
    "statsCommentsLiked" INTEGER NOT NULL DEFAULT 0,
    "statsLeadsConverted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialEngagementRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialInteractionLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platformCommentId" TEXT,
    "platformMessageId" TEXT,
    "recipientId" TEXT NOT NULL,
    "recipientHandle" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "commentLiked" BOOLEAN NOT NULL DEFAULT false,
    "publicReplySent" TEXT,
    "dmSent" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialInteractionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialEngagementRule_companyId_status_idx" ON "SocialEngagementRule"("companyId", "status");

-- CreateIndex
CREATE INDEX "SocialEngagementRule_companyId_projectId_idx" ON "SocialEngagementRule"("companyId", "projectId");

-- CreateIndex
CREATE INDEX "SocialEngagementRule_socialAccountId_triggerType_idx" ON "SocialEngagementRule"("socialAccountId", "triggerType");

-- CreateIndex
CREATE INDEX "SocialEngagementRule_postId_idx" ON "SocialEngagementRule"("postId");

-- CreateIndex
CREATE INDEX "SocialInteractionLog_companyId_ruleId_idx" ON "SocialInteractionLog"("companyId", "ruleId");

-- CreateIndex
CREATE INDEX "SocialInteractionLog_platform_recipientId_platformCommentId_idx" ON "SocialInteractionLog"("platform", "recipientId", "platformCommentId");

-- AddForeignKey
ALTER TABLE "SocialEngagementRule" ADD CONSTRAINT "SocialEngagementRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialEngagementRule" ADD CONSTRAINT "SocialEngagementRule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialEngagementRule" ADD CONSTRAINT "SocialEngagementRule_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialEngagementRule" ADD CONSTRAINT "SocialEngagementRule_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialInteractionLog" ADD CONSTRAINT "SocialInteractionLog_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "SocialEngagementRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

