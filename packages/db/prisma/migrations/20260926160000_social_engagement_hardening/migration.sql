-- 180 Engagement hardening: per-post dedup key, deferred (rate-limited) events, AI agent opt-in.
ALTER TABLE "SocialInteractionLog" ADD COLUMN "platformMediaId" TEXT,
ADD COLUMN "payload" JSONB,
ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "nextAttemptAt" TIMESTAMP(3);

CREATE INDEX "SocialInteractionLog_companyId_ruleId_recipientId_platformMediaId_idx" ON "SocialInteractionLog"("companyId", "ruleId", "recipientId", "platformMediaId");
CREATE INDEX "SocialInteractionLog_status_nextAttemptAt_idx" ON "SocialInteractionLog"("status", "nextAttemptAt");

-- The AI DM agent answers only where a rule or a person switched it on.
ALTER TABLE "SocialConversation" ALTER COLUMN "aiAgentActive" SET DEFAULT false;
