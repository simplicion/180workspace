-- AlterTable
ALTER TABLE "SocialAccount" ADD COLUMN     "reauthReason" TEXT,
ALTER COLUMN "accessToken" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SocialPost" ADD COLUMN     "nextPublishAttemptAt" TIMESTAMP(3),
ADD COLUMN     "publishAttemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "publishLeaseUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SocialPostVariant" ADD COLUMN     "attemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalUrl" TEXT,
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "lastErrorCode" TEXT,
ADD COLUMN     "lastErrorRetryable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publishLeaseUntil" TIMESTAMP(3),
ADD COLUMN     "publishStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "socialAccountId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "social_account_credentials" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "accessTokenEnc" TEXT NOT NULL,
    "refreshTokenEnc" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "tokenType" TEXT,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keyId" TEXT NOT NULL,
    "lastRefreshedAt" TIMESTAMP(3),
    "refreshFailureCount" INTEGER NOT NULL DEFAULT 0,
    "lastRefreshError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_account_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_oauth_sessions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "platform" TEXT NOT NULL,
    "client" TEXT NOT NULL DEFAULT 'web',
    "redirectUri" TEXT NOT NULL,
    "codeVerifierEnc" TEXT,
    "candidatesEnc" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_oauth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_publish_attempts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "variantId" TEXT,
    "platform" TEXT NOT NULL,
    "socialAccountId" TEXT,
    "trigger" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'started',
    "externalId" TEXT,
    "externalUrl" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "retryable" BOOLEAN NOT NULL DEFAULT false,
    "triggeredById" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "social_publish_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "social_account_credentials_socialAccountId_key" ON "social_account_credentials"("socialAccountId");

-- CreateIndex
CREATE INDEX "social_account_credentials_companyId_idx" ON "social_account_credentials"("companyId");

-- CreateIndex
CREATE INDEX "social_account_credentials_accessTokenExpiresAt_idx" ON "social_account_credentials"("accessTokenExpiresAt");

-- CreateIndex
CREATE INDEX "social_oauth_sessions_companyId_userId_idx" ON "social_oauth_sessions"("companyId", "userId");

-- CreateIndex
CREATE INDEX "social_oauth_sessions_expiresAt_idx" ON "social_oauth_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "social_publish_attempts_companyId_postId_idx" ON "social_publish_attempts"("companyId", "postId");

-- CreateIndex
CREATE INDEX "social_publish_attempts_postId_platform_idx" ON "social_publish_attempts"("postId", "platform");

-- CreateIndex
CREATE INDEX "SocialPost_status_scheduledFor_idx" ON "SocialPost"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "SocialPost_status_nextPublishAttemptAt_idx" ON "SocialPost"("status", "nextPublishAttemptAt");

-- CreateIndex
CREATE INDEX "SocialPostVariant_publishStatus_platform_idx" ON "SocialPostVariant"("publishStatus", "platform");

-- AddForeignKey
ALTER TABLE "SocialPostVariant" ADD CONSTRAINT "SocialPostVariant_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_account_credentials" ADD CONSTRAINT "social_account_credentials_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_publish_attempts" ADD CONSTRAINT "social_publish_attempts_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_publish_attempts" ADD CONSTRAINT "social_publish_attempts_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "SocialPostVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_publish_attempts" ADD CONSTRAINT "social_publish_attempts_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Data backfill (WS4): variants already listed in a post's publishedLinks are marked published so the
-- new idempotent dispatcher never re-posts them after this migration.
UPDATE "SocialPostVariant" v
SET "publishStatus" = 'published',
    "externalUrl" = p."publishedLinks" ->> v."platform",
    "publishedAt" = COALESCE(p."publishedAt", CURRENT_TIMESTAMP)
FROM "SocialPost" p
WHERE v."postId" = p."id"
  AND p."publishedLinks" IS NOT NULL
  AND jsonb_typeof(p."publishedLinks"::jsonb) = 'object'
  AND (p."publishedLinks"::jsonb) ? v."platform";

-- Plaintext tokens left in "SocialAccount"."accessToken"/"refreshToken" are moved into the encrypted vault by
-- `SocialTokenVault.migrateLegacyPlaintextTokens()` (npm script: social:migrate-tokens), which needs the
-- SOCIAL_TOKEN_ENCRYPTION_KEY and therefore cannot run in SQL.
