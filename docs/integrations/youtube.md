# 180 Workspace — YouTube Integration Infrastructure

## 1. Architecture Overview

180 Workspace integrates with Google Cloud and YouTube via a capability-governed, multi-tenant distribution architecture supporting YouTube Channels, Resumable Chunked Video Uploads (Data API v3), YouTube Shorts auto-detection, Thumbnail uploads, Closed Captions, Comment moderation/replies, and YouTube Analytics.

```
                      +---------------------------------------+
                      | Autonomous AI Agent / Studio Composer |
                      +---------------------------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |        YouTubePublishingTools         |
                      |   - Multi-tenant verification (scope) |
                      |   - Project isolation guards          |
                      |   - Autonomy mode enforcement         |
                      |   - Dynamic capability checks         |
                      +---------------------------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |        YouTubeProviderFactory         |
                      |  (Transparent Live / Mock Provider)   |
                      +---------------------------------------+
                                     /         \
                                    /           \
                 (Mock / Sandbox)  /             \  (Production Live)
                                  v               v
                +----------------------+   +-----------------------------+
                | MockYouTubeProvider  |   |    YouTubeLiveProvider      |
                | - Pure deterministic |   | - Google Data API v3        |
                | - In-memory store    |   | - 256KB Resumable Uploader  |
                | - Failure injection  |   | - Token-bucket rate limiter |
                | - Zero external reqs |   | - Circuit breaker & backoff |
                +----------------------+   | - Captions & Thumbnails     |
                                           | - YouTube Analytics API v1  |
                                           +-----------------------------+
                                                          |
                                                          v
                                           +-----------------------------+
                                           |      Google Cloud APIs      |
                                           +-----------------------------+
```

---

## 2. Google Cloud Project & Credential Reuse

- **Single Google Cloud Project**: 180 Workspace reuses the existing Google Cloud project. No secondary project is required.
- **Credential Fallback**: The YouTube subsystem automatically falls back to `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` if `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` are not explicitly defined in the environment.
- **Zero Duplicate Configuration**: Reuses configured client credentials cleanly across Google OAuth and YouTube services.

```bash
# Environment Configuration (.env / .env.example)
GOOGLE_CLIENT_ID="[CONFIGURED]"
GOOGLE_CLIENT_SECRET="[CONFIGURED]"

# Optional YouTube overrides (falls back to GOOGLE_* if omitted)
YOUTUBE_CLIENT_ID=""
YOUTUBE_CLIENT_SECRET=""
YOUTUBE_PROVIDER_MODE="mock" # Set to 'live' for real Google Cloud OAuth & uploads
YOUTUBE_SCOPES="https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/yt-analytics.readonly"
```

---

## 3. OAuth 2.0 & Canonical Routing

- **Authorization Endpoint**: `https://accounts.google.com/o/oauth2/v2/auth`
- **Token Endpoint**: `https://oauth2.googleapis.com/token`
- **PKCE**: Enabled by default (`code_challenge` / `code_verifier` with SHA-256).
- **Access Type**: `offline` with `prompt=consent` to guarantee issuance of a refresh token.
- **Canonical Callback Route**:
  ```
  https://api.180workspace.com/api/v1/social-media/accounts/oauth/youtube/callback
  ```
- **State Security**: HMAC-SHA256 signed, time-limited (15m TTL), one-time session store in PostgreSQL (`SocialOAuthSession`).

---

## 4. Scopes & Least Privilege

The following scopes are requested at authorization:
1. `https://www.googleapis.com/auth/youtube.upload`: Uploading video content, custom thumbnails, and captions.
2. `https://www.googleapis.com/auth/youtube.readonly`: Fetching channel information, subscribers, and video metadata.
3. `https://www.googleapis.com/auth/youtube.force-ssl`: Fetching comments, publishing comment replies, and rating/liking videos.
4. `https://www.googleapis.com/auth/yt-analytics.readonly`: Channel-level analytics reports (views, watch time, CTR, subscribers).

---

## 5. Token Security & Multi-Tenancy

- **Token Storage**: All access tokens and refresh tokens are encrypted at rest using AES-256-GCM via `SocialTokenVault` (`packages/domains/social-media/src/publishing/token-vault.ts`).
- **Zero Frontend Leaks**: Tokens and secrets are scrubbed before logging, database serialization, and API responses.
- **Cross-Project Isolation**: A YouTube channel connected to Project A can NEVER be accessed or published to by Project B or a different company/tenant. Every tool and API route enforces:
  ```ts
  const account = await prisma.socialAccount.findFirst({
      where: { id: socialAccountId, companyId, projectId, platform: 'youtube', isActive: true },
  });
  ```
- **Autonomy Mode Policy**: In `MANUAL` autonomy mode, AI automated agents are blocked from publishing directly. Posts must be queued for explicit human review.

---

## 6. Resumable Chunked Video Upload Protocol

YouTube requires video uploads to use the resumable upload protocol:
1. **Initiation**: `POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`
   - Headers: `X-Upload-Content-Type: video/mp4`, `X-Upload-Content-Length: <size>`
   - Body: Video metadata (title, description, tags, privacyStatus, madeForKids).
   - Response: `Location` header containing the resumable session URL.
2. **Chunk Transmission**: `PUT <sessionUrl>`
   - Chunk sizing: Multiples of 256 KiB (`256 * 1024` bytes). Default chunk size is 8 MB.
   - Headers: `Content-Range: bytes START-END/TOTAL`.
   - Intermediate chunks: Receive HTTP `308 Resume Incomplete` with `Range` header.
   - Final chunk: Receives HTTP `200` or `201` with the complete YouTube Video resource.
3. **Shorts Auto-Detection**: If the video is vertical (aspect ratio <= 1.0) and duration <= 180 seconds, `#shorts` is appended to the title/description and returns the live URL formatted as `https://youtube.com/shorts/{videoId}`.
4. **Post-Upload Assets**:
   - Custom thumbnail: `POST https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId={videoId}`
   - Closed captions: `POST https://www.googleapis.com/upload/youtube/v3/captions?part=snippet`

---

## 7. YouTube Analytics

Normalized internal metrics returned from YouTube Analytics API v1:
- `views`
- `likes`
- `comments`
- `shares`
- `estimatedMinutesWatched`
- `averageViewDurationSeconds`
- `subscribersGained`
- `subscribersLost`
- `impressions`
- `impressionClickThroughRate`

---

## 8. Safe Diagnostics Service

Admin and developer health check endpoint:
```
GET /api/v1/social-media/accounts/youtube/diagnose
```
Returns:
- Provider Mode (`MOCK` or `LIVE`)
- Client ID & Client Secret configured status (`CONFIGURED` or `MISSING`, never values)
- Credential Source (`GOOGLE_CLIENT_*` or `YOUTUBE_CLIENT_*`)
- OAuth Readiness
- Required APIs status (Data API v3 & Analytics API v1)
- Connected accounts count, valid token count, reauth required count
- Granular capability statuses

---

## 9. Verification & Testing Evidence

All tests run cleanly with 0 failures:
- Capability Matrix: `test/youtube/youtube-capabilities.test.ts` (6 tests)
- In-Memory Mock Provider: `test/youtube/youtube-mock-provider.test.ts` (9 tests)
- Live Resumable Chunking: `test/youtube/youtube-live-provider.test.ts` (3 tests)
- Multi-Tenant & Autonomy Isolation: `test/youtube/youtube-cross-project-security.test.ts` (2 tests)
- Real MP4 Binary Box Fixture: `test/youtube/youtube-real-media.test.ts` (2 tests)
- Existing Suite: `test/youtube-production.test.ts` (5 tests)
