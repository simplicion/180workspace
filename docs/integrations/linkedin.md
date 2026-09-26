# 180 Workspace — LinkedIn Integration Infrastructure

## 1. Architecture Overview

180 Workspace integrates with LinkedIn via a capability-governed, multi-tenant distribution architecture supporting both personal member profiles (Share on LinkedIn) and company pages (Community Management API).

```
                      +---------------------------------------+
                      | Autonomous AI Agent / Studio Composer |
                      +---------------------------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |        LinkedInPublishingTools        |
                      |   - Multi-tenant verification (scope) |
                      |   - Project isolation guards          |
                      |   - Autonomy mode enforcement         |
                      |   - Dynamic capability checks         |
                      +---------------------------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |        LinkedInProviderFactory        |
                      |  (Transparent Live / Mock Provider)   |
                      +---------------------------------------+
                                     /         \
                                    /           \
                 (Mock / Sandbox)  /             \  (Production Live)
                                  v               v
                +----------------------+   +-----------------------------+
                | MockLinkedInProvider |   |    LinkedInLiveProvider     |
                | - Pure deterministic |   | - Versioned REST (v202507)  |
                | - Edge simulations   |   | - Rate limiter & backoff    |
                | - Zero external reqs |   | - Circuit breaker (5xx/429) |
                +----------------------+   | - Multipart video uploader  |
                                           | - SocialActions comments/rx |
                                           +-----------------------------+
                                                          |
                                                          v
                                           +-----------------------------+
                                           |      LinkedIn REST API      |
                                           +-----------------------------+
```

---

## 2. Dual-App Context & Product Status

180 Workspace is provisioned with two distinct LinkedIn Developer applications:

1. **Application A (Share on LinkedIn)**:
   - App ID: `263861645`
   - Access Tier: **Default Tier** (Approved & Provisioned)
   - Capabilities: Personal member commentary, image, video, and article posting (`openid`, `profile`, `w_member_social`).

2. **Application B (Community Management API)**:
   - App ID: `263851696`
   - Client ID: `86pw8v11tzmorr`
   - Access Tier: **Development Tier** (Review in progress)
   - Capabilities: Organization/Company page management, feed posting (`w_organization_social`), comments, reactions, and page analytics.

---

## 3. Dynamic Capability Model (`LinkedInCapabilities`)

Permissions are never assumed or hard-coded to `true`. They are dynamically evaluated based on the account type, granted token scopes, and company page administrative roles:

| Capability | Member Account | Organization Page | Required Scopes | Required Page Role |
|---|---|---|---|---|
| `canConnectAccount` | Yes | Yes | `openid` | None |
| `canReadProfile` | Yes | Yes | `profile` or `openid` | None |
| `canCreateMemberPost` | Yes | No | `w_member_social` | None |
| `canCreateOrganizationPost` | No | Yes | `w_organization_social` | `ADMINISTRATOR`, `DIRECT_SPONSORED_CONTENT_POSTER` |
| `canUploadImage` | Yes | Yes | `w_member_social` / `w_organization_social` | Appropriate for target |
| `canUploadVideo` | Yes | Yes | `w_member_social` / `w_organization_social` | Appropriate for target |
| `canUploadDocument` | Yes | Yes | `w_member_social` / `w_organization_social` | Appropriate for target |
| `canReadComments` | No* | Yes | `r_organization_social` / `r_organization_social_feed` | Page admin/analyst |
| `canCreateComment` | No | Yes | `w_organization_social` / `w_organization_social_feed` | Page admin/content admin |
| `canDeleteComment` | No | Yes | `w_organization_social` / `w_organization_social_feed` | Page admin/content admin |
| `canReadReactions` | No* | Yes | `r_organization_social` / `r_organization_social_feed` | Page admin/analyst |
| `canCreateReaction` | No | Yes | `w_organization_social` / `w_organization_social_feed` | Page admin/content admin |
| `canReadAnalytics` | No | Yes | `r_organization_social` | Page admin/analyst |

*\*Note: `r_member_social_feed` is restricted by LinkedIn to select enterprise partners. Member feed read access is kept disabled until provisioned.*

---

## 4. Environment Variables

All environment variables follow 180 Workspace security standards. Secret values are never committed or printed in logs.

```bash
# Provider Mode: "mock" (default if credentials missing or review pending) | "live"
LINKEDIN_PROVIDER_MODE=mock

# Application B (Community Management) Credentials
LINKEDIN_CLIENT_ID=86pw8v11tzmorr
LINKEDIN_CLIENT_SECRET=********************************

# API Versioning (Centralized: default 202507, configurable for sunset transitions)
LINKEDIN_API_VERSION=202507

# Base URLs
LINKEDIN_API_BASE_URL=https://api.linkedin.com/rest
LINKEDIN_OAUTH_AUTH_URL=https://www.linkedin.com/oauth/v2/authorization
LINKEDIN_OAUTH_TOKEN_URL=https://www.linkedin.com/oauth/v2/accessToken
LINKEDIN_USERINFO_URL=https://api.linkedin.com/v2/userinfo

# Scopes override (optional, defaults to provisioned scopes)
# LINKEDIN_SCOPES=openid profile w_member_social r_organization_social w_organization_social rw_organization_admin

# Community Management approval flag: "review_in_progress" | "approved" | "not_provisioned"
LINKEDIN_COMMUNITY_MANAGEMENT_STATUS=review_in_progress

# Rate limiting and resilience
LINKEDIN_REQUEST_TIMEOUT_MS=30000
LINKEDIN_MAX_RETRIES=3
LINKEDIN_RATE_LIMIT_RPS=10
LINKEDIN_DEV_TIER_DAILY_LIMIT=500
```

---

## 5. OAuth 2.0 Flow & Token Security

1. **Initiation (`GET /oauth/linkedin/authorize?projectId&redirectUri&client=web|mobile`)**:
   - Backend issues an HMAC-SHA256 signed, single-use `state` nonce containing `companyId`, `userId`, `projectId`, `redirectUri`, and expiration timestamp.
   - Creates a pending session in `SocialOAuthSession`.
2. **Callback (`GET /oauth/linkedin/callback`)**:
   - Verifies state signature, expiration, and ensures single-use consumption.
   - Exchanges authorization code via `https://www.linkedin.com/oauth/v2/accessToken`.
   - Discovers personal member profile (`/v2/userinfo`) and administrative organizations (`/rest/organizationAcls`).
3. **Encrypted Token Storage (`SocialTokenVault`)**:
   - Access tokens and refresh tokens are AES-256-GCM encrypted with `SOCIAL_TOKEN_ENCRYPTION_KEY`.
   - Stored in the `social_account_credentials` table (never returned in account listings or frontend payloads).
   - Proactive refresh handles token renewals before expiry.

---

## 6. Media Studio & Publishing Flow

1. **Rendering**:
   - Media Studio produces rendered MP4 videos or static image carousel bundles on the user's device / desktop runtime.
   - AI never fabricates pixels directly.
2. **Upload Preparation**:
   - Simple Media (`image`, `document`): Calls `/rest/images?action=initializeUpload` or `/rest/documents?action=initializeUpload`, executes binary `PUT`, and captures asset URN.
   - Video (`video`): Calls `/rest/videos?action=initializeUpload`, streams byte chunks according to `uploadInstructions`, captures ETags, finalizes upload, and polls `/rest/videos/{urn}` until status is `AVAILABLE`.
3. **Publication**:
   - Builds normalized `LinkedInPostDraft` with escaped commentary.
   - Submits to `/rest/posts`.
   - Records attempt history in `SocialPublishAttempt` for full idempotency and auditing.

---

## 7. Multi-Tenant & Cross-Project Isolation

- Social accounts belong to a specific `companyId` and `projectId`.
- Cross-project access is strictly blocked:
  - If Project A attempts to publish using Account B, the operation fails with a 404/403 `SOCIAL_ACCOUNT_NOT_CONNECTED`.
  - If Project B attempts to read Project A's accounts, the query returns 404.
  - Foreign tenants attempting to query accounts across companies are rejected at the database extension level.

---

## 8. AI Autonomous Safety & Autonomy Modes

AI agents must never call LinkedIn APIs directly or receive OAuth tokens. All agent actions route through `LinkedInPublishingTools`:

- **`MANUAL` Mode**: AI cannot publish directly. Requests are saved as drafts or submitted for human review.
- **`ASSISTED` Mode**: AI prepares content, schedules items, and alerts humans for one-click approval.
- **`AUTO` Mode**: Autonomous agents may publish strictly according to project policy and pre-approved guidelines.

---

## 9. Diagnostic Verification Endpoint

Administrators can inspect the integration status without exposing any secrets:

```http
GET /api/v1/social-media/accounts/linkedin/diagnose
Authorization: Bearer <admin-jwt>
```

**Response**:
```json
{
  "success": true,
  "diagnostics": {
    "mode": "MOCK",
    "clientId": "CONFIGURED",
    "clientSecret": "CONFIGURED",
    "apiVersion": "202507",
    "restBaseUrl": "https://api.linkedin.com/rest",
    "communityManagementStatus": "review_in_progress",
    "configuredScopes": ["openid", "profile", "w_member_social"],
    "capabilitiesSummary": {
      "organizationPosting": "available",
      "memberPosting": "available",
      "comments": "available",
      "reactions": "available",
      "analytics": "available"
    },
    "connectedAccountsCount": 2,
    "accountsWithValidTokens": 2,
    "accountsNeedingReauth": 0
  }
}
```

---

## 10. Production Activation Procedure (When Community Management is Approved)

When LinkedIn approves the Community Management API application:

1. Update `.env.production`:
   ```bash
   LINKEDIN_PROVIDER_MODE=live
   LINKEDIN_COMMUNITY_MANAGEMENT_STATUS=approved
   ```
2. Restart backend workers and server (`pnpm build`).
3. Have workspace admins reconnect company pages via the standard OAuth flow in Settings -> Connected Accounts.
4. Run live diagnostics (`/api/v1/social-media/accounts/linkedin/diagnose`) to confirm `communityManagementStatus: "approved"`.
5. Execute automated test suites:
   ```bash
   npx tsx --test --test-force-exit packages/domains/social-media/test/linkedin/linkedin-capabilities.test.ts
   npx tsx --test --test-force-exit packages/domains/social-media/test/linkedin/linkedin-live-provider.test.ts
   ```
6. No code changes or architectural rewrites are required.
