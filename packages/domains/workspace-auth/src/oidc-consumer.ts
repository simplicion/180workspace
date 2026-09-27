'use strict';

import {
    JwksVerifier,
    TokenExchangeClient,
    UserInfoClient,
    VerifiedTokenResult,
    OneEightyUserProfile,
} from '@workspace/identity-client';

export interface WorkspaceAuthConfig {
    identityServerUrl: string;
    clientId: string;
    clientSecret?: string;
    redirectUri: string;
    jwksUrl?: string;
}

export class OidcConsumer {
    private config: WorkspaceAuthConfig;
    private verifier: JwksVerifier;

    constructor(config: WorkspaceAuthConfig) {
        this.config = config;
        const jwks = config.jwksUrl || `${config.identityServerUrl}/certs/jwks.json`;
        this.verifier = new JwksVerifier(jwks);
    }

    /**
     * Set verifier public keys manually (for local testing/offline)
     */
    setJwks(jwks: any): void {
        this.verifier.setKeys(jwks);
    }

    /**
     * Exchange authorization code received from 180 Identity
     */
    async handleCallback(code: string, codeVerifier?: string) {
        const tokenEndpoint = `${this.config.identityServerUrl}/oauth/token`;
        const tokenRes = await TokenExchangeClient.exchangeCode({
            tokenEndpoint,
            clientId: this.config.clientId,
            clientSecret: this.config.clientSecret,
            code,
            redirectUri: this.config.redirectUri,
            codeVerifier,
        });

        let verifiedClaims: any = null;
        if (tokenRes.id_token) {
            const verification: VerifiedTokenResult = await this.verifier.verifyToken(
                tokenRes.id_token,
                this.config.clientId
            );
            if (!verification.valid) {
                throw new Error(`ID token verification failed: ${verification.error}`);
            }
            verifiedClaims = verification.payload;
        }

        // Fetch User Info
        const userInfoEndpoint = `${this.config.identityServerUrl}/oauth/userinfo`;
        const profile: OneEightyUserProfile = await UserInfoClient.fetchProfile(
            userInfoEndpoint,
            tokenRes.access_token
        );

        return {
            tokens: tokenRes,
            claims: verifiedClaims,
            profile,
        };
    }

    /**
     * Cryptographically verify an ID token or access token directly
     */
    async verifyToken(token: string) {
        return await this.verifier.verifyToken(token, this.config.clientId);
    }
}
