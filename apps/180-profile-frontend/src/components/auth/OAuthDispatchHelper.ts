'use strict';

import toast from 'react-hot-toast';

export interface OAuthParams {
  clientId: string;
  redirectUri: string;
  state: string;
  scope: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  nonce: string;
}

export function extractOAuthParams(searchParams: URLSearchParams): OAuthParams {
  return {
    clientId: searchParams.get('client_id') || '180-workspace-platform',
    redirectUri: searchParams.get('redirect_uri') || '',
    state: searchParams.get('state') || '',
    scope: searchParams.get('scope') || 'openid identity:read identity:email',
    codeChallenge: searchParams.get('code_challenge') || '',
    codeChallengeMethod: searchParams.get('code_challenge_method') || 'S256',
    nonce: searchParams.get('nonce') || '',
  };
}

export function buildOAuthQueryString(params: OAuthParams): string {
  const q = new URLSearchParams();
  if (params.clientId) q.set('client_id', params.clientId);
  if (params.redirectUri) q.set('redirect_uri', params.redirectUri);
  if (params.state) q.set('state', params.state);
  if (params.scope) q.set('scope', params.scope);
  if (params.codeChallenge) q.set('code_challenge', params.codeChallenge);
  if (params.codeChallengeMethod) q.set('code_challenge_method', params.codeChallengeMethod);
  if (params.nonce) q.set('nonce', params.nonce);
  const str = q.toString();
  return str ? `?${str}` : '';
}

export function resolveAppName(clientId: string): string {
  if (clientId === '180-workspace-platform') return '180 Workspace';
  if (clientId === '180-developer-portal') return '180 Developers';
  if (clientId === '180-traffic-director') return '180 Traffic Director';
  if (clientId === '180-profile') return '180 Profile';
  return clientId.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export async function dispatchOAuthSuccess(
  userData: any,
  tokenData: string | undefined,
  params: OAuthParams
) {
  const authToken = tokenData || localStorage.getItem('platform_auth_token') || '';

  try {
    if (authToken) {
      localStorage.setItem('platform_auth_token', authToken);
      document.cookie = `platform_auth_token=${authToken}; path=/; max-age=604800; SameSite=Lax`;
    }
    localStorage.setItem('user', JSON.stringify(userData));
  } catch (_) {}

  let authCode = '';
  let idToken = '';

  try {
    const consentRes = await fetch('/api/oauth/authorize/consent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        client_id: params.clientId,
        redirect_uri: params.redirectUri,
        scope: params.scope,
        state: params.state,
        action: 'allow',
        code_challenge: params.codeChallenge,
        code_challenge_method: params.codeChallengeMethod,
        nonce: params.nonce,
      }),
    });

    if (consentRes.ok) {
      const consentData = await consentRes.json();
      authCode = consentData.code || '';
      idToken = consentData.id_token || consentData.credential || '';
    }
  } catch (err) {
    console.warn('[180 Identity] Consent dispatch note:', err);
  }

  // Cross-window popup communication
  if (window.opener && !window.opener.closed) {
    const payload = {
      type: '180_IDENTITY_SUCCESS',
      code: authCode,
      token: idToken || authToken,
      state: params.state,
      user: userData,
    };
    window.opener.postMessage(payload, '*');
    window.opener.postMessage({ ...payload, type: '180_AUTH_SUCCESS' }, '*');
  }

  toast.success(`Welcome, ${userData.name || userData.username || '180 User'}!`);

  setTimeout(() => {
    if (window.opener && !window.opener.closed) {
      window.close();
    } else if (params.redirectUri && authCode) {
      const url = new URL(params.redirectUri);
      url.searchParams.set('code', authCode);
      if (params.state) url.searchParams.set('state', params.state);
      window.location.href = url.toString();
    } else {
      window.location.href = '/';
    }
  }, 600);
}
