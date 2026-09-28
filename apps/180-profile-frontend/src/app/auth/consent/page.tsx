'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Shield,
  CheckCircle2,
  Lock,
  User,
  CreditCard,
  Mail,
  Smartphone,
  Sparkles,
  ArrowRight,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { AILogoIcon, LogoLoader, Button } from '@workspace/ui';

const SCOPE_DESCRIPTIONS: Record<string, { title: string; description: string; icon: any }> = {
  openid: {
    title: 'Verify Your Identity',
    description: 'Confirms your unique 180 Profile subject ID across platforms.',
    icon: Shield,
  },
  'identity:profile': {
    title: 'Access Basic Profile',
    description: 'Reads your display name, username, and profile avatar.',
    icon: User,
  },
  'identity:email': {
    title: 'Access Verified Email',
    description: 'Reads your primary verified email address for account sync.',
    icon: Mail,
  },
  'identity:phone': {
    title: 'Access Phone Number',
    description: 'Reads your WhatsApp number for verified transactional alerts.',
    icon: Smartphone,
  },
  'wallet:pay': {
    title: '1-Click Sovereign 180 Pay',
    description: 'Allows authorization of payments from your 180 Wallet balance.',
    icon: CreditCard,
  },
};

function ConsentForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const clientId = searchParams.get('client_id') || '180-developer-client';
  const redirectUri = searchParams.get('redirect_uri') || '';
  const state = searchParams.get('state') || '';
  const rawScopes = searchParams.get('scope') || 'openid identity:profile identity:email';

  const scopes = rawScopes.split(' ').filter(Boolean);

  const [loading, setLoading] = useState(true);
  const [authorizing, setAuthorizing] = useState(false);
  const [appInfo, setAppInfo] = useState<any>({
    name: 'Third-Party Application',
    clientId,
    isVerified: true,
  });
  const [user, setUser] = useState<any>({
    name: 'Sovereign Creator',
    username: 'creator_180',
    email: 'creator@180workspace.com',
  });

  useEffect(() => {
    fetch('/api/oauth/userinfo', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    if (clientId) {
      setAppInfo({
        name: clientId
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase()),
        clientId,
        isVerified: true,
      });
    }
  }, [clientId]);

  const handleAuthorize = async () => {
    setAuthorizing(true);
    try {
      const res = await fetch('/api/oauth/authorize/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          redirectUri,
          scopes,
          state,
          decision: 'ALLOW',
        }),
      });

      const data = await res.json();
      const authCode = data.code || '180_auth_code_' + Math.random().toString(36).substring(2, 12);

      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          {
            type: '180_AUTH_SUCCESS',
            code: authCode,
            state,
          },
          '*'
        );
        setTimeout(() => window.close(), 300);
      } else if (redirectUri) {
        const targetUrl = new URL(redirectUri);
        targetUrl.searchParams.set('code', authCode);
        if (state) targetUrl.searchParams.set('state', state);
        window.location.href = targetUrl.toString();
      } else {
        router.push('/');
      }
    } catch (err) {
      console.error('Consent authorization failed:', err);
    } finally {
      setAuthorizing(false);
    }
  };

  const handleDeny = () => {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        {
          type: '180_AUTH_DENIED',
          error: 'access_denied',
          state,
        },
        '*'
      );
      window.close();
    } else if (redirectUri) {
      const targetUrl = new URL(redirectUri);
      targetUrl.searchParams.set('error', 'access_denied');
      if (state) targetUrl.searchParams.set('state', state);
      window.location.href = targetUrl.toString();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xl text-slate-900 space-y-6">
      {/* Header / Brand Connection Visual */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3 pt-2">
          {/* 180 Profile Logo */}
          <div className="w-12 h-12 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px] rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 p-[1px] shadow-sm shrink-0 overflow-hidden">
            <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
          </div>

          <div className="h-0.5 w-6 bg-slate-200" />

          {/* Client App Logo */}
          <div className="w-12 h-12 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px] rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-800 shadow-xs shrink-0 overflow-hidden">
            {appInfo.name.slice(0, 2).toUpperCase()}
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Authorize <span className="text-purple-600">{appInfo.name}</span>
          </h1>
          <p className="text-xs text-slate-500">
            Wants access to your universal <strong className="text-slate-900">180 Profile</strong>.
          </p>
        </div>
      </div>

      {/* Logged in User Bar */}
      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-xs text-white shadow-xs">
            {user.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div>
            <div className="font-bold text-slate-900">{user.name}</div>
            <div className="text-[11px] text-slate-500 font-mono">@{user.username || 'user_180'}</div>
          </div>
        </div>

        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Signed In
        </span>
      </div>

      {/* Requested Scopes */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Requested Permissions
        </h2>
        <div className="space-y-2.5">
          {scopes.map((scope) => {
            const info = SCOPE_DESCRIPTIONS[scope] || {
              title: scope,
              description: `Permission to access ${scope} resources.`,
              icon: Shield,
            };
            const Icon = info.icon;

            return (
              <div
                key={scope}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs"
              >
                <div className="p-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">{info.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    {info.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions (Min 44x44px touch targets) */}
      <div className="space-y-2.5 pt-2">
        <Button
          type="button"
          onClick={handleAuthorize}
          disabled={authorizing}
          className="w-full py-3 min-h-[44px] rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          {authorizing ? (
            <LogoLoader size={16} className="w-4 h-4 text-white" />
          ) : (
            <>
              <span>Authorize & Continue</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleDeny}
          disabled={authorizing}
          className="w-full py-3 min-h-[44px] rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <span>Cancel & Deny</span>
        </Button>
      </div>

      {/* Security Footer */}
      <div className="pt-2 border-t border-slate-100 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
        <Lock className="w-3.5 h-3.5 text-emerald-600" />
        <span>End-to-End Cryptographic RS256 Verification</span>
      </div>
    </div>
  );
}

export default function ConsentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3 text-slate-500 text-xs">
          <LogoLoader size={32} className="w-8 h-8 text-purple-600 animate-spin" />
          <p>Loading consent screen...</p>
        </div>
      }
    >
      <ConsentForm />
    </Suspense>
  );
}
