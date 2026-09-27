'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import toast from 'react-hot-toast';

export function use180Identity() {
  const [isOpeningIdentity, setIsOpeningIdentity] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const launch180Identity = async () => {
    setIsOpeningIdentity(true);
    const returnUrl = searchParams?.get('returnUrl') || searchParams?.get('from') || '/';

    const width = 450;
    const height = 680;
    const left = window.screen.width ? (window.screen.width - width) / 2 : 100;
    const top = window.screen.height ? (window.screen.height - height) / 2 : 100;

    const clientId = '180-workspace-platform';
    const redirectUri = window.location.origin + '/callback';
    const state = Math.random().toString(36).substring(2, 15);
    const scope = 'openid identity:read identity:email';

    const authUrl = `/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}&response_type=code&ux_mode=popup`;

    const popup = window.open(
      authUrl,
      '180_identity_auth',
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=no,toolbar=no,resizable=yes`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      setIsOpeningIdentity(false);
      // Popup blocked fallback: redirect directly
      window.location.href = authUrl.replace('ux_mode=popup', 'ux_mode=redirect');
      return;
    }

    const messageHandler = async (event: MessageEvent) => {
      if (!event.data || event.data.type !== '180_IDENTITY_SUCCESS') return;

      window.removeEventListener('message', messageHandler);
      clearInterval(pollInterval);

      const { code } = event.data;
      if (!code) {
        setIsOpeningIdentity(false);
        toast.error('Identity authentication failed');
        return;
      }

      try {
        // Exchange code with backend
        const tokenRes = await fetch('/api/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            client_id: clientId,
            code,
            redirect_uri: redirectUri,
          }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok || !tokenData.access_token) {
          throw new Error(tokenData.error_description || tokenData.error || 'Token exchange failed');
        }

        const token = tokenData.access_token;
        const refreshToken = tokenData.refresh_token;

        localStorage.setItem('platform_auth_token', token);
        if (refreshToken) localStorage.setItem('platform_refresh_token', refreshToken);

        const isProd = window.location.protocol === 'https:';
        const is180 = window.location.hostname.endsWith('180workspace.com');
        const domainAttr = is180 ? '; domain=.180workspace.com' : '';
        const cookieFlags = `; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${isProd ? '; Secure' : ''}${domainAttr}`;
        document.cookie = `platform_auth_token=${token}${cookieFlags}`;

        await signIn('platform-token', { token, redirect: false });

        // Check user profile for company affiliation
        const userRes = await fetch('/api/oauth/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const user = userRes.ok ? await userRes.json() : null;

        toast.success('Signed in with 180 Identity!');

        if (user && (user.companyId || user.company)) {
          window.location.href = returnUrl === '/login' ? '/' : returnUrl;
        } else {
          window.location.href = '/workspace-setup';
        }
      } catch (err: any) {
        console.error('180 Identity exchange error:', err);
        toast.error(err.message || 'Authentication exchange failed');
      } finally {
        setIsOpeningIdentity(false);
      }
    };

    window.addEventListener('message', messageHandler);

    const pollInterval = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollInterval);
        window.removeEventListener('message', messageHandler);
        setIsOpeningIdentity(false);
      }
    }, 500);
  };

  return {
    launch180Identity,
    isOpeningIdentity,
  };
}
