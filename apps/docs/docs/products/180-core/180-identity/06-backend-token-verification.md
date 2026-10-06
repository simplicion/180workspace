---
id: backend-token-verification
title: Backend Token Exchange & Verification Guide
sidebar_label: Backend Verification
sidebar_position: 6
description: Complete guide for server-to-server authorization code exchange, stateless JWKS verification, and OAuth introspection.
---

# Backend Token Exchange & Verification Guide

When an integrating frontend completes 180 Identity login, it receives an authorization code (`code`) and client metadata. To establish a secure server-side session or API authentication, your backend performs a server-to-server exchange with 180 Sovereign Cloud.

---

## 1. Full Server-to-Server Sequence Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant App as Partner Frontend
    participant Server as Partner Server
    participant Cloud as 180 Sovereign Cloud

    User->>App: Clicks "Sign in with 180"
    App->>Cloud: Presents Adaptive Bottom Sheet (profile.180workspace.com)
    User->>Cloud: Authenticates (WhatsApp 1-Tap / Google / Passkey)
    Cloud-->>App: postMessage({ code: "auth_code_..." })
    App->>Server: POST /auth/180/exchange { code }
    Server->>Cloud: POST https://services.180workspace.com/api/oauth/token
    Note over Server,Cloud: grant_type=authorization_code + client_id + client_secret
    Cloud-->>Server: 200 OK { access_token, id_token, user }
    Server->>Cloud: GET https://services.180workspace.com/api/oauth/userinfo (Bearer token)
    Cloud-->>Server: 200 OK { sub, email, phone, name, username }
    Server-->>App: Set Secure HTTP-Only Session Cookie / JWT
```

---

## 2. Server-to-Server Token Exchange (RFC 6749)

Exchange the one-time `code` received from the frontend for an `access_token` and `id_token`.

### HTTP Request:
```http
POST https://services.180workspace.com/api/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "client_id": "180_client_b26aee801c22cb3295f041ff2a3597db",
  "client_secret": "180_secret_998124018301823901239012390123",
  "code": "auth_code_9a8f2c3b4d5e",
  "redirect_uri": "https://yourapp.com/callback"
}
```

### JSON Response:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "rt_87a9b0c1d2e3f4",
  "id_token": "eyJhbGciOiJSUzI1NiIs...",
  "scope": "openid identity:read identity:email",
  "user": {
    "id": "usr_9f82b1c2-3e4a-4d5f-9a1b-8c7d6e5f4a3b",
    "email": "user@example.com",
    "name": "Sovereign Developer",
    "username": "developer",
    "phone": "+919876543210",
    "avatarUrl": "https://cdn.180workspace.com/avatars/user.png"
  }
}
```

---

## 3. Retrieve Verified Profile (`/api/oauth/userinfo`)

Retrieve the canonical, cryptographically verified user identity:

### HTTP Request:
```http
GET https://services.180workspace.com/api/oauth/userinfo
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

### JSON Response:
```json
{
  "sub": "usr_9f82b1c2-3e4a-4d5f-9a1b-8c7d6e5f4a3b",
  "email": "user@example.com",
  "email_verified": true,
  "phone": "+919876543210",
  "phone_verified": true,
  "name": "Sovereign Developer",
  "username": "developer",
  "picture": "https://cdn.180workspace.com/avatars/user.png"
}
```

---

## 4. Stateless Verification with JWKS (Local Token Validation)

Verify RS256 JWT signatures statelessly in your microservices without querying 180 services on every request:

- **JWKS Endpoint**: `https://profile.180workspace.com/.well-known/jwks.json`
- **OIDC Configuration**: `https://profile.180workspace.com/.well-known/openid-configuration`

### Node.js Example (with `jose`):

```typescript
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL('https://profile.180workspace.com/.well-known/jwks.json')
);

export async function verify180Token(bearerToken: string) {
  try {
    const { payload } = await jwtVerify(bearerToken, JWKS, {
      issuer: 'https://profile.180workspace.com',
      audience: process.env.ONE_EIGHTY_CLIENT_ID,
    });
    return payload; // { sub, email, username, scopes, ... }
  } catch (err) {
    throw new Error('Invalid or expired 180 Sovereign token');
  }
}
```

---

## 5. Server-to-Server Token Introspection (RFC 7662)

To actively check if a token was revoked by the user before its expiration:

### HTTP Request:
```http
POST https://services.180workspace.com/api/oauth/introspect
Content-Type: application/x-www-form-urlencoded
Authorization: Basic <base64(client_id:client_secret)>

token=eyJhbGciOiJSUzI1NiIs...
```

### JSON Response:
```json
{
  "active": true,
  "scope": "openid identity:read identity:email",
  "client_id": "180_client_b26aee801c22cb3295f041ff2a3597db",
  "sub": "usr_9f82b1c2-3e4a-4d5f-9a1b-8c7d6e5f4a3b",
  "exp": 1728135600,
  "iat": 1728134700
}
```
If the session has been terminated by the user or application, `{"active": false}` is returned.

