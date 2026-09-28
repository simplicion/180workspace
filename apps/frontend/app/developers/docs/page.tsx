'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Code2,
  Terminal,
  Layers,
  Smartphone,
  Play,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Key,
  Globe,
  ArrowRight,
  Sparkles,
  Lock,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DeveloperDocsPage() {
  const [activeTab, setActiveTab] = useState<'sdk' | 'nextauth' | 'node' | 'python' | 'flutter' | 'curl'>('sdk');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Playground state
  const [testClientId, setTestClientId] = useState('180-workspace-platform');
  const [testRedirectUri, setTestRedirectUri] = useState('http://localhost:3000/callback');
  const [testScope, setTestScope] = useState('openid identity:read identity:email');
  const [testUxMode, setTestUxMode] = useState<'popup' | 'redirect'>('popup');
  const [testState, setTestState] = useState('xyz_dev_state_981');

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const generatedAuthUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://180identity.180workspace.com'}/oauth/authorize?client_id=${encodeURIComponent(
    testClientId
  )}&redirect_uri=${encodeURIComponent(testRedirectUri)}&scope=${encodeURIComponent(
    testScope
  )}&state=${encodeURIComponent(testState)}&response_type=code&ux_mode=${testUxMode}`;

  const launchTestPopup = () => {
    const width = 450;
    const height = 680;
    const left = window.screen.width ? (window.screen.width - width) / 2 : 100;
    const top = window.screen.height ? (window.screen.height - height) / 2 : 100;

    window.open(
      generatedAuthUrl,
      '180_test_auth_popup',
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=no,toolbar=no,resizable=yes`
    );
  };

  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="space-y-3 pb-8 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Link
            href="/developers"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            ← Back to Applications
          </Link>
          <span className="text-slate-600">•</span>
          <span className="text-xs text-slate-400">Integration Guides & SDK Reference</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          180 Identity Integration Guide
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-3xl leading-relaxed">
          Standard OpenID Connect 1.0 & OAuth 2.0 (RFC 6749) authentication engine. Integrate
          universal 180 Identity Single Sign-On into your web, mobile, or backend stack in under 5
          minutes.
        </p>
      </div>

      {/* ─── Interactive OAuth URL Generator & Live Playground ─── */}
      <section className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
              <Play className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Interactive OAuth 2.0 URL Playground</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Live
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Test your client parameters in real time before embedding into your application.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={launchTestPopup}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Test in Popup</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Client ID</label>
            <input
              type="text"
              value={testClientId}
              onChange={(e) => setTestClientId(e.target.value)}
              placeholder="e.g. 180sec_live__..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Redirect URI</label>
            <input
              type="text"
              value={testRedirectUri}
              onChange={(e) => setTestRedirectUri(e.target.value)}
              placeholder="https://your-domain.com/callback"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Scopes</label>
            <input
              type="text"
              value={testScope}
              onChange={(e) => setTestScope(e.target.value)}
              placeholder="openid identity:read identity:email"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">UX Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTestUxMode('popup')}
                className={`py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  testUxMode === 'popup'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Popup Modal (Recommended)
              </button>
              <button
                type="button"
                onClick={() => setTestUxMode('redirect')}
                className={`py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  testUxMode === 'redirect'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Full Page Redirect
              </button>
            </div>
          </div>
        </div>

        {/* Live Generated URL Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Live Generated Authorize URL</span>
            <button
              type="button"
              onClick={() => copyToClipboard(generatedAuthUrl, 'auth_url')}
              className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
            >
              {copiedKey === 'auth_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'auth_url' ? 'Copied' : 'Copy URL'}</span>
            </button>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-xs text-slate-300 break-all select-all">
            {generatedAuthUrl}
          </div>
        </div>
      </section>

      {/* ─── Tech Stack Quickstarts & Code Tabs ─── */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Integration Guides by Framework
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Choose your programming language or framework to copy drop-in authentication code.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
          {[
            { id: 'sdk', label: 'Drop-in Web SDK', icon: Globe },
            { id: 'nextauth', label: 'Next.js (NextAuth / Auth.js)', icon: Layers },
            { id: 'node', label: 'Node.js (Express)', icon: Code2 },
            { id: 'python', label: 'Python (FastAPI / Django)', icon: Terminal },
            { id: 'flutter', label: 'Flutter Mobile (PKCE)', icon: Smartphone },
            { id: 'curl', label: 'cURL / REST API', icon: Terminal },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Drop-in Web SDK */}
        {activeTab === 'sdk' && (
          <div className="space-y-4">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white">1. Include 180 Identity SDK in your HTML &lt;head&gt;</h3>
              <div className="relative">
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
{`<script src="https://180identity.180workspace.com/sdk/180-identity.js"></script>`}
                </pre>
                <button
                  type="button"
                  onClick={() => copyToClipboard('<script src="https://180identity.180workspace.com/sdk/180-identity.js"></script>', 'sdk_tag')}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  {copiedKey === 'sdk_tag' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <h3 className="text-sm font-bold text-white pt-2">2. Mount the 180 Identity Button or Trigger via JS</h3>
              <div className="relative">
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
{`<!-- Container for rendered button -->
<div id="180-auth-container"></div>

<script>
  // Render high-fidelity 180 Identity button
  OneEightyIdentity.renderButton('180-auth-container', {
    clientId: 'YOUR_CLIENT_ID',
    uxMode: 'popup',
    scope: 'openid identity:read identity:email',
    onSuccess: function(response) {
      console.log('Received Auth Code:', response.code);
      // Send response.code to your backend to exchange for session tokens
      fetch('/api/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: response.code })
      });
    },
    onError: function(err) {
      console.error('180 Identity error:', err);
    }
  });
</script>`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: NextAuth / Auth.js */}
        {activeTab === 'nextauth' && (
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white">NextAuth / Auth.js Custom OIDC Provider Configuration</h3>
            <p className="text-xs text-slate-400">
              Add 180 Identity to your `[...nextauth]/route.ts` or `auth.ts` file:
            </p>
            <div className="relative">
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
{`import NextAuth from "next-auth";

export const authOptions = {
  providers: [
    {
      id: "180-identity",
      name: "180 Identity",
      type: "oauth",
      wellKnown: "https://180identity.180workspace.com/.well-known/openid-configuration",
      authorization: {
        params: { scope: "openid identity:read identity:email" },
      },
      clientId: process.env.ONE_EIGHTY_CLIENT_ID,
      clientSecret: process.env.ONE_EIGHTY_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile.sub || profile.id,
          name: profile.name,
          email: profile.email,
          image: profile.avatar || profile.picture,
          username: profile.username,
        };
      },
    },
  ],
};

export default NextAuth(authOptions);`}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 3: Node.js Express */}
        {activeTab === 'node' && (
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white">Back-Channel Token Exchange in Node.js (Express)</h3>
            <div className="relative">
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
{`const express = require('express');
const axios = require('axios');
const app = express();

app.post('/api/auth/180/callback', async (req, res) => {
  const { code } = req.body;

  try {
    // 1. Exchange authorization code with 180 Identity Provider
    const tokenRes = await axios.post('https://180identity.180workspace.com/oauth/token', {
      grant_type: 'authorization_code',
      client_id: process.env.ONE_EIGHTY_CLIENT_ID,
      client_secret: process.env.ONE_EIGHTY_CLIENT_SECRET,
      code: code,
      redirect_uri: 'https://your-domain.com/callback'
    });

    const { access_token, id_token } = tokenRes.data;

    // 2. Fetch authenticated 180 Profile
    const profileRes = await axios.get('https://180identity.180workspace.com/oauth/userinfo', {
      headers: { Authorization: \`Bearer \${access_token}\` }
    });

    const userProfile = profileRes.data;
    console.log('Verified 180 User:', userProfile.email, userProfile.username);

    // 3. Issue your local application session cookie
    res.json({ success: true, user: userProfile });
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});`}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 4: Python FastAPI */}
        {activeTab === 'python' && (
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white">Token Exchange in Python (FastAPI + httpx)</h3>
            <div className="relative">
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
{`import os
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class AuthCallback(BaseModel):
    code: str

@app.post("/api/auth/180/callback")
async def handle_callback(payload: AuthCallback):
    async with httpx.AsyncClient() as client:
        # 1. Exchange authorization code for tokens
        token_res = await client.post(
            "https://180identity.180workspace.com/oauth/token",
            json={
                "grant_type": "authorization_code",
                "client_id": os.getenv("ONE_EIGHTY_CLIENT_ID"),
                "client_secret": os.getenv("ONE_EIGHTY_CLIENT_SECRET"),
                "code": payload.code,
                "redirect_uri": "https://your-domain.com/callback",
            },
        )
        if token_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Token exchange failed")

        tokens = token_res.json()
        access_token = tokens["access_token"]

        # 2. Retrieve verified user profile
        user_res = await client.get(
            "https://180identity.180workspace.com/oauth/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        return {"user": user_res.json()}`}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 5: Flutter Mobile PKCE */}
        {activeTab === 'flutter' && (
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white">Flutter Mobile Native PKCE Flow (RFC 7636)</h3>
            <p className="text-xs text-slate-400">
              Native mobile apps must use Public PKCE with custom deep-link URI callbacks.
            </p>
            <div className="relative">
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
{`import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:http/http.dart' as http;

class OneEightyAuthService {
  final String clientId = 'YOUR_PUBLIC_CLIENT_ID';
  final String redirectUri = 'myapp://oauth-callback';

  // 1. Generate RFC 7636 PKCE code_challenge
  String generateCodeVerifier() => 'your_random_64_char_alphanumeric_verifier';
  
  String generateCodeChallenge(String verifier) {
    return base64UrlEncode(sha256.convert(ascii.encode(verifier)).bytes)
        .replaceAll('=', '');
  }

  // 2. Launch browser with PKCE challenge
  Future<void> login() async {
    final verifier = generateCodeVerifier();
    final challenge = generateCodeChallenge(verifier);

    final url = Uri.parse(
      'https://180identity.180workspace.com/oauth/authorize'
      '?client_id=$clientId'
      '&redirect_uri=$redirectUri'
      '&scope=openid identity:read'
      '&response_type=code'
      '&code_challenge=$challenge'
      '&code_challenge_method=S256',
    );

    await launchUrl(url, mode: LaunchMode.externalApplication);
  }
}`}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 6: cURL */}
        {activeTab === 'curl' && (
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white">Direct REST API / cURL Requests</h3>
            <div className="relative">
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
{`# 1. Exchange authorization code for RS256 JWT tokens
curl -X POST https://180identity.180workspace.com/oauth/token \\
  -H "Content-Type: application/json" \\
  -d '{
    "grant_type": "authorization_code",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "code": "AUTH_CODE_FROM_CALLBACK",
    "redirect_uri": "https://your-domain.com/callback"
  }'

# 2. Fetch authenticated 180 Profile using Access Token
curl -X GET https://180identity.180workspace.com/oauth/userinfo \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 3. Retrieve live Public RSA Keys (RFC 7517 JWKS)
curl -X GET https://180identity.180workspace.com/certs/jwks.json`}
              </pre>
            </div>
          </div>
        )}
      </section>

      {/* ─── Endpoint Reference Table ─── */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white tracking-tight">OIDC & OAuth 2.0 Endpoint Reference</h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Endpoint</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              <tr>
                <td className="py-3 px-4 font-mono text-indigo-400">/.well-known/openid-configuration</td>
                <td className="py-3 px-4 font-semibold text-emerald-400">GET</td>
                <td className="py-3 px-4">Standard OpenID Connect discovery metadata document.</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono text-indigo-400">/certs/jwks.json (or /.well-known/jwks.json)</td>
                <td className="py-3 px-4 font-semibold text-emerald-400">GET</td>
                <td className="py-3 px-4">RFC 7517 JSON Web Key Set (public RSA-2048 keys for RS256 signature verification).</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono text-indigo-400">/oauth/authorize</td>
                <td className="py-3 px-4 font-semibold text-emerald-400">GET</td>
                <td className="py-3 px-4">Hosted user consent & sign-in dialog (supports popup and full redirect).</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono text-indigo-400">/oauth/token</td>
                <td className="py-3 px-4 font-semibold text-amber-400">POST</td>
                <td className="py-3 px-4">Exchanges authorization code for RS256 `id_token` and `access_token`.</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono text-indigo-400">/oauth/userinfo</td>
                <td className="py-3 px-4 font-semibold text-emerald-400">GET / POST</td>
                <td className="py-3 px-4">Returns verified 180 Profile (`sub`, `name`, `username`, `email`, `avatar`).</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono text-indigo-400">/oauth/revoke</td>
                <td className="py-3 px-4 font-semibold text-rose-400">POST</td>
                <td className="py-3 px-4">Revokes an active access or refresh token (RFC 7009).</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Security & Best Practices Callout */}
      <div className="p-6 rounded-3xl bg-indigo-950/20 border border-indigo-500/30 flex items-start gap-4">
        <Shield className="w-6 h-6 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1.5 text-xs sm:text-sm">
          <h4 className="font-bold text-white">Security & Zero Credential Lock-In</h4>
          <p className="text-slate-300 leading-relaxed">
            180 Identity signs tokens using asymmetric 2048-bit RSA keys (RS256). You can verify
            signatures entirely on your server by caching the public keys from{' '}
            <code className="text-indigo-300 font-mono">/certs/jwks.json</code> without performing
            remote database queries on each API request.
          </p>
        </div>
      </div>
    </div>
  );
}
