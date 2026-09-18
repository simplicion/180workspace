/**
 * Reads LiveKit credentials strictly from the environment — never falls back to a
 * hardcoded key/secret. Throws immediately if either is missing so a misconfigured
 * deployment fails loudly instead of silently signing tokens with a guessable secret.
 */
export function getLiveKitCredentials(): { apiKey: string; apiSecret: string; url: string } {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error(
      "LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set in the environment — no hardcoded fallback is used."
    );
  }
  const url = process.env.LIVEKIT_URL || process.env.LIVEKIT_HOST || "https://livekit.180workspace.com";
  return { apiKey, apiSecret, url };
}
