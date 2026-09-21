/**
 * Tiny decoupling layer: the HTTP client (lib/api.tsx) tells whoever is listening whether the API just answered or
 * failed to answer. The sync engine registers itself as the listener. Keeping this separate avoids api.tsx
 * importing the engine (which itself imports api.tsx).
 */

type Handler = (reachable: boolean) => void;
let handler: Handler | null = null;

export function registerReachabilityHandler(h: Handler): void {
  handler = h;
}

export function reportReachable(reachable: boolean): void {
  handler?.(reachable);
}
