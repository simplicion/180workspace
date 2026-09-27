export interface OpenPopupOptions {
  clientId: string;
  authServerUrl?: string;
  redirectUri?: string;
  scope?: string;
  state?: string;
  responseType?: 'code' | 'token';
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
  onSuccess?: (response: AuthResponse) => void;
  onError?: (error: Error) => void;
}

export interface AuthResponse {
  code: string;
  state: string;
  id_token?: string | null;
}

export interface RenderButtonOptions extends OpenPopupOptions {
  theme?: 'dark' | 'light';
  text?: string;
  uxMode?: 'popup' | 'redirect';
}

const DEFAULT_AUTH_SERVER = typeof window !== 'undefined' && window.location.hostname.endsWith('180workspace.com')
  ? 'https://auth.180workspace.com'
  : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

export const OneEightyIdentity = {
  version: '1.0.0',

  /**
   * Opens 180 Identity Dynamic Auth in centered modal popup
   */
  openPopup(options: OpenPopupOptions): Promise<AuthResponse> {
    const { clientId } = options;
    if (!clientId) {
      throw new Error('[180 Identity] Missing required option: clientId');
    }

    const authServer = options.authServerUrl || DEFAULT_AUTH_SERVER;
    const redirectUri = options.redirectUri || (typeof window !== 'undefined' ? window.location.origin + '/oauth/callback' : '');
    const scope = options.scope || 'openid identity:read';
    const state = options.state || Math.random().toString(36).substring(2, 15);
    const responseType = options.responseType || 'code';

    const query = [
      `client_id=${encodeURIComponent(clientId)}`,
      `redirect_uri=${encodeURIComponent(redirectUri)}`,
      `scope=${encodeURIComponent(scope)}`,
      `state=${encodeURIComponent(state)}`,
      `response_type=${encodeURIComponent(responseType)}`,
      'ux_mode=popup'
    ];

    if (options.codeChallenge) {
      query.push(`code_challenge=${encodeURIComponent(options.codeChallenge)}`);
      query.push(`code_challenge_method=${encodeURIComponent(options.codeChallengeMethod || 'S256')}`);
    }

    const url = `${authServer}/oauth/authorize?${query.join('&')}`;
    const width = 450;
    const height = 680;
    const left = typeof window !== 'undefined' ? (window.screen.width - width) / 2 : 0;
    const top = typeof window !== 'undefined' ? (window.screen.height - height) / 2 : 0;

    const popup = typeof window !== 'undefined'
      ? window.open(
          url,
          '180_identity_auth',
          `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=no,toolbar=no,resizable=yes`
        )
      : null;

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      const err = new Error('Popup blocked by browser. Please allow popups for 180 Identity.');
      options.onError?.(err);
      return Promise.reject(err);
    }

    return new Promise((resolve, reject) => {
      let isResolved = false;

      const messageListener = (event: MessageEvent) => {
        if (!event.data || event.data.type !== '180_IDENTITY_SUCCESS') {
          return;
        }

        isResolved = true;
        window.removeEventListener('message', messageListener);
        clearInterval(pollTimer);

        const result: AuthResponse = {
          code: event.data.code,
          state: event.data.state,
          id_token: event.data.id_token || null
        };

        options.onSuccess?.(result);
        resolve(result);
      };

      window.addEventListener('message', messageListener);

      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          window.removeEventListener('message', messageListener);
          if (!isResolved) {
            const err = new Error('Authentication cancelled by user');
            options.onError?.(err);
            reject(err);
          }
        }
      }, 500);
    });
  },

  /**
   * Renders branded button inside container
   */
  renderButton(target: HTMLElement | string, options: RenderButtonOptions): void {
    const element = typeof target === 'string' ? document.getElementById(target) : target;
    if (!element) {
      throw new Error('[180 Identity] Target element not found');
    }

    const text = options.text || 'Get started with 180 Identity';
    const isDark = (options.theme || 'dark') === 'dark';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'one-eighty-identity-button';

    const bg = isDark ? '#0f172a' : '#ffffff';
    const textCol = isDark ? '#f8fafc' : '#0f172a';
    const borderCol = isDark ? 'rgba(99, 102, 241, 0.4)' : '#e2e8f0';

    btn.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: ${bg};
      color: ${textCol};
      border: 1px solid ${borderCol};
      border-radius: 12px;
      padding: 10px 18px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: all 0.2s ease;
      outline: none;
    `;

    const icon = document.createElement('span');
    icon.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 6px;
      background: linear-gradient(135deg, #6366f1, #a855f7);
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
      btn.style.borderColor = '#818cf8';
      btn.style.boxShadow = '0 0 16px rgba(99, 102, 241, 0.35)';
    };

    btn.onmouseleave = () => {
      btn.style.borderColor = borderCol;
      btn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    };

    btn.onclick = () => {
      if (options.uxMode === 'redirect') {
        const authServer = options.authServerUrl || DEFAULT_AUTH_SERVER;
        const redirectUri = options.redirectUri || window.location.origin + '/oauth/callback';
        const scope = options.scope || 'openid identity:read';
        const state = options.state || Math.random().toString(36).substring(2, 15);
        window.location.href = `${authServer}/oauth/authorize?client_id=${encodeURIComponent(options.clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}&response_type=code&ux_mode=redirect`;
      } else {
        OneEightyIdentity.openPopup(options);
      }
    };

    element.innerHTML = '';
    element.appendChild(btn);
  }
};

export default OneEightyIdentity;
