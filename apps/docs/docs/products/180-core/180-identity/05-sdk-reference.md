---
id: sdk-reference
title: 180 Identity SDK & Framework Guides
sidebar_label: SDK & Frameworks
sidebar_position: 5
description: Official SDK references for React, Next.js, NextAuth.js, Vue, Node.js, Python, and Flutter.
---

# 180 Identity SDK & Framework Guides

## 1. NextAuth.js (Auth.js v5) Custom Provider

You can add 180 Identity as a custom OAuth provider in `auth.ts` or `[...nextauth]/route.ts`:

```ts
import NextAuth from 'next-auth';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    {
      id: '180-identity',
      name: '180 Identity',
      type: 'oauth',
      authorization: {
        url: 'https://auth.180workspace.com/authorize',
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

## 2. Vanilla JavaScript / HTML Script Tag

Add the zero-download script to your `<head>`:

```html
<script src="https://auth.180workspace.com/sdk/v1/180-core-sdk.js" async></script>

<button id="login-btn">Sign in with 180</button>

<script>
  document.getElementById('login-btn').addEventListener('click', () => {
    window.OneEightyAuth.openLoginPopup({
      clientId: 'YOUR_CLIENT_ID',
      redirectUri: window.location.origin + '/callback',
      scope: 'openid identity:read identity:email',
      onSuccess: (data) => {
        console.log('Received auth code:', data.code);
        // Post code to your backend
      },
      onError: (err) => console.error(err),
    });
  });
</script>
```

---

## 3. Python (FastAPI / Flask / Django)

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

## 4. Flutter / Dart Mobile App

In Flutter, use `flutter_custom_tabs` or `webview_flutter`:

```dart
import 'package:flutter_custom_tabs/flutter_custom_tabs.dart';

void launch180Login() async {
  final authUrl = 'https://auth.180workspace.com/authorize?'
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
        defaultPwaColor: CustomTabsColorScheme(toolbarColor: Color(0xFF7C3AED)),
      ),
    ),
  );
}
```
