-- Engagement rules can target posts published outside 180 Workspace by their platform media id.
ALTER TABLE "SocialEngagementRule" ADD COLUMN "platformMediaId" TEXT;
ALTER TABLE "SocialEngagementRule" ADD COLUMN "platformMediaPermalink" TEXT;
ALTER TABLE "SocialEngagementRule" ADD COLUMN "platformMediaThumbnail" TEXT;
CREATE INDEX "SocialEngagementRule_socialAccountId_platformMediaId_idx" ON "SocialEngagementRule"("socialAccountId", "platformMediaId");
