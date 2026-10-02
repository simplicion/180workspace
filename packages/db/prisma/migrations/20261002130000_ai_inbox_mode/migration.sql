-- AI inbox per account (off | reply | qualify) and lead qualification on conversations.
ALTER TABLE "SocialAccount" ADD COLUMN "aiInboxMode" TEXT NOT NULL DEFAULT 'off';
ALTER TABLE "SocialAccount" ADD COLUMN "aiInboxInstructions" TEXT;
ALTER TABLE "SocialConversation" ADD COLUMN "leadScore" INTEGER;
ALTER TABLE "SocialConversation" ADD COLUMN "leadStage" TEXT;
ALTER TABLE "SocialConversation" ADD COLUMN "leadQualification" JSONB;
ALTER TABLE "SocialConversation" ADD COLUMN "leadQualifiedAt" TIMESTAMP(3);
CREATE INDEX "SocialConversation_companyId_leadStage_idx" ON "SocialConversation"("companyId", "leadStage");
