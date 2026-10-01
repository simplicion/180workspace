/**
 * Ensures a URL starts with http:// or https:// so it is treated
 * as an absolute external link by the browser instead of a relative path.
 */
export function ensureExternalUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
