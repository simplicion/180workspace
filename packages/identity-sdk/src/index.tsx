/**
 * @180workspace/identity-sdk / @workspace/identity-sdk
 * Official Universal Client SDK for 180 Identity (SSO/Auth) & 180 Pay (Checkout)
 */

import React, { useState, useCallback } from 'react';
import { JwksVerifier } from './jwks-verifier';
import { TokenExchangeClient } from './token-exchange';
import { UserInfoClient } from './userinfo-client';
import { generatePkcePair } from './pkce';


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

export type AuthUxMode = 'popup' | 'bottom_sheet' | 'fullscreen' | 'redirect' | 'auto';
export type PayUxMode = 'bottom_sheet' | 'full_page' | 'popup' | 'redirect' | 'auto';

export interface OpenPopupOptions {
  clientId: string;
  authServerUrl?: string;
  redirectUri?: string;
  scope?: string;
  state?: string;
  responseType?: 'code' | 'token';
  uxMode?: AuthUxMode;
  onSuccess?: (response: AuthResponse) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
}

export type OpenAuthOptions = OpenPopupOptions;

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
  sessionId?: string;
  amount?: number;
  currency?: string;
  title?: string;
  description?: string;
  couponCode?: string;
  metadata?: Record<string, any>;
  checkoutServerUrl?: string;
  uxMode?: PayUxMode;
  onSuccess?: (response: CheckoutResponse) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
}

// ============================================================================
// 2. Base URL Helpers
// ============================================================================

const getAuthServerUrl = (customUrl?: string): string => {
  if (customUrl) return customUrl;
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_180_AUTH_URL) {
    return process.env.NEXT_PUBLIC_180_AUTH_URL;
  }
  if (typeof window !== 'undefined') {
    const isProd = window.location.hostname.endsWith('180workspace.com') || window.location.protocol === 'https:';
    return isProd ? 'https://profile.180workspace.com' : 'http://localhost:3009';
  }
  return 'http://localhost:3009';
};

const getPayServerUrl = (customUrl?: string): string => {
  if (customUrl) return customUrl;
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_180_PAY_URL) {
    return process.env.NEXT_PUBLIC_180_PAY_URL;
  }
  if (typeof window !== 'undefined') {
    const isProd = window.location.hostname.endsWith('180workspace.com') || window.location.protocol === 'https:';
    return isProd ? 'https://pay.180workspace.com' : 'http://localhost:3009';
  }
  return 'http://localhost:3009';
};

/**
 * Pre-establishes TCP/TLS sockets to 180 Identity server to eliminate popup opening latency
 */
export const preconnectAuthServer = (customUrl?: string) => {
  if (typeof document === 'undefined') return;
  const server = getAuthServerUrl(customUrl);
  try {
    const existing = document.querySelector(`link[data-180-origin="${server}"]`);
    if (!existing) {
      const link1 = document.createElement('link');
      link1.rel = 'preconnect';
      link1.href = server;
      link1.setAttribute('data-180-origin', server);
      document.head.appendChild(link1);

      const link2 = document.createElement('link');
      link2.rel = 'dns-prefetch';
      link2.href = server;
      document.head.appendChild(link2);
    }
  } catch (_) {}
};

// Auto-warm connection in browser environments
if (typeof window !== 'undefined') {
  preconnectAuthServer();
}

/**
 * Detects whether the current client is on a mobile device or screen
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
};

/* ── Bottom Sheet CSS & Layout Injector ─────────────────────────────────── */

const BOTTOM_SHEET_STYLE_ID = '__180_bottom_sheet_styles__';

const injectBottomSheetCSS = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById(BOTTOM_SHEET_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = BOTTOM_SHEET_STYLE_ID;
  style.textContent = `
    @keyframes one-eighty-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes one-eighty-fade-out {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    @keyframes one-eighty-slide-up {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    @keyframes one-eighty-slide-down {
      from { transform: translateY(0); }
      to { transform: translateY(100%); }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
};

interface BottomSheetRunnerOptions<T> {
  url: string;
  title: string;
  successTypes: string[];
  closeTypes?: string[];
  mapSuccess: (data: any) => T;
  onSuccess?: (res: T) => void;
  onError?: (err: Error) => void;
  onCancel?: () => void;
  onDefaultCancelResult: () => T;
}

function openInBottomSheet<T>(opts: BottomSheetRunnerOptions<T>): Promise<T> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('[180 SDK] Bottom sheet can only be rendered in a browser environment'));
  }

  // Remove any stale sheet instances
  const existingSheet = document.getElementById('__180_bottom_sheet_container__');
  if (existingSheet) {
    existingSheet.remove();
  }

  injectBottomSheetCSS();

  return new Promise((resolve, reject) => {
    let isResolved = false;

    // Outer root container
    const root = document.createElement('div');
    root.id = '__180_bottom_sheet_container__';
    root.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: center;
      pointer-events: auto;
      font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.72);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      animation: one-eighty-fade-in 0.25s ease-out forwards;
      cursor: pointer;
    `;

    // Sheet Modal Window
    const isMobile = isMobileDevice();
    const sheet = document.createElement('div');
    sheet.style.cssText = `
      position: relative;
      z-index: 1000000;
      width: 100%;
      max-width: ${isMobile ? '100%' : '480px'};
      height: ${isMobile ? '90vh' : '700px'};
      max-height: 94vh;
      margin: ${isMobile ? '0' : '0 0 24px 0'};
      background: #09090b;
      color: #fafafa;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: ${isMobile ? '24px 24px 0 0' : '24px'};
      box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.65), 0 20px 48px rgba(0, 0, 0, 0.85);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: one-eighty-slide-up 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    `;

    // Header with grab handle, title, close button
    const header = document.createElement('div');
    header.style.cssText = `
      flex-shrink: 0;
      padding: 10px 16px 8px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      background: #09090b;
      position: relative;
    `;

    // Grab handle for mobile touch ergonomics
    const grabBar = document.createElement('div');
    grabBar.style.cssText = `
      width: 44px;
      height: 4px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.22);
      margin-bottom: 8px;
    `;
    header.appendChild(grabBar);

    // Header content bar
    const bar = document.createElement('div');
    bar.style.cssText = `
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    `;

    const titleWrap = document.createElement('div');
    titleWrap.style.cssText = 'display: flex; align-items: center; gap: 8px; min-width: 0;';
    titleWrap.innerHTML = `
      <img src="/black icon.svg" alt="180" style="width: 18px; height: 18px; object-fit: contain; filter: invert(1);" onerror="this.src='/black-icon.svg';" />
      <div style="font-size: 13px; font-weight: 700; color: #f4f4f5; letter-spacing: -0.01em;">${opts.title}</div>
    `;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.style.cssText = `
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #a1a1aa;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
      outline: none;
      padding: 0;
    `;
    closeBtn.innerHTML = `
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    `;
    closeBtn.onmouseenter = () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.18)';
      closeBtn.style.color = '#ffffff';
    };
    closeBtn.onmouseleave = () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.08)';
      closeBtn.style.color = '#a1a1aa';
    };

    bar.appendChild(titleWrap);
    bar.appendChild(closeBtn);
    header.appendChild(bar);

    // Iframe container
    const iframeWrapper = document.createElement('div');
    iframeWrapper.style.cssText = `
      flex: 1;
      width: 100%;
      height: 100%;
      position: relative;
      background: #09090b;
      overflow: hidden;
    `;

    // Skeleton loader
    const skeleton = document.createElement('div');
    skeleton.style.cssText = `
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: #71717a;
      font-size: 12px;
      background: #09090b;
      z-index: 1;
      transition: opacity 0.25s ease;
    `;
    skeleton.innerHTML = `
      <div style="width: 24px; height: 24px; border: 2.5px solid rgba(255, 255, 255, 0.15); border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
      <span>Connecting to Sovereign Protocol…</span>
    `;

    const iframe = document.createElement('iframe');
    iframe.src = opts.url;
    iframe.title = opts.title;
    iframe.allow = 'clipboard-write; payment';
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      background: transparent;
      opacity: 0;
      transition: opacity 0.2s ease;
    `;
    iframe.onload = () => {
      iframe.style.opacity = '1';
      skeleton.style.opacity = '0';
      setTimeout(() => skeleton.remove(), 250);
    };

    iframeWrapper.appendChild(skeleton);
    iframeWrapper.appendChild(iframe);

    sheet.appendChild(header);
    sheet.appendChild(iframeWrapper);

    root.appendChild(backdrop);
    root.appendChild(sheet);
    document.body.appendChild(root);

    const closeSheet = (dismissedByUser = false) => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('message', messageListener);
        window.removeEventListener('keydown', keydownListener);
      }
      sheet.style.animation = 'one-eighty-slide-down 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards';
      backdrop.style.animation = 'one-eighty-fade-out 0.25s ease-in forwards';
      setTimeout(() => {
        root.remove();
      }, 250);

      if (dismissedByUser && !isResolved) {
        opts.onCancel?.();
        resolve(opts.onDefaultCancelResult());
      }
    };

    const messageListener = (event: MessageEvent) => {
      if (!event.data) return;
      if (opts.closeTypes && opts.closeTypes.includes(event.data.type)) {
        closeSheet(false);
        return;
      }
      if (opts.successTypes.includes(event.data.type)) {
        isResolved = true;
        const result = opts.mapSuccess(event.data);
        opts.onSuccess?.(result);
        resolve(result);
        closeSheet(false);
      }
    };

    const keydownListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeSheet(true);
      }
    };

    backdrop.onclick = () => closeSheet(true);
    closeBtn.onclick = () => closeSheet(true);
    window.addEventListener('message', messageListener);
    window.addEventListener('keydown', keydownListener);
  });
}

// ============================================================================
// 3. Core JavaScript Vanilla API: OneEightyIdentity
// ============================================================================

export const OneEightyIdentity = {
  version: '1.0.0',
  JwksVerifier,
  TokenExchangeClient,
  UserInfoClient,
  generatePkcePair,
  preconnect: preconnectAuthServer,
  prefetch: preconnectAuthServer,
  isMobileDevice,

  /**
   * Opens 180 Identity Sovereign Auth with the configured UX mode (bottom_sheet, popup, or fullscreen/redirect)
   */
  openAuth(options: OpenAuthOptions): Promise<AuthResponse> {
    const { clientId } = options;
    if (!clientId) {
      throw new Error('[180 Identity] Missing required parameter: clientId');
    }

    const authServer = getAuthServerUrl(options.authServerUrl);
    preconnectAuthServer(authServer);
    const redirectUri = options.redirectUri || (typeof window !== 'undefined' ? window.location.origin + '/oauth/callback' : '');
    const scope = options.scope || 'openid identity:read identity:email';
    const state = options.state || Math.random().toString(36).substring(2, 15);
    const responseType = options.responseType || 'code';

    // Resolve UX mode: 'bottom_sheet' | 'popup' | 'fullscreen' | 'redirect' | 'auto'
    const isMobile = isMobileDevice();
    let effectiveMode: 'bottom_sheet' | 'popup' | 'fullscreen' = 'popup';

    if (options.uxMode === 'bottom_sheet') {
      effectiveMode = 'bottom_sheet';
    } else if (options.uxMode === 'fullscreen' || options.uxMode === 'redirect') {
      effectiveMode = 'fullscreen';
    } else if (options.uxMode === 'popup') {
      effectiveMode = 'popup';
    } else {
      // 'auto' or undefined: Mobile gets bottom_sheet, Desktop gets popup
      effectiveMode = isMobile ? 'bottom_sheet' : 'popup';
    }

    const authUrl = `${authServer}/auth/login?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}&response_type=${encodeURIComponent(responseType)}&ux_mode=${effectiveMode}`;

    // 1. Fullscreen / Redirect Mode
    if (effectiveMode === 'fullscreen') {
      if (typeof window !== 'undefined') {
        window.location.href = authUrl;
      }
      return Promise.resolve({ code: '', state });
    }

    // 2. Bottom Sheet Mode
    if (effectiveMode === 'bottom_sheet') {
      return openInBottomSheet<AuthResponse>({
        url: authUrl,
        title: '180 Sovereign Identity',
        successTypes: ['180_IDENTITY_SUCCESS', '180_AUTH_SUCCESS'],
        closeTypes: ['180_IDENTITY_CLOSE'],
        mapSuccess: (data) => {
          const result: AuthResponse = {
            code: data.code,
            state: data.state || state,
            token: data.token || data.accessToken || null,
            id_token: data.id_token || null,
            user: data.user || null,
          };
          if (typeof window !== 'undefined') {
            try {
              if (result.token) {
                localStorage.setItem('platform_auth_token', result.token);
                localStorage.setItem('token', result.token);
                document.cookie = `platform_auth_token=${result.token}; path=/; max-age=604800; SameSite=Lax`;
              }
              if (result.user) {
                localStorage.setItem('user', JSON.stringify(result.user));
              }
            } catch (_) {}
          }
          return result;
        },
        onSuccess: options.onSuccess,
        onError: options.onError,
        onCancel: options.onCancel,
        onDefaultCancelResult: () => ({
          code: '',
          state,
          token: null,
          id_token: null,
          user: null,
        }),
      });
    }

    // 3. Popup Mode
    const width = 450;
    const height = 680;
    const left = typeof window !== 'undefined' && window.screen.width ? (window.screen.width - width) / 2 : 100;
    const top = typeof window !== 'undefined' && window.screen.height ? (window.screen.height - height) / 2 : 100;

    const popup = typeof window !== 'undefined'
      ? window.open(
          authUrl,
          '180_identity_auth',
          `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=no,toolbar=no,resizable=yes`
        )
      : null;

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      // Fallback: If popup is blocked by browser, degrade seamlessly to bottom sheet
      return openInBottomSheet<AuthResponse>({
        url: authUrl.replace('ux_mode=popup', 'ux_mode=bottom_sheet'),
        title: '180 Sovereign Identity',
        successTypes: ['180_IDENTITY_SUCCESS', '180_AUTH_SUCCESS'],
        closeTypes: ['180_IDENTITY_CLOSE'],
        mapSuccess: (data) => {
          const result: AuthResponse = {
            code: data.code,
            state: data.state || state,
            token: data.token || data.accessToken || null,
            id_token: data.id_token || null,
            user: data.user || null,
          };
          if (typeof window !== 'undefined') {
            try {
              if (result.token) {
                localStorage.setItem('platform_auth_token', result.token);
                localStorage.setItem('token', result.token);
                document.cookie = `platform_auth_token=${result.token}; path=/; max-age=604800; SameSite=Lax`;
              }
              if (result.user) {
                localStorage.setItem('user', JSON.stringify(result.user));
              }
            } catch (_) {}
          }
          return result;
        },
        onSuccess: options.onSuccess,
        onError: options.onError,
        onCancel: options.onCancel,
        onDefaultCancelResult: () => ({
          code: '',
          state,
          token: null,
          id_token: null,
          user: null,
        }),
      });
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

        if (typeof window !== 'undefined') {
          try {
            if (result.token) {
              localStorage.setItem('platform_auth_token', result.token);
              localStorage.setItem('token', result.token);
              document.cookie = `platform_auth_token=${result.token}; path=/; max-age=604800; SameSite=Lax`;
            }
            if (result.user) {
              localStorage.setItem('user', JSON.stringify(result.user));
            }
          } catch (_) {}
        }

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
            options.onCancel?.();
            resolve({
              code: '',
              state,
              token: null,
              id_token: null,
              user: null,
            });
          }
        }
      }, 500);
    });
  },

  /**
   * Opens 180 Identity Dynamic Sovereign Auth in a centered modal popup (delegates to openAuth)
   */
  openPopup(options: OpenPopupOptions): Promise<AuthResponse> {
    return OneEightyIdentity.openAuth({ ...options, uxMode: options.uxMode || 'popup' });
  },

  /**
   * Opens 180 Identity directly in an in-DOM slide-up bottom sheet
   */
  openBottomSheet(options: OpenPopupOptions): Promise<AuthResponse> {
    return OneEightyIdentity.openAuth({ ...options, uxMode: 'bottom_sheet' });
  },

  /**
   * Plain Vanilla DOM Button Renderer
   */
  renderButton(target: HTMLElement | string, options: RenderButtonOptions): void {
    const element = typeof target === 'string' ? document.getElementById(target) : target;
    if (!element) {
      throw new Error('[180 Identity] Target element not found');
    }

    injectShimmerCSS();

    const text = options.text || 'Continue with 180 Profile';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'one-eighty-identity-button one-eighty-btn-clean identity-btn-shimmer';
    btn.style.cssText = `
      position: relative;
      display: flex;
      align-items: center;
      gap: 11px;
      width: 100%;
      min-height: 44px;
      padding: 7px 13px;
      border-radius: 14px;
      border: 1.5px solid transparent;
      background: linear-gradient(#ffffff, #ffffff) padding-box,
                  linear-gradient(135deg, #2563eb, #4f46e5, #3b82f6, #1d4ed8) border-box;
      background-size: 100% 100%, 250% 250%;
      animation: identity-border-flow 4s ease infinite;
      box-shadow: 0 2px 8px -1px rgba(37, 99, 235, 0.15), 0 1px 3px rgba(0, 0, 0, 0.04);
      cursor: pointer;
      outline: none;
      user-select: none;
      overflow: hidden;
      box-sizing: border-box;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      text-decoration: none;
    `;

    // Brand mark badge with Black Capricorn icon
    const iconBadge = document.createElement('div');
    iconBadge.style.cssText = `
      position: relative;
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease;
    `;

    const img = document.createElement('img');
    img.src = '/black icon.svg';
    img.alt = '180 Profile';
    img.style.cssText = 'width: 17px; height: 17px; object-fit: contain;';
    img.onerror = () => {
      img.src = '/black-icon.svg';
    };
    iconBadge.appendChild(img);

    // Live pulsing green dot
    const dotWrapper = document.createElement('span');
    dotWrapper.style.cssText = 'position: absolute; top: -1.5px; right: -1.5px; width: 7px; height: 7px; display: flex;';
    dotWrapper.innerHTML = `
      <span style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: #10b981; opacity: 0.7; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
      <span style="position: relative; width: 7px; height: 7px; border-radius: 50%; background: #10b981; border: 1px solid #ffffff;"></span>
    `;
    iconBadge.appendChild(dotWrapper);

    // Text container
    const textWrap = document.createElement('div');
    textWrap.style.cssText = 'flex: 1; text-align: left; min-width: 0;';

    const title = document.createElement('div');
    title.style.cssText = 'font-size: 12.5px; font-weight: 700; line-height: 1.2; letter-spacing: -0.01em; color: #0f172a;';
    title.innerText = text;

    const subtitle = document.createElement('div');
    subtitle.style.cssText = 'font-size: 9.5px; font-weight: 500; margin-top: 1px; line-height: 1.2; color: #64748b;';
    subtitle.innerText = 'Sovereign Auth · WhatsApp OTP · SSO';

    textWrap.appendChild(title);
    textWrap.appendChild(subtitle);

    // Arrow
    const arrow = document.createElement('div');
    arrow.style.cssText = `
      flex-shrink: 0;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #f8fafc;
      color: #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    `;
    arrow.innerHTML = '<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>';

    btn.appendChild(iconBadge);
    btn.appendChild(textWrap);
    btn.appendChild(arrow);

    btn.onmouseenter = () => {
      btn.style.transform = 'translateY(-1px)';
      btn.style.boxShadow = '0 6px 18px -2px rgba(37, 99, 235, 0.25), 0 2px 6px rgba(0, 0, 0, 0.06)';
      iconBadge.style.transform = 'scale(1.05)';
      arrow.style.background = '#eff6ff';
      arrow.style.color = '#2563eb';
    };

    btn.onmouseleave = () => {
      btn.style.transform = 'none';
      btn.style.boxShadow = '0 2px 8px -1px rgba(37, 99, 235, 0.15), 0 1px 3px rgba(0, 0, 0, 0.04)';
      iconBadge.style.transform = 'none';
      arrow.style.background = '#f8fafc';
      arrow.style.color = '#94a3b8';
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
   * Opens 180 Profile Sovereign Checkout with the configured UX mode (bottom_sheet, popup, or full_page/redirect)
   */
  checkout(options: CheckoutOptions): Promise<CheckoutResponse> {
    const sessionId = options.sessionId || `sess_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;

    const payServer = getPayServerUrl(options.checkoutServerUrl);
    const isMobile = isMobileDevice();

    let effectiveMode: 'bottom_sheet' | 'full_page' | 'popup' = 'bottom_sheet';
    if (options.uxMode === 'full_page' || options.uxMode === 'redirect') {
      effectiveMode = 'full_page';
    } else if (options.uxMode === 'popup') {
      effectiveMode = 'popup';
    } else if (options.uxMode === 'bottom_sheet') {
      effectiveMode = 'bottom_sheet';
    } else {
      // 'auto' or default: Bottom sheet offers the premier, modern Stripe-like embedded experience
      effectiveMode = isMobile ? 'bottom_sheet' : 'bottom_sheet';
    }

    const query = [
      options.amount ? `amount=${encodeURIComponent(options.amount)}` : '',
      options.currency ? `currency=${encodeURIComponent(options.currency)}` : '',
      options.title ? `title=${encodeURIComponent(options.title)}` : '',
      options.description ? `description=${encodeURIComponent(options.description)}` : '',
      options.couponCode ? `coupon=${encodeURIComponent(options.couponCode)}` : '',
      `ux_mode=${encodeURIComponent(effectiveMode)}`,
    ].filter(Boolean).join('&');

    const checkoutUrl = `${payServer}/checkout/${encodeURIComponent(sessionId)}${query ? `?${query}` : ''}`;

    // 1. Full Page Redirect Mode
    if (effectiveMode === 'full_page') {
      if (typeof window !== 'undefined') {
        window.location.href = checkoutUrl;
      }
      return Promise.resolve({
        sessionId,
        transactionId: undefined,
        amount: options.amount,
        currency: options.currency,
        isFree: false,
      });
    }

    // 2. Bottom Sheet Mode
    if (effectiveMode === 'bottom_sheet') {
      return openInBottomSheet<CheckoutResponse>({
        url: checkoutUrl,
        title: options.title || '180 Sovereign Pay',
        successTypes: ['180_PAYMENT_SUCCESS', '180_PAY_SUCCESS'],
        closeTypes: ['180_PAYMENT_CLOSE'],
        mapSuccess: (data) => ({
          sessionId: data.sessionId || sessionId,
          transactionId: data.transactionId,
          amount: data.amount ?? options.amount,
          currency: data.currency || options.currency,
          isFree: Boolean(data.isFree),
        }),
        onSuccess: options.onSuccess,
        onError: options.onError,
        onCancel: options.onCancel,
        onDefaultCancelResult: () => ({
          sessionId,
          transactionId: undefined,
          amount: options.amount,
          currency: options.currency,
          isFree: false,
        }),
      });
    }

    // 3. Popup Mode
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
      // Fallback: Degrade gracefully to bottom sheet if popup is blocked
      return openInBottomSheet<CheckoutResponse>({
        url: checkoutUrl.replace('ux_mode=popup', 'ux_mode=bottom_sheet'),
        title: options.title || '180 Sovereign Pay',
        successTypes: ['180_PAYMENT_SUCCESS', '180_PAY_SUCCESS'],
        closeTypes: ['180_PAYMENT_CLOSE'],
        mapSuccess: (data) => ({
          sessionId: data.sessionId || sessionId,
          transactionId: data.transactionId,
          amount: data.amount ?? options.amount,
          currency: data.currency || options.currency,
          isFree: Boolean(data.isFree),
        }),
        onSuccess: options.onSuccess,
        onError: options.onError,
        onCancel: options.onCancel,
        onDefaultCancelResult: () => ({
          sessionId,
          transactionId: undefined,
          amount: options.amount,
          currency: options.currency,
          isFree: false,
        }),
      });
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
            options.onCancel?.();
            resolve({
              sessionId,
              transactionId: undefined,
              amount: options.amount,
              currency: options.currency,
              isFree: false,
            });
          }
        }
      }, 500);
    });
  },

  /**
   * Opens 180 Profile Sovereign Checkout directly in an in-DOM slide-up bottom sheet
   */
  openBottomSheet(options: CheckoutOptions): Promise<CheckoutResponse> {
    return OneEightyPay.checkout({ ...options, uxMode: 'bottom_sheet' });
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
    },
    verifySignature(options: VerifyWebhookOptions): boolean {
      return verifyWebhookSignature(options);
    }
  }
};

export interface VerifyWebhookOptions {
  payload: string | any;
  signature: string;
  secret: string;
  toleranceSeconds?: number;
}

export function verifyWebhookSignature(options: VerifyWebhookOptions): boolean {
  try {
    const { payload, signature, secret, toleranceSeconds = 300 } = options;
    const crypto = require('crypto');
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

    if (signature && signature.includes('t=') && signature.includes('v1=')) {
      const parts = signature.split(',');
      const tPart = parts.find((p: string) => p.trim().startsWith('t='));
      const v1Part = parts.find((p: string) => p.trim().startsWith('v1='));
      if (!tPart || !v1Part) return false;
      const timestamp = parseInt(tPart.replace('t=', '').trim(), 10);
      const sigHex = v1Part.replace('v1=', '').trim();

      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - timestamp) > toleranceSeconds) {
        return false;
      }

      const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${payloadString}`).digest('hex');
      try {
        return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sigHex, 'hex'));
      } catch (_) {
        return expected === sigHex;
      }
    }

    const expected = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
    return expected === signature;
  } catch (_) {
    return false;
  }
}

// ============================================================================
// 5. Universal React Hooks: use180Identity & use180Pay
// ============================================================================

export function use180Identity() {
  const [isOpeningIdentity, setIsOpeningIdentity] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const launch180Identity = useCallback(
    async (options?: Partial<OpenPopupOptions> | ((response?: any) => void)) => {
      setIsOpeningIdentity(true);
      try {
        const opts: Partial<OpenPopupOptions> =
          typeof options === 'function' ? { onSuccess: options } : options || {};
        const clientId = opts.clientId || (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_180_CLIENT_ID : undefined) || '';
        if (!clientId) {
          throw new Error('[180 Identity] Missing required parameter: clientId (or NEXT_PUBLIC_180_CLIENT_ID environment variable)');
        }
        const res = await OneEightyIdentity.openAuth({
          clientId,
          ...opts,
        });

        if (res && res.token) {
          setIsOpeningIdentity(false);
          setIsProcessing(true);
        } else {
          setIsOpeningIdentity(false);
          setIsProcessing(false);
        }
        return res;
      } catch (err: any) {
        setIsOpeningIdentity(false);
        setIsProcessing(false);
        return null;
      }
    },
    []
  );

  return {
    launch180Identity,
    isOpeningIdentity,
    isProcessing,
    setIsProcessing,
    isLoading: isOpeningIdentity || isProcessing,
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
      } catch (err: any) {
        return null;
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
  /** Visual theme for the button.
   *  - `'light'` — White background, subtle border (default for light pages)
   *  - `'dark'` — Dark zinc background, subtle border
   *  - `'obsidian'` — Deep black background with gradient accent border
   *  - `'gradient'` — Full gradient wrapper (marketing / hero sections)
   */
  theme?: 'obsidian' | 'dark' | 'light' | 'gradient';
  /** Primary CTA label */
  text?: string;
  /** Secondary description line beneath the CTA */
  subtitle?: string;
  /** Label while popup is active */
  loadingText?: string;
  /** Label after popup closes while parent authenticates/redirects */
  processingText?: string;
  /** Additional Tailwind classes on the outer wrapper */
  className?: string;
  onSuccess?: (res: AuthResponse) => void | Promise<void>;
  onError?: (err: Error) => void;
  onCancel?: () => void;
  disabled?: boolean;
  /** UX mode to open auth: 'popup' | 'bottom_sheet' | 'fullscreen' | 'redirect' | 'auto' */
  uxMode?: AuthUxMode;
  /** Manually control the processing / logging-in state */
  isProcessing?: boolean;
}

/* ── Inline SVG Icons (zero external deps) ────────────────────────────────── */

const ChevronRightIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const LoadingSpinner = ({ className = '' }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

/* ── Shimmer & Border Flow CSS (injected once) ────────────────────────────── */

const SHIMMER_STYLE_ID = '__180_identity_shimmer__';

const injectShimmerCSS = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById(SHIMMER_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = SHIMMER_STYLE_ID;
  style.textContent = `
    @keyframes identity-border-flow {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes identity-shimmer {
      0% { transform: translateX(-150%) skewX(-15deg); }
      100% { transform: translateX(250%) skewX(-15deg); }
    }
    @keyframes identity-pulse-glow {
      0%, 100% { box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.25), 0 4px 14px -1px rgba(37, 99, 235, 0.25); }
      50% { box-shadow: 0 0 0 4.5px rgba(37, 99, 235, 0.45), 0 6px 22px 0px rgba(37, 99, 235, 0.35); }
    }
    .identity-btn-shimmer::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(37,99,235,0.04) 25%,
        rgba(59,130,246,0.12) 50%,
        rgba(37,99,235,0.04) 75%,
        transparent 100%
      );
      animation: identity-shimmer 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
      pointer-events: none;
      border-radius: inherit;
    }
    .identity-processing-active {
      animation: identity-border-flow 2s ease infinite, identity-pulse-glow 2s ease-in-out infinite !important;
    }
  `;
  document.head.appendChild(style);
};

if (typeof window !== 'undefined') {
  injectShimmerCSS();
}

export const OneEightyIdentityButton: React.FC<OneEightyIdentityButtonProps> = ({
  clientId = (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_180_CLIENT_ID : undefined) || '',
  redirectUri,
  scope,
  state,
  theme = 'obsidian',
  text = 'Continue with 180 Profile',
  subtitle = 'Sovereign Auth · WhatsApp OTP · SSO',
  loadingText = 'Opening 180 Profile…',
  processingText = 'Logging into 180 Workspace…',
  className = '',
  onSuccess,
  onError,
  onCancel,
  disabled = false,
  uxMode,
  isProcessing: controlledProcessing,
}) => {
  const [internalProcessing, setInternalProcessing] = useState(false);
  const { launch180Identity, isOpeningIdentity, isProcessing: hookProcessing, setIsProcessing } = use180Identity();

  const isProcessing = controlledProcessing !== undefined ? controlledProcessing : (internalProcessing || hookProcessing);
  const isBusy = isOpeningIdentity || isProcessing;

  const handleClick = async () => {
    if (isBusy) return;
    try {
      await launch180Identity({
        clientId,
        redirectUri,
        scope,
        state,
        uxMode,
        onSuccess: async (res) => {
          setInternalProcessing(true);
          setIsProcessing(true);
          try {
            if (onSuccess) {
              await onSuccess(res);
            }
          } catch (e: any) {
            setInternalProcessing(false);
            setIsProcessing(false);
            onError?.(e);
          }
        },
        onError: (err) => {
          setInternalProcessing(false);
          setIsProcessing(false);
          onError?.(err);
        },
        onCancel: () => {
          setInternalProcessing(false);
          setIsProcessing(false);
          onCancel?.();
        },
      });
    } catch (err: any) {
      setInternalProcessing(false);
      setIsProcessing(false);
      onError?.(err);
    }
  };

  React.useEffect(() => {
    injectShimmerCSS();
  }, []);

  return (
    <button
      type="button"
      disabled={disabled || isBusy}
      onClick={handleClick}
      className={`
        identity-btn-shimmer
        w-full group relative
        flex items-center gap-3
        min-h-[44px]
        px-3.5 py-1.5
        rounded-2xl
        shadow-sm hover:shadow-md hover:shadow-blue-500/20
        transition-all duration-200 ease-out
        hover:scale-[1.006] active:scale-[0.99]
        disabled:opacity-90 disabled:cursor-wait
        cursor-pointer select-none overflow-hidden
        ${isBusy ? 'identity-processing-active' : ''}
        ${className}
      `}
      style={{
        border: '1.5px solid transparent',
        background: 'linear-gradient(#ffffff, #ffffff) padding-box, linear-gradient(135deg, #2563eb, #4f46e5, #3b82f6, #1d4ed8) border-box',
        backgroundSize: '100% 100%, 250% 250%',
        animation: isBusy ? undefined : 'identity-border-flow 4s ease infinite',
        boxShadow: isBusy
          ? '0 0 0 2px rgba(37, 99, 235, 0.25), 0 4px 14px -1px rgba(37, 99, 235, 0.25)'
          : '0 2px 8px -1px rgba(37, 99, 235, 0.15), 0 1px 3px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* ── Black Capricorn Logo Mark ─────────────────────────────── */}
      <div className={`
        relative shrink-0 w-7 h-7 rounded-lg
        border transition-all duration-200
        flex items-center justify-center
        ${isBusy 
          ? 'bg-blue-50/80 border-blue-200 shadow-sm shadow-blue-500/10' 
          : 'bg-slate-50 border-slate-200/70 group-hover:scale-105'
        }
      `}>
        <img
          src="/black icon.svg"
          alt="180 Profile"
          className="w-4 h-4 object-contain"
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            if (!target.src.includes('black-icon')) {
              target.src = '/black-icon.svg';
            }
          }}
        />
        {/* Live Status Dot */}
        {!isBusy && (
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-70" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 border border-white" />
          </span>
        )}
      </div>

      {/* ── Text Content ────────────────────────────────────────────── */}
      <div className="flex-1 text-left min-w-0">
        <div className="text-[13px] font-bold leading-tight tracking-[-0.01em] text-gray-900 flex items-center gap-1.5">
          {isProcessing ? (
            <span className="text-blue-900">{processingText}</span>
          ) : isOpeningIdentity ? (
            <span className="text-blue-900">{loadingText}</span>
          ) : (
            text
          )}
        </div>
        <div className="text-[10px] font-medium mt-0.5 leading-tight text-gray-500">
          {isProcessing ? 'Verifying sovereign session & redirecting…' : isOpeningIdentity ? 'Authenticate in the popup window' : subtitle}
        </div>
      </div>

      {/* ── Arrow / Single Loading Spinner ───────────────────────────── */}
      <div className={`
        shrink-0 w-5 h-5 rounded-full
        flex items-center justify-center
        transition-colors duration-200
        ${isBusy ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'}
      `}>
        {isBusy ? (
          <LoadingSpinner className="w-3.5 h-3.5 text-blue-600" />
        ) : (
          <ChevronRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
        )}
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

// ============================================================================
// 8. Server-Side OIDC & Token Verification (JwksVerifier, TokenExchange, PKCE)
// ============================================================================

export * from './jwks-verifier';
export * from './token-exchange';
export * from './userinfo-client';
export * from './pkce';

export default OneEightyIdentity;

