---
id: backend-token-verification
title: Backend Token Verification (JWKS & Introspection)
sidebar_label: Backend Verification
sidebar_position: 6
description: Verify 180 Identity JWTs statelessly using JWKS or via server-side OAuth 2.0 introspection.
---

# Backend Token Verification (JWKS & Introspection)

To verify requests on your microservices or API gateway without hitting the 180 Core database on every request, you can verify JWT signatures statelessly using **JSON Web Key Sets (JWKS)** or use the **RFC 7662 Introspection endpoint**.

---

## 1. Stateless Verification with JWKS (Recommended)

180 Identity publishes standard cryptographic public keys:
- **JWKS Endpoint**: `https://services.180workspace.com/.well-known/jwks.json`
- **OpenID Configuration**: `https://services.180workspace.com/.well-known/openid-configuration`

### Node.js (with `jose` library):
```ts
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL('https://services.180workspace.com/.well-known/jwks.json')
);

export async function verify180Token(bearerToken: string) {
  try {
    const { payload } = await jwtVerify(bearerToken, JWKS, {
      issuer: 'https://auth.180workspace.com',
      audience: process.env.ONE_EIGHTY_CLIENT_ID,
    });
    return payload; // { sub, email, username, scope, ... }
  } catch (err) {
    throw new Error('Invalid or expired 180 token');
  }
}
```

---

## 2. Server-to-Server Token Introspection

If your backend requires checking whether a token was actively revoked before its 15-minute expiration:

### Request:
```http
POST /api/oauth/introspect
Host: services.180workspace.com
Content-Type: application/x-www-form-urlencoded
Authorization: Basic <base64(client_id:client_secret)>

token=eyJhbGciOiJSUzI1NiIs...
```

### Response:
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
If the session has been terminated by the user or developer, `{"active": false}` is returned.
