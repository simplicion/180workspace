/**
 * @180workspace/identity-sdk / @workspace/identity-sdk
 * Official Universal Client SDK for 180 Identity (SSO/Auth) & 180 Pay (Checkout)
 */

import React, { useState, useCallback } from 'react';

// ============================================================================
// 1. Types & Interfaces
// ============================================================================

export interface AuthResponse {
  code: string;
  state?: string;
  token?: string | null;
  id_token?: string | null;
  user?: any;
}

export interface OpenPopupOptions {
  clientId: string;
  authServerUrl?: string;
  redirectUri?: string;
  scope?: string;
  state?: string;
  responseType?: 'code' | 'token';
  uxMode?: 'popup' | 'redirect';
  onSuccess?: (response: AuthResponse) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
}

export interface RenderButtonOptions extends OpenPopupOptions {
  theme?: 'obsidian' | 'dark' | 'light' | 'gradient';
  text?: string;
}

export interface CheckoutResponse {
  sessionId: string;
  transactionId?: string;
  amount?: number;
  currency?: string;
  isFree?: boolean;
}

export interface CheckoutOptions {
  sessionId: string;
  amount?: number;
  currency?: string;
  title?: string;
  description?: string;
  checkoutServerUrl?: string;
  onSuccess?: (response: CheckoutResponse) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
}

// ============================================================================
// 2. Base URL Helpers
// ============================================================================

const getAuthServerUrl = (customUrl?: string): string => {
  if (customUrl) return customUrl;
  if (typeof window !== 'undefined') {
    const isProd = window.location.hostname.endsWith('180workspace.com') || window.location.protocol === 'https:';
    return isProd ? 'https://profile.180workspace.com' : 'http://localhost:3009';
  }
  return 'http://localhost:3009';
};

const getPayServerUrl = (customUrl?: string): string => {
  if (customUrl) return customUrl;
  if (typeof window !== 'undefined') {
    const isProd = window.location.hostname.endsWith('180workspace.com') || window.location.protocol === 'https:';
    return isProd ? 'https://profile.180workspace.com' : 'http://localhost:3009';
  }
  return 'http://localhost:3009';
};

// ============================================================================
// 3. Core JavaScript Vanilla API: OneEightyIdentity
// ============================================================================

export const OneEightyIdentity = {
  version: '1.0.0',

  /**
   * Opens 180 Identity Dynamic Sovereign Auth in a centered modal popup
   */
  openPopup(options: OpenPopupOptions): Promise<AuthResponse> {
    const { clientId } = options;
    if (!clientId) {
      throw new Error('[180 Identity] Missing required parameter: clientId');
    }

    const authServer = getAuthServerUrl(options.authServerUrl);
    const redirectUri = options.redirectUri || (typeof window !== 'undefined' ? window.location.origin + '/oauth/callback' : '');
    const scope = options.scope || 'openid identity:read identity:email';
    const state = options.state || Math.random().toString(36).substring(2, 15);
    const responseType = options.responseType || 'code';

    const authUrl = `${authServer}/auth/login?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}&response_type=${encodeURIComponent(responseType)}&ux_mode=popup`;

    const width = 450;
    const height = 680;
    const left = typeof window !== 'undefined' && window.screen.width ? (window.screen.width - width) / 2 : 100;
    const top = typeof window !== 'undefined' && window.screen.height ? (window.screen.height - height) / 2 : 100;

    if (options.uxMode === 'redirect') {
      if (typeof window !== 'undefined') {
        window.location.href = authUrl.replace('ux_mode=popup', 'ux_mode=redirect');
      }
      return Promise.resolve({ code: '', state });
    }

    const popup = typeof window !== 'undefined'
      ? window.open(
          authUrl,
          '180_identity_auth',
          `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=no,toolbar=no,resizable=yes`
        )
      : null;

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      if (typeof window !== 'undefined') {
        window.location.href = authUrl.replace('ux_mode=popup', 'ux_mode=redirect');
      }
      const err = new Error('Popup blocked by browser. Redirecting directly to 180 Identity.');
      options.onError?.(err);
      return Promise.reject(err);
    }

    return new Promise((resolve, reject) => {
      let isResolved = false;

      const messageListener = (event: MessageEvent) => {
        if (!event.data || (event.data.type !== '180_IDENTITY_SUCCESS' && event.data.type !== '180_AUTH_SUCCESS')) {
          return;
        }

        isResolved = true;
        if (typeof window !== 'undefined') {
          window.removeEventListener('message', messageListener);
        }
        clearInterval(pollTimer);

        const result: AuthResponse = {
          code: event.data.code,
          state: event.data.state || state,
          token: event.data.token || event.data.accessToken || null,
          id_token: event.data.id_token || null,
          user: event.data.user || null,
        };

        options.onSuccess?.(result);
        resolve(result);
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('message', messageListener);
      }

      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          if (typeof window !== 'undefined') {
            window.removeEventListener('message', messageListener);
          }
          if (!isResolved) {
            const err = new Error('Authentication cancelled by user');
            options.onCancel?.();
            options.onError?.(err);
            reject(err);
          }
        }
      }, 500);
    });
  },

  /**
   * Plain Vanilla DOM Button Renderer
   */
  renderButton(target: HTMLElement | string, options: RenderButtonOptions): void {
    const element = typeof target === 'string' ? document.getElementById(target) : target;
    if (!element) {
      throw new Error('[180 Identity] Target element not found');
    }

    const text = options.text || 'Continue with 180 Profile';
    const isDark = (options.theme || 'obsidian') !== 'light';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'one-eighty-identity-button';

    const bg = isDark ? '#101012' : '#ffffff';
    const textCol = isDark ? '#ffffff' : '#0f172a';
    const borderCol = isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0';

    btn.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: ${bg};
      color: ${textCol};
      border: 1px solid ${borderCol};
      border-radius: 14px;
      padding: 12px 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
      transition: all 0.2s ease;
      outline: none;
    `;

    const icon = document.createElement('span');
    icon.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 8px;
      background: linear-gradient(135deg, #7c3aed, #4f46e5);
      color: #ffffff;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: -0.5px;
    `;
    icon.innerText = '180';

    const label = document.createElement('span');
    label.innerText = text;

    btn.appendChild(icon);
    btn.appendChild(label);

    btn.onmouseenter = () => {
      btn.style.borderColor = '#a855f7';
      btn.style.transform = 'translateY(-1px)';
    };

    btn.onmouseleave = () => {
      btn.style.borderColor = borderCol;
      btn.style.transform = 'none';
    };

    btn.onclick = () => {
      OneEightyIdentity.openPopup(options);
    };

    element.innerHTML = '';
    element.appendChild(btn);
  }
};

// ============================================================================
// 4. Core JavaScript Vanilla API: OneEightyPay
// ============================================================================

export const OneEightyPay = {
  version: '1.0.0',

  /**
   * Opens 180 Profile Sovereign Checkout in modal popup
   */
  checkout(options: CheckoutOptions): Promise<CheckoutResponse> {
    const { sessionId } = options;
    if (!sessionId) {
      throw new Error('[180 Pay] Missing required parameter: sessionId');
    }

    const payServer = getPayServerUrl(options.checkoutServerUrl);
    const query = [
      options.amount ? `amount=${encodeURIComponent(options.amount)}` : '',
      options.currency ? `currency=${encodeURIComponent(options.currency)}` : '',
      options.title ? `title=${encodeURIComponent(options.title)}` : '',
      options.description ? `description=${encodeURIComponent(options.description)}` : '',
    ].filter(Boolean).join('&');

    const checkoutUrl = `${payServer}/checkout/${encodeURIComponent(sessionId)}${query ? `?${query}` : ''}`;

    const width = 460;
    const height = 700;
    const left = typeof window !== 'undefined' && window.screen.width ? (window.screen.width - width) / 2 : 100;
    const top = typeof window !== 'undefined' && window.screen.height ? (window.screen.height - height) / 2 : 100;

    const popup = typeof window !== 'undefined'
      ? window.open(
          checkoutUrl,
          '180_pay_checkout',
          `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=no,toolbar=no,resizable=yes`
        )
      : null;

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      if (typeof window !== 'undefined') {
        window.location.href = checkoutUrl;
      }
      const err = new Error('Popup blocked by browser. Redirecting directly to 180 Pay.');
      options.onError?.(err);
      return Promise.reject(err);
    }

    return new Promise((resolve, reject) => {
      let isResolved = false;

      const messageListener = (event: MessageEvent) => {
        if (!event.data || (event.data.type !== '180_PAYMENT_SUCCESS' && event.data.type !== '180_PAY_SUCCESS')) {
          return;
        }

        isResolved = true;
        if (typeof window !== 'undefined') {
          window.removeEventListener('message', messageListener);
        }
        clearInterval(pollTimer);

        const result: CheckoutResponse = {
          sessionId: event.data.sessionId || sessionId,
          transactionId: event.data.transactionId,
          amount: options.amount,
          currency: options.currency,
          isFree: Boolean(event.data.isFree),
        };

        options.onSuccess?.(result);
        resolve(result);
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('message', messageListener);
      }

      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          if (typeof window !== 'undefined') {
            window.removeEventListener('message', messageListener);
          }
          if (!isResolved) {
            const err = new Error('Payment was cancelled by the user.');
            options.onCancel?.();
            options.onError?.(err);
            reject(err);
          }
        }
      }, 500);
    });
  },

  /**
   * Webhook HMAC Verification Helper
   */
  webhooks: {
    constructEvent(rawBody: string | any, signature: string, secret: string) {
      // In Node.js environment
      try {
        const crypto = require('crypto');
        const payloadString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
        const expected = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
        if (expected !== signature) {
          throw new Error('Invalid 180 Webhook Signature');
        }
        return JSON.parse(payloadString);
      } catch (e: any) {
        throw new Error(`[180 Webhook Verification] ${e.message}`);
      }
    }
  }
};

// ============================================================================
// 5. Universal React Hooks: use180Identity & use180Pay
// ============================================================================

export function use180Identity() {
  const [isOpeningIdentity, setIsOpeningIdentity] = useState(false);

  const launch180Identity = useCallback(
    async (options?: Partial<OpenPopupOptions>) => {
      setIsOpeningIdentity(true);
      try {
        const clientId = options?.clientId || '180-workspace-platform';
        const res = await OneEightyIdentity.openPopup({
          clientId,
          ...options,
        });
        return res;
      } finally {
        setIsOpeningIdentity(false);
      }
    },
    []
  );

  return {
    launch180Identity,
    isOpeningIdentity,
    isLoading: isOpeningIdentity,
  };
}

export function use180Pay() {
  const [isOpeningPay, setIsOpeningPay] = useState(false);

  const launch180Pay = useCallback(
    async (options: CheckoutOptions) => {
      setIsOpeningPay(true);
      try {
        const res = await OneEightyPay.checkout(options);
        return res;
      } finally {
        setIsOpeningPay(false);
      }
    },
    []
  );

  return {
    launch180Pay,
    isOpeningPay,
    isLoading: isOpeningPay,
  };
}

// ============================================================================
// 6. Universal React Component: OneEightyIdentityButton (like GoogleLogin)
// ============================================================================

export interface OneEightyIdentityButtonProps {
  clientId?: string;
  redirectUri?: string;
  scope?: string;
  state?: string;
  theme?: 'obsidian' | 'dark' | 'light' | 'gradient';
  text?: string;
  className?: string;
  onSuccess?: (res: AuthResponse) => void;
  onError?: (err: Error) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

export const OneEightyIdentityButton: React.FC<OneEightyIdentityButtonProps> = ({
  clientId = '180-workspace-platform',
  redirectUri,
  scope,
  state,
  theme = 'obsidian',
  text = 'Continue with 180 Profile',
  className = '',
  onSuccess,
  onError,
  onCancel,
  disabled = false,
}) => {
  const { launch180Identity, isOpeningIdentity } = use180Identity();

  const handleClick = () => {
    launch180Identity({
      clientId,
      redirectUri,
      scope,
      state,
      onSuccess,
      onError,
      onCancel,
    });
  };

  const isDark = theme !== 'light';

  return (
    <button
      type="button"
      disabled={disabled || isOpeningIdentity}
      onClick={handleClick}
      className={`group relative overflow-hidden rounded-2xl p-[1px] bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 shadow-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer ${className}`}
    >
      <div className={`w-full rounded-[15px] px-5 py-3.5 flex items-center justify-between transition-colors ${
        isDark ? 'bg-[#101012] group-hover:bg-[#16161a] text-white' : 'bg-white group-hover:bg-gray-50 text-gray-900'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-md">
            180
          </div>
          <div className="text-left">
            <div className="text-sm font-bold flex items-center gap-1.5">
              <span>{text}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
            </div>
            <div className={`text-[11px] font-medium ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
              Single Sign-On • WhatsApp OTP • Sovereign
            </div>
          </div>
        </div>

        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
          isDark ? 'bg-white/10 text-white group-hover:bg-purple-500/20' : 'bg-gray-100 text-gray-700'
        }`}>
          {isOpeningIdentity ? '...' : '→'}
        </div>
      </div>
    </button>
  );
};

// ============================================================================
// 7. Global Window Exports & Sovereign Namespace
// ============================================================================

export const OneEightyProfile = {
  auth: OneEightyIdentity,
  pay: OneEightyPay,
};

if (typeof window !== 'undefined') {
  (window as any).OneEightyIdentity = OneEightyIdentity;
  (window as any).OneEightyPay = OneEightyPay;
  (window as any).OneEightyProfile = OneEightyProfile;
}

export default OneEightyIdentity;
