const SAFE_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Returns the URL only if it uses http(s); otherwise undefined.
 * Card data comes from the cloud and must never yield a `javascript:` (XSS) link.
 */
export function safeHref(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url.trim());
    return SAFE_PROTOCOLS.has(parsed.protocol) ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}
