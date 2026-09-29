'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { signIn } from 'next-auth/react';
import toast from 'react-hot-toast';

function OAuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const [status, setStatus] = useState<'exchanging' | 'success' | 'error'>('exchanging');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // 1. Check for authorization errors
    if (error) {
      setStatus('error');
      setErrorMessage(errorDescription || error || 'Authorization was denied or failed');
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMessage('Missing authorization code');
      return;
    }

    // 2. If opened in a popup window, deliver message to parent window and close
    if (typeof window !== 'undefined' && window.opener && window.opener !== window) {
      try {
        window.opener.postMessage(
          {
            type: '180_IDENTITY_SUCCESS',
            code,
            state: state || '',
          },
          '*'
        );
        setStatus('success');
        setTimeout(() => {
          try {
            window.close();
          } catch (e) {}
        }, 500);
        return;
      } catch (e) {
        console.error('[OAuth Callback] postMessage to opener failed:', e);
      }
    }

    // 3. Otherwise handle direct browser redirect exchange
    exchangeAuthCode(code);
  }, [code, error]);

  const exchangeAuthCode = async (authCode: string) => {
    try {
      setStatus('exchanging');

      // Exchange code with 180 Workspace backend
      const res = await fetch('/api/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: process.env.NEXT_PUBLIC_180_CLIENT_ID || '180_client_5cc136397553836e34eb37ce22d13a53',
          code: authCode,
          redirect_uri: window.location.origin + '/callback',
        }),
      });

      const tokenData = await res.json();

      if (!res.ok || !tokenData.access_token) {
        throw new Error(tokenData.error_description || tokenData.error || 'Token exchange failed');
      }

      const authToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;

      // Store tokens
      localStorage.setItem('platform_auth_token', authToken);
      if (refreshToken) {
        localStorage.setItem('platform_refresh_token', refreshToken);
      }

      const isProd = window.location.protocol === 'https:';
      const is180 = window.location.hostname.endsWith('180workspace.com');
      const domainAttr = is180 ? '; domain=.180workspace.com' : '';
      const cookieFlags = `; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${isProd ? '; Secure' : ''}${domainAttr}`;
      document.cookie = `platform_auth_token=${authToken}${cookieFlags}`;

      // Sign in with NextAuth platform-token provider
      try {
        await signIn('platform-token', {
          token: authToken,
          redirect: false,
        });
      } catch (authErr) {
        console.warn('[OAuth Callback] NextAuth sync note:', authErr);
      }

      // Check User Profile for Corporate Affiliation
      const userRes = await fetch('/api/oauth/userinfo', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const userProfile = userRes.ok ? await userRes.json() : null;

      setStatus('success');
      toast.success('Signed in with 180 Identity!');

      // Route Decision:
      // If user already belongs to a Company -> Dashboard
      // If user has NO company yet -> Workspace Setup
      setTimeout(() => {
        if (userProfile && (userProfile.companyId || userProfile.company)) {
          router.replace('/');
        } else {
          router.replace('/workspace-setup');
        }
      }, 500);
    } catch (err: any) {
      console.error('[OAuth Callback] error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Failed to exchange authorization credentials');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100 p-4">
      <div className="w-full max-w-sm p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
          {status === 'exchanging' && <Loader2 className="w-6 h-6 animate-spin" />}
          {status === 'success' && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
          {status === 'error' && <AlertCircle className="w-6 h-6 text-rose-400" />}
        </div>

        <div>
          <h2 className="text-base font-bold text-white">
            {status === 'exchanging' && 'Completing 180 Identity Sign-In...'}
            {status === 'success' && 'Authenticated!'}
            {status === 'error' && 'Sign-In Failed'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {status === 'exchanging' && 'Exchanging cryptographic tokens with 180 engine'}
            {status === 'success' && 'Redirecting to your workspace...'}
            {status === 'error' && errorMessage}
          </p>
        </div>

        {status === 'error' && (
          <button
            type="button"
            onClick={() => router.replace('/login')}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
          >
            Back to Login
          </button>
        )}
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
