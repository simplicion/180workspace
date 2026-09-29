'use strict';

export interface TokenExchangeParams {
  tokenEndpoint: string;
  clientId: string;
  clientSecret?: string;
  code: string;
  redirectUri: string;
  codeVerifier?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

export class TokenExchangeClient {
  /**
   * Exchange authorization code for tokens (supports PKCE and Confidential Secret)
   */
  static async exchangeCode(params: TokenExchangeParams): Promise<TokenResponse> {
    const body: Record<string, string> = {
      grant_type: 'authorization_code',
      client_id: params.clientId,
      code: params.code,
      redirect_uri: params.redirectUri,
    };

    if (params.clientSecret) {
      body.client_secret = params.clientSecret;
    }

    if (params.codeVerifier) {
      body.code_verifier = params.codeVerifier;
    }

    const res = await fetch(params.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data: TokenResponse = await res.json();
    if (!res.ok) {
      throw new Error(data.error_description || data.error || `Token exchange failed with status ${res.status}`);
    }

    return data;
  }
}
