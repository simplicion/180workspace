'use strict';

import crypto from 'crypto';

export interface PkcePair {
  verifier: string;
  challenge: string;
  method: 'S256';
}

/**
 * Generates an RFC 7636 compliant PKCE code verifier and code challenge pair
 */
export function generatePkcePair(length: number = 64): PkcePair {
  const byteLength = Math.max(32, Math.min(96, Math.floor(length * 0.75)));
  const verifier = crypto
    .randomBytes(byteLength)
    .toString('base64url')
    .slice(0, length);

  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');

  return {
    verifier,
    challenge,
    method: 'S256',
  };
}
