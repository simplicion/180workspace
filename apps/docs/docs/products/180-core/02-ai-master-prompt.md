---
id: ai-master-prompt
title: Master AI Integration Prompt
sidebar_label: 1-Click AI Master Prompt
sidebar_position: 2
description: Copy-paste master AI integration prompt to automatically integrate 180 Identity and 180 Pay using ChatGPT, Claude, Cursor, or Antigravity.
---

# 🤖 Master AI Integration Prompt

Integrate **180 Identity** and **180 Pay** into any codebase in fewer than 2 minutes. Copy the master prompt below, replace the bracketed placeholders (`YOUR_CLIENT_ID`, `YOUR_CLIENT_SECRET`, `YOUR_WEBHOOK_SECRET`) with your credentials from the [180 Developer Console](https://developers.180workspace.com), and paste it directly into **Cursor, Claude 3.5 Sonnet, ChatGPT, or GitHub Copilot**.

:::tip Zero-Friction AI Scaffolding
The prompt instructs the AI to detect your existing framework (Next.js App Router, Vite React, Express, FastAPI, Django, Remix, etc.) and generate production-ready authentication, checkout sheets, and HMAC SHA-256 webhook verification routes.
:::

---

## 📋 The Copy-Paste Master Prompt

```markdown
You are an expert full-stack engineer integrating 180 Core (180 Identity & 180 Pay) into my application.

Follow these strict integration instructions:

### Application Credentials:
- CLIENT_ID: "YOUR_CLIENT_ID"
- CLIENT_SECRET: "YOUR_CLIENT_SECRET"
- WEBHOOK_SECRET: "YOUR_WEBHOOK_SECRET"
- CORE_API_URL: "https://services.180workspace.com"
- IDENTITY_AUTH_URL: "https://auth.180workspace.com"

---

### Step 1: Environment Configuration
Add the following variables to my `.env` (or `.env.local`) file:
```env
NEXT_PUBLIC_180_CLIENT_ID=YOUR_CLIENT_ID
ONE_EIGHTY_CLIENT_SECRET=YOUR_CLIENT_SECRET
ONE_EIGHTY_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET
NEXT_PUBLIC_180_CORE_URL=https://services.180workspace.com
NEXT_PUBLIC_180_AUTH_URL=https://auth.180workspace.com
```

---

### Step 2: Install 180 Identity & 180 Pay SDK
Install the official client SDK:
```bash
npm install @workspace/identity-sdk lucide-react
```
*(Or include `<script src="https://auth.180workspace.com/sdk/v1/180-core-sdk.js" async></script>` if using vanilla HTML/JS).*

---

### Step 3: Frontend Universal Authentication Button
Implement a modern, dark-mode compatible 180 Identity login button using popup mode:

```tsx
'use client';

import React, { useState } from 'react';
import { OneEightyAuth } from '@workspace/identity-sdk';

export function LoginButton() {
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    OneEightyAuth.openLoginPopup({
      clientId: process.env.NEXT_PUBLIC_180_CLIENT_ID!,
      redirectUri: `${window.location.origin}/api/auth/callback`,
      scope: 'openid identity:read identity:email identity:phone',
      uxMode: 'popup',
      onSuccess: async (data: { code: string; state?: string }) => {
        // Exchange authorization code for authenticated user session on your backend
        const res = await fetch('/api/auth/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: data.code }),
        });
        const result = await res.json();
        if (result.success) {
          window.location.reload();
        }
      },
      onError: (err: any) => {
        console.error('180 Identity login failed:', err);
        setLoading(false);
      },
    });
  };

  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-purple-600/20"
    >
      <span>{loading ? 'Authenticating...' : 'Sign in with 180'}</span>
    </button>
  );
}
```

---

### Step 4: Backend OAuth 2.0 Token Exchange Endpoint
Create the backend route to securely exchange the authorization code using `CLIENT_SECRET` (never expose `CLIENT_SECRET` on client):

```ts
// Next.js App Router: app/api/auth/exchange/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ success: false, error: 'Missing code' }, { status: 400 });
    }

    const tokenRes = await fetch(`${process.env.NEXT_PUBLIC_180_CORE_URL}/api/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.NEXT_PUBLIC_180_CLIENT_ID,
        client_secret: process.env.ONE_EIGHTY_CLIENT_SECRET,
        redirect_uri: `${new URL(req.url).origin}/api/auth/callback`,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return NextResponse.json({ success: false, error: tokenData.error || 'Token exchange failed' }, { status: 400 });
    }

    // Fetch user profile
    const userRes = await fetch(`${process.env.NEXT_PUBLIC_180_CORE_URL}/api/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userRes.json();

    // Store user session in cookie/JWT/database session
    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

---

### Step 5: Frontend 1-Click Sovereign Payment / Subscription Drawer
Trigger the 180 Pay checkout sheet for one-time payments or monthly recurring subscriptions:

```tsx
'use client';

import { OneEightyPay } from '@workspace/identity-sdk';

export function CheckoutButton({ planCode = 'pro_plan', amount = 499, title = 'Pro Subscription' }) {
  const handleCheckout = () => {
    OneEightyPay.openBottomSheet({
      amount,
      currency: 'INR',
      title,
      description: 'Instant sovereign checkout via 180 Pay',
      planCode,
      onSuccess: (res: any) => {
        alert(`Payment Successful! Transaction ID: ${res.transactionId || res.sessionId}`);
        window.location.reload();
      },
      onCancel: () => {
        console.log('Checkout drawer dismissed by user');
      },
    });
  };

  return (
    <button
      onClick={handleCheckout}
      className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/25"
    >
      Upgrade Now (₹{amount})
    </button>
  );
}
```

---

### Step 6: Backend Webhook Verification Endpoint (HMAC SHA-256)
Create the webhook route to verify payment captures and provision user entitlements.
CRITICAL: Verify `x-180-signature` with `x-180-timestamp` using HMAC SHA-256:

```ts
// Next.js App Router: app/api/webhooks/180-pay/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-180-signature') || req.headers.get('X-180-Signature');
    const timestamp = req.headers.get('x-180-timestamp') || req.headers.get('X-180-Timestamp');
    const webhookSecret = process.env.ONE_EIGHTY_WEBHOOK_SECRET;

    if (!signature || !timestamp || !webhookSecret) {
      return NextResponse.json({ error: 'Missing security headers or secret' }, { status: 400 });
    }

    // 1. Replay attack defense (reject requests older than 5 minutes)
    const currentTime = Math.floor(Date.now() / 1000);
    const parsedTimestamp = parseInt(timestamp, 10);
    if (isNaN(parsedTimestamp) || Math.abs(currentTime - parsedTimestamp) > 300) {
      return NextResponse.json({ error: 'Webhook timestamp expired / replay detected' }, { status: 401 });
    }

    // 2. Compute expected HMAC-SHA256 signature
    const signPayload = `${timestamp}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(signPayload)
      .digest('hex');

    // 3. Constant-time comparison to prevent timing attacks
    const bufA = Buffer.from(signature);
    const bufB = Buffer.from(expectedSignature);
    if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
      return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
    }

    // 4. Parse event and fulfill purchase
    const event = JSON.parse(rawBody);

    switch (event.event) {
      case 'payment.captured':
      case 'payment.succeeded':
        // Event payload contains: data.sessionId, data.amount, data.currency, data.customerEmail, data.metadata
        console.log('Payment Captured:', event.data);
        // TODO: Unlock user tier / database update here
        break;

      case 'subscription.created':
      case 'subscription.renewed':
        console.log('Subscription Active:', event.data);
        // TODO: Update user subscription period in database
        break;

      case 'subscription.cancelled_by_customer':
        console.log('Subscription Cancelled:', event.data);
        break;

      default:
        console.log('Unhandled 180 Pay event:', event.event);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

Now inspect my current codebase, detect the framework, and write the files cleanly matching my project's conventions.
```

---

## How to Use with Cursor or Antigravity

1. Open your project in **Cursor** or **Antigravity**.
2. Press `Cmd + L` (or `Ctrl + L`) to open the Composer / Chat window.
3. Paste the prompt above.
4. Replace `YOUR_CLIENT_ID`, `YOUR_CLIENT_SECRET`, and `YOUR_WEBHOOK_SECRET` with the credentials from your [180 Developer Console](https://developers.180workspace.com).
5. Watch the AI automatically generate all frontend components, backend handlers, and webhook verification routes in 30 seconds!
