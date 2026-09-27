'use client';

import React, { useState } from 'react';
import { Copy, Check, Terminal, Code2, Layers, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';

interface CodeSnippetsProps {
  clientId: string;
}

export const CodeSnippets: React.FC<CodeSnippetsProps> = ({ clientId }) => {
  const [activeTab, setActiveTab] = useState<'curl' | 'node' | 'python' | 'react' | 'nextauth' | 'flutter'>('curl');
  const [copied, setCopied] = useState(false);

  const snippets: Record<string, { title: string; lang: string; code: string }> = {
    curl: {
      title: 'cURL',
      lang: 'bash',
      code: `# 1. Exchange authorization code for RS256 tokens
curl -X POST https://auth.180workspace.com/oauth/token \\
  -H "Content-Type: application/json" \\
  -d '{
    "grant_type": "authorization_code",
    "client_id": "${clientId}",
    "client_secret": "YOUR_CLIENT_SECRET",
    "code": "180_code_xyz123...",
    "redirect_uri": "https://your-app.com/callback"
  }'

# 2. Fetch authenticated 180 Profile
curl -X GET https://auth.180workspace.com/oauth/userinfo \\
  -H "Authorization: Bearer 180_acc_xyz123..."`,
    },
    react: {
      title: 'React / HTML',
      lang: 'jsx',
      code: `<!-- 1. Include 180 Identity SDK in <head> -->
<script src="https://auth.180workspace.com/sdk/180-identity.js"></script>

<!-- 2. Mount button or trigger popup programmatically -->
<div id="180-auth-btn"></div>

<script>
  OneEightyIdentity.renderButton('180-auth-btn', {
    clientId: '${clientId}',
    uxMode: 'popup', // or 'redirect'
    scope: 'openid identity:read identity:email',
    onSuccess: (res) => {
      console.log('Received auth code:', res.code);
      // Send res.code to your backend to exchange for session token
    },
    onError: (err) => console.error(err)
  });
</script>`,
    },
    node: {
      title: 'Node.js (Express)',
      lang: 'javascript',
      code: `const express = require('express');
const axios = require('axios');
const app = express();

app.post('/api/auth/180/callback', async (req, res) => {
  const { code } = req.body;

  // 1. Exchange code for access & ID token
  const tokenRes = await axios.post('https://auth.180workspace.com/oauth/token', {
    grant_type: 'authorization_code',
    client_id: '${clientId}',
    client_secret: process.env.ONE_EIGHTY_CLIENT_SECRET,
    code,
    redirect_uri: 'https://your-app.com/callback'
  });

  const { access_token, id_token } = tokenRes.data;

  // 2. Fetch verified 180 profile
  const userRes = await axios.get('https://auth.180workspace.com/oauth/userinfo', {
    headers: { Authorization: \`Bearer \${access_token}\` }
  });

  console.log('User Profile:', userRes.data);
  res.json({ user: userRes.data });
});`,
    },
    python: {
      title: 'Python (FastAPI)',
      lang: 'python',
      code: `import httpx
from fastapi import FastAPI, HTTPException

app = FastAPI()

AUTH_URL = "https://auth.180workspace.com/oauth/token"
USERINFO_URL = "https://auth.180workspace.com/oauth/userinfo"
CLIENT_ID = "${clientId}"
CLIENT_SECRET = "YOUR_CLIENT_SECRET"

@app.post("/auth/180/callback")
async def handle_callback(code: str):
    async with httpx.AsyncClient() as client:
        # 1. Exchange authorization code
        resp = await client.post(AUTH_URL, json={
            "grant_type": "authorization_code",
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "code": code,
            "redirect_uri": "https://your-app.com/callback"
        })
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Token exchange failed")
        
        tokens = resp.json()
        
        # 2. Get user info
        user_resp = await client.get(USERINFO_URL, headers={
            "Authorization": f"Bearer {tokens['access_token']}"
        })
        return user_resp.json()`,
    },
    nextauth: {
      title: 'NextAuth.js',
      lang: 'javascript',
      code: `// pages/api/auth/[...nextauth].js or app/api/auth/[...nextauth]/route.ts
export const authOptions = {
  providers: [
    {
      id: "180-identity",
      name: "180 Identity",
      type: "oauth",
      wellKnown: "https://auth.180workspace.com/.well-known/openid-configuration",
      authorization: { params: { scope: "openid identity:read identity:email" } },
      clientId: "${clientId}",
      clientSecret: process.env.ONE_EIGHTY_CLIENT_SECRET,
      idToken: true,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          username: profile.username,
        };
      },
    },
  ],
};`,
    },
    flutter: {
      title: 'Flutter Mobile',
      lang: 'dart',
      code: `import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

Future<void> signInWith180Identity() async {
  const clientId = '${clientId}';
  const callbackUrlScheme = 'myapp';
  const redirectUri = '$callbackUrlScheme://oauth-callback';

  final authUri = Uri.parse(
    'https://auth.180workspace.com/oauth/authorize'
    '?client_id=$clientId'
    '&redirect_uri=$redirectUri'
    '&response_type=code'
    '&scope=openid%20identity:read'
    '&ux_mode=redirect'
  );

  // 1. Launch in-app secure browser
  final result = await FlutterWebAuth2.authenticate(
    url: authUri.toString(),
    callbackUrlScheme: callbackUrlScheme,
  );

  // 2. Extract authorization code from deep link
  final code = Uri.parse(result).queryParameters['code'];

  // 3. Exchange code for tokens
  final response = await http.post(
    Uri.parse('https://auth.180workspace.com/oauth/token'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({
      'grant_type': 'authorization_code',
      'client_id': clientId,
      'code': code,
      'redirect_uri': redirectUri,
    }),
  );

  print('Token Response: \${response.body}');
}`,
    },
  };

  const copyToClipboard = () => {
    const text = snippets[activeTab].code;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Snippet copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
      {/* Tabs Bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60 px-4 py-2">
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {Object.entries(snippets).map(([key, item]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === key
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {item.title}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={copyToClipboard}
          className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors ml-2 shrink-0 cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* Code Display */}
      <div className="p-4 bg-slate-950/80 overflow-x-auto text-xs font-mono leading-relaxed text-slate-200">
        <pre>{snippets[activeTab].code}</pre>
      </div>
    </div>
  );
};
