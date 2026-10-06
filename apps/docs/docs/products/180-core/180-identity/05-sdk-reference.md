---
id: sdk-reference
title: 180 Core SDK & Architecture Reference
sidebar_label: SDK & Architecture Reference
sidebar_position: 5
description: Complete SDK reference, authoritative domain architecture map, error diagnostics, and framework integration guides.
---

# 180 Core SDK & Architecture Reference

The **180 Core SDK** (`180-core-sdk.js`) is a zero-dependency, high-performance client library that provides universal modal injection, RFC 7636 PKCE cryptographic security, responsive bottom-sheet viewports, and unified single sign-on across the 180 ecosystem.

---

## 1. Authoritative Architecture & Domain Map

To avoid confusion when configuring network policies, reverse proxies, and CORS settings, here is the authoritative map of all 180 Sovereign Cloud endpoints:

| Domain | Role & Purpose | Key Endpoints |
| :--- | :--- | :--- |
| **`auth.180workspace.com`** | Global Edge CDN host for SDK script delivery | `GET /sdk/v1/180-core-sdk.js`<br/>`GET /sdk/v1/180-core-sdk.min.js` |
| **`profile.180workspace.com`** | Sovereign Identity & Login modal host, OIDC Discovery | `GET /auth/login` (Auth bottom sheet)<br/>`GET /.well-known/openid-configuration`<br/>`GET /.well-known/jwks.json` |
| **`services.180workspace.com`** | Core OAuth 2.0 Backend & Token Engine | `POST /api/oauth/token` (Code exchange)<br/>`GET /api/oauth/userinfo`<br/>`POST /api/oauth/introspect` |
| **`pay.180workspace.com`** | Universal Sovereign Checkout & Payments | `GET /checkout/:sessionId`<br/>`POST /api/v1/sessions/create` |
| **`developers.180workspace.com`** | Developer Management Console | Client IDs, Allowed Origins, Webhooks, Billing |

:::tip CDN Redundancy
The SDK script is also globally mirrored at `https://cdn.180workspace.com/sdk/v1/180-core-sdk.js` and `https://180workspace.com/sdk/v1/180-core-sdk.js`.
:::

---

## 2. Global Namespaces & Window Aliases

When loaded via `<script>`, the SDK attaches itself to the global `window` object under both canonical names and developer-friendly aliases:

```javascript
window.OneEighty         // Root instance: { auth, pay, ui, version, init, ... }
window.OneEightyCore     // Canonical alias for window.OneEighty
window.OneEightyAuth     // Canonical Auth service: { signIn, openLoginPopup, signOut, ... }
window.OneEightyIdentity // Alias for window.OneEightyAuth
window.OneEightyPay      // Universal Checkout service: { checkout, openBottomSheet, ... }
```

### Methods on `OneEightyAuth` / `OneEightyIdentity`:

```typescript
// Primary authentication trigger
window.OneEightyAuth.signIn(options): Promise<AuthResult | null>

// Convenience UI aliases
window.OneEightyAuth.openLoginPopup(options)   // Defaults to popup mode
window.OneEightyAuth.openBottomSheet(options)  // Defaults to bottom-sheet mode
window.OneEightyAuth.openAuthModal(options)    // Alias for signIn

// Session management
window.OneEightyAuth.signOut(): void
window.OneEightyAuth.getUser(): UserProfile | null
window.OneEightyAuth.getAccessToken(): string | null
```

---

## 3. Success Payload (`onSuccess`) Contract

When authentication completes successfully, the SDK dismisses the modal and emits the following payload to both `onSuccess(data)` and the resolved Promise:

```typescript
export interface AuthResult {
  /** RFC 6749 Authorization Code to exchange on your backend */
  code: string;

  /** Platform JWT or OAuth Access Token */
  token?: string;
  accessToken?: string;

  /** Cryptographically signed RS256 OpenID Connect ID Token */
  idToken?: string;

  /** Client-side state parameter passed during invocation */
  state: string;

  /** Decoded user profile metadata */
  user?: {
    id: string;
    email: string;
    name?: string;
    username?: string;
    avatarUrl?: string;
    phone?: string;
    isEmailVerified?: boolean;
    isPhoneVerified?: boolean;
  };
}
```

---

## 4. Structured Error Codes & Diagnostic Hints

If an authentication or payment flow fails, the SDK rejects the Promise and invokes `onError(err)` with a structured `OneEightyError`:

```typescript
export interface OneEightyError extends Error {
  code: string;
  hint: string;
}
```

| Error Code | Root Cause | Actionable Developer Resolution |
| :--- | :--- | :--- |
| **`180_ERR_ORIGIN_NOT_WHITELISTED`** | The requesting domain/localhost is not registered for this Client ID. | Add your origin (e.g., `http://localhost:3000`) in **[Developer Portal](https://developers.180workspace.com)** under Allowed Origins. |
| **`180_ERR_INVALID_CLIENT_ID`** | The provided `clientId` is nonexistent or revoked. | Verify `NEXT_PUBLIC_180_CLIENT_ID` in your `.env`. |
| **`180_ERR_POPUP_BLOCKED`** | Browser blocked popup window due to security policy. | Trigger `signIn` from a direct user click or use `uxMode: 'bottom_sheet'`. |
| **`180_ERR_NETWORK_DISCONNECTED`** | Failed to connect to 180 Sovereign Cloud. | Check your network or visit [status.180workspace.com](https://status.180workspace.com). |
| **`180_ERR_TIMEOUT`** | Auth server did not respond within timeout window. | Check network latency or retry the operation. |
| **`180_ERR_USER_CANCELLED`** | The user closed the bottom sheet or clicked backdrop. | Optional: provide retry prompt or fallback login method. |

---

## 5. Framework Quickstarts

### Next.js (App Router) Hook: `useOneEightyAuth`

Create `lib/useOneEightyAuth.ts`:

```typescript
'use client';

import { useState, useCallback } from 'react';

export function useOneEightyAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const signIn = useCallback(async (options?: {
    clientId?: string;
    uxMode?: 'bottom_sheet' | 'popup' | 'modal' | 'fullscreen';
    onSuccess?: (res: any) => void;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Ensure SDK is present
      if (!(window as any).OneEightyAuth) {
        if (!document.querySelector('script[src*="180-core-sdk.js"]')) {
          const s = document.createElement('script');
          s.src = 'https://auth.180workspace.com/sdk/v1/180-core-sdk.js';
          s.async = true;
          document.body.appendChild(s);
        }
        const timeout = Date.now() + 4000;
        while (Date.now() < timeout) {
          if ((window as any).OneEightyAuth) break;
          await new Promise((r) => setTimeout(r, 60));
        }
      }

      const auth = (window as any).OneEightyAuth;
      if (!auth) throw new Error('180 Core SDK failed to load');

      return await auth.signIn({
        clientId: options?.clientId || process.env.NEXT_PUBLIC_180_CLIENT_ID,
        uxMode: options?.uxMode || 'bottom_sheet',
        onSuccess: (data: any) => {
          setIsLoading(false);
          options?.onSuccess?.(data);
        },
        onError: (err: any) => {
          setIsLoading(false);
          setError(err);
          console.error('[180 Auth Error]', err.code, err.message, err.hint);
        },
        onCancel: () => setIsLoading(false),
      });
    } catch (err: any) {
      setIsLoading(false);
      setError(err);
      throw err;
    }
  }, []);

  return { signIn, isLoading, error };
}
```

---

### NextAuth.js (Auth.js v5) Custom Provider

```ts
import NextAuth from 'next-auth';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    {
      id: '180-identity',
      name: '180 Identity',
      type: 'oauth',
      authorization: {
        url: 'https://profile.180workspace.com/auth/login',
        params: { scope: 'openid identity:read identity:email identity:phone', ux_mode: 'popup' },
      },
      token: 'https://services.180workspace.com/api/oauth/token',
      userinfo: 'https://services.180workspace.com/api/oauth/userinfo',
      clientId: process.env.ONE_EIGHTY_CLIENT_ID,
      clientSecret: process.env.ONE_EIGHTY_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile.sub || profile.id,
          name: profile.name,
          email: profile.email,
          image: profile.avatarUrl,
        };
      },
    },
  ],
});
```

---

### Python (FastAPI / Flask / Django)

```python
import requests
import os

CLIENT_ID = os.getenv("ONE_EIGHTY_CLIENT_ID")
CLIENT_SECRET = os.getenv("ONE_EIGHTY_CLIENT_SECRET")
CORE_URL = "https://services.180workspace.com"

def exchange_code_for_user(auth_code: str, redirect_uri: str):
    token_resp = requests.post(
        f"{CORE_URL}/api/oauth/token",
        json={
            "grant_type": "authorization_code",
            "code": auth_code,
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "redirect_uri": redirect_uri,
        }
    )
    token_resp.raise_for_status()
    tokens = token_resp.json()
    
    user_resp = requests.get(
        f"{CORE_URL}/api/oauth/userinfo",
        headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )
    user_resp.raise_for_status()
    return user_resp.json()
```

---

### Flutter Mobile App

In Flutter, use `flutter_custom_tabs` or `webview_flutter`:

```dart
import 'package:flutter_custom_tabs/flutter_custom_tabs.dart';

void launch180Login() async {
  final authUrl = 'https://profile.180workspace.com/auth/login?'
      'client_id=YOUR_CLIENT_ID&'
      'redirect_uri=myflutterapp://callback&'
      'response_type=code&'
      'scope=openid%20identity:read%20identity:email&'
      'ux_mode=bottom_sheet';

  await launchUrl(
    Uri.parse(authUrl),
    customTabsOptions: const CustomTabsOptions(
      showTitle: true,
      colorSchemes: CustomTabsColorSchemes(
        defaultPwaColor: CustomTabsColorScheme(toolbarColor: Color(0xFF09090B)),
      ),
    ),
  );
}
```

