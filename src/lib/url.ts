/**
 * URL normalization helpers.
 *
 * NOTE: Full SSRF protection (DNS resolution, private-IP blocking, redirect
 * re-validation) is implemented in the Phase 2 crawler security module.
 * These helpers are safe for validating user-submitted website URLs at
 * project-creation time, where we only store - never fetch - the URL.
 */

export function normalizeWebsiteUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);

    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".") && url.hostname !== "localhost") return null;

    url.hash = "";
    // Strip default ports
    if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
      url.port = "";
    }
    // Normalize trailing slash on the root path
    url.pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : "/";

    return url.toString();
  } catch {
    return null;
  }
}

export function extractDomain(url: string): string | null {
  try {
    const withProtocol = /^https?:\/\//i.test(url) || url.includes("://") ? url : `https://${url}`;
    return new URL(withProtocol).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Public suffix-ish check: block obvious localhost / IP / internal hosts early */
export function isLikelyPublicDomain(domain: string): boolean {
  const d = domain.toLowerCase();
  if (d === "localhost" || d.endsWith(".localhost") || d.endsWith(".local") || d.endsWith(".internal")) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(d)) return false; // IPv4 literal
  if (d.includes(":")) return false; // IPv6 literal or invalid
  return d.includes(".");
}
