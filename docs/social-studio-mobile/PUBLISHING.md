# Publishing: connect accounts, tokens, publish

Source of truth: `packages/domains/social-media/src/publishing/`
- `oauth.service.ts` and `oauth-providers.ts`: connecting accounts.
- `token-vault.ts`: stored tokens.
- `publish-dispatcher.ts` and `scheduler.ts`: sending posts.
- `webhooks.service.ts`: Meta webhooks.

Routes: `apps/backend/src/api/v1/social-media/accounts/social-account.routes.ts`. The public callback is registered in
`apps/backend/src/routes/index.routes.ts`.

## 1. Connecting an account (OAuth, PKCE)

1. **Start.** The client calls
   `GET /api/v1/social-media/accounts/oauth/:platform/authorize?projectId&redirectUri&client=web|mobile`
   and gets back `{ url }`.
   - `redirectUri` must be on the allow-list:
     - web: an https origin from `CLIENT_URL` or `SOCIAL_OAUTH_WEB_ORIGINS` (plain http only for localhost);
     - mobile: `workspace180://oauth/callback`;
     - extra exact URIs: `SOCIAL_OAUTH_ALLOWED_REDIRECTS`.
   - Otherwise the server returns `OAUTH_REDIRECT_NOT_ALLOWED`.
2. **Authorize.** The client sends the browser to `url`. The web app uses the same tab; mobile uses the system browser.
3. **Callback.** The provider returns to `{SOCIAL_OAUTH_CALLBACK_BASE_URL}/api/v1/social-media/accounts/oauth/<platform>/callback`.
   - The server checks the signed one-time state, exchanges the code with PKCE and discovers the accounts.
   - It then redirects to `redirectUri` with one of:
     - `?status=connected&platform=…&accountId=…`. The account and its encrypted tokens are saved.
     - `?status=select&platform=…&selectionId=…&count=N`. The provider returned several accounts (Facebook Pages,
       Instagram business accounts, LinkedIn member and organisations). Nothing is connected yet.
     - `?status=error&platform=…&error=…&error_description=…`.
4. **Selection** (only after `status=select`).
   - `GET /accounts/oauth/selections/:id` returns
     `{ candidates: [{ candidateId, kind, accountName, username, profileImageUrl }] }`.
     `kind` is one of `page | instagram_business | member | organization | channel | user`.
   - `POST /accounts/oauth/selections/:id {candidateIds}` returns `201 { accounts }`.
   - The selection is scoped to the company and user that started it. It can be completed once, and it expires.

Clients:
- **Web:** `social-media-assets/_components/ConnectedAccountsManager.tsx`. It redirects back to the same page,
  reads `status` from the URL, and shows the picker dialog after `status=select`. A "Reconnect" button appears when
  `reauthRequired` is set.
- **Mobile:** `lib/features/workspace/accounts_tab.dart` handles the deep link. After `status=select` it opens
  `account_selection_sheet.dart`.

`POST /accounts/connect` (a raw token pasted in) is for company admins only and exists for support use. It is not a
user flow.

## 2. Tokens

- **Storage.** Tokens live only in `social_account_credentials`, encrypted with AES-256-GCM and bound to the account id.
  The key is `SOCIAL_TOKEN_ENCRYPTION_KEY`; set `SOCIAL_TOKEN_ENCRYPTION_KEY_PREVIOUS` while rotating. The API never
  returns tokens (`toPublicAccount`).
- **Refresh when used.** `getAccessToken` refreshes a token that expires within `SOCIAL_TOKEN_REFRESH_SKEW_SEC`
  (default 300). Refreshes of the same account share one in-flight call, so they can't race.
- **Refresh ahead of time.** Each scheduler tick runs `proactiveRefreshExpiringTokens()`. It force-refreshes
  credentials that expire within 7 days and have a refresh token. This keeps 60-day Meta, Instagram and Threads
  tokens from lapsing on quiet accounts. Before 2026-09-26 this step only refreshed inside the 5-minute window, so in
  practice it never ran.
- **When a refresh is rejected**, the account gets `reauthRequired=true` with a reason, and the UI asks the user to
  reconnect. Transient failures increase `refreshFailureCount` and are retried later.

## 3. Publishing

- `POST /posts/:id/publish` and the scheduler both go through `PublishDispatcher`. Each variant ends in one of
  these states:
  - `published`, with a link;
  - `processing` (video still processing; the scheduler checks again);
  - `ready_to_publish` or `user_action_required` (assisted platforms such as X and Reddit hand off to the user);
  - `failed`, with the provider's error.
- Projects that require approval only publish approved versions.
- Retries use `SOCIAL_PUBLISH_MAX_ATTEMPTS` with backoff between `SOCIAL_PUBLISH_RETRY_BASE_MS` and
  `SOCIAL_PUBLISH_RETRY_MAX_MS`.
- **No fake success.**
  - A missing platform credential returns `503 PUBLISH_NOT_CONFIGURED`.
  - `SIMULATE_SOCIAL_PUBLISHING=true` (for demos only) produces results marked `sim_*` / `meta.simulated`, and it is
    ignored when `NODE_ENV=production`.

## 4. Environment

These are required per platform you enable. There are no defaults, and a missing value returns
`PUBLISH_NOT_CONFIGURED`.

| Platform | Variables |
|---|---|
| Facebook / Instagram (via Facebook login) | `META_APP_ID`, `META_APP_SECRET`, optional `META_LOGIN_CONFIG_ID`, `META_FACEBOOK_SCOPES`, `META_INSTAGRAM_SCOPES`, `META_GRAPH_VERSION` |
| Instagram (Instagram login) | `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` |
| Threads | `THREADS_APP_ID`, `THREADS_APP_SECRET`, `THREADS_SCOPES` |
| YouTube | `YOUTUBE_CLIENT_ID`/`YOUTUBE_CLIENT_SECRET` (or `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`), `YOUTUBE_SCOPES` |
| LinkedIn | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_SCOPES`, `LINKEDIN_API_VERSION`, `LINKEDIN_ENABLE_ORGANIZATIONS` |
| X | `X_CLIENT_ID`/`X_CLIENT_SECRET` (or `TWITTER_*`), `X_SCOPES` |
| TikTok | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_SCOPES` |
| Pinterest, Reddit | `PINTEREST_APP_ID`/`_SECRET`/`_SCOPES`, `REDDIT_CLIENT_ID`/`_SECRET`/`_SCOPES` |
| All | `SOCIAL_TOKEN_ENCRYPTION_KEY`, `SOCIAL_OAUTH_CALLBACK_BASE_URL`, `CLIENT_URL` / `SOCIAL_OAUTH_WEB_ORIGINS`, `SOCIAL_MEDIA_PUBLIC_BASE_URL` |
| Meta webhooks | `META_WEBHOOK_VERIFY_TOKEN`, `META_WEBHOOK_APP_SECRET`; see the Phase 7 checklist in `PRODUCTION_GAP_AUDIT.md` |

In every developer console, register this callback: `…/api/v1/social-media/accounts/oauth/<platform>/callback`.

## 5. Tests

- `packages/domains/social-media/test/publishing/*.test.ts`:
  - `oauth-meta`: OAuth, token storage, provider refresh;
  - `publishers`;
  - `webhooks-meta`: webhooks and proactive refresh.
- Mobile: `test/sections/oauth_selection_test.dart`.
