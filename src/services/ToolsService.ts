import * as http from "node:http";
import * as https from "node:https";
import * as cheerio from "cheerio";
import { safeFetch } from "@/services/crawler/http-client";
import { SsrfBlockedError, validateTargetUrl, type ValidatedUrl } from "@/services/crawler/ssrf";
import { logger } from "@/lib/logger";
import type { BrokenLinksInput, RedirectCheckInput } from "@/validators/tools";

/** Server-side SEO tools: redirect tracing + broken link verification.
 *  All outbound requests go through the SSRF-safe crawler fetch layer. */

export interface RedirectHop {
  url: string;
  status: number;
  location: string | null;
  durationMs: number;
}

export interface RedirectTraceResult {
  hops: RedirectHop[];
  finalUrl: string;
  totalHops: number;
  loopDetected: boolean;
  chainTooLong: boolean;
  error: string | null;
}

const MAX_HOPS = 10;
const HOP_TIMEOUT_MS = 10_000;

/** Single SSRF-validated HTTP request that does NOT follow redirects. */
async function fetchOnce(url: string): Promise<{ status: number; location: string | null; durationMs: number }> {
  const startedAt = Date.now();
  // SSRF rules re-validated per hop (DNS is re-resolved on every call)
  const target: ValidatedUrl = await validateTargetUrl(url);

  const result = await new Promise<{ status: number; location: string | null }>((resolve, reject) => {
    const lib = target.protocol === "https" ? https : http;
    const urlHost = target.isIpv6 ? `[${target.ip}]` : target.ip;
    const req = lib.request(
      {
        host: urlHost,
        port: target.port,
        path: target.path,
        method: "GET",
        headers: {
          Host: target.hostname,
          "User-Agent": "SEOSuite-Tools/1.0",
          Accept: "*/*",
          Connection: "close",
        },
        timeout: HOP_TIMEOUT_MS,
        servername: target.servername,
        rejectUnauthorized: false,
      },
      (res: import("node:http").IncomingMessage) => {
        res.resume();
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, location: (res.headers.location as string) ?? null })
        );
        res.on("error", reject);
      }
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });

  return { ...result, durationMs: Date.now() - startedAt };
}

export async function traceRedirects(input: RedirectCheckInput): Promise<RedirectTraceResult> {
  const hops: RedirectHop[] = [];
  const visited = new Set<string>();
  let current = input.url.trim();
  let loopDetected = false;
  let error: string | null = null;

  try {
    for (let hop = 0; hop < MAX_HOPS; hop++) {
      if (visited.has(current)) {
        loopDetected = true;
        break;
      }
      visited.add(current);

      const res = await fetchOnce(current);
      const isRedirect = res.status >= 300 && res.status < 400 && res.location;
      hops.push({ url: current, status: res.status, location: res.location, durationMs: res.durationMs });

      if (!isRedirect || !res.location) break;

      current = new URL(res.location, current).toString();
    }
  } catch (err) {
    if (err instanceof SsrfBlockedError) error = err.message;
    else if (err instanceof Error && err.message === "timeout") error = "Request timed out";
    else error = err instanceof Error ? err.message : "Request failed";
  }

  if (hops.length >= MAX_HOPS) loopDetected = true;

  return {
    hops,
    finalUrl: current,
    totalHops: hops.length,
    loopDetected,
    chainTooLong: hops.length > 3,
    error,
  };
}

export type LinkStatus = "ok" | "broken" | "server_error" | "redirected" | "timeout" | "blocked" | "failed";

export interface LinkCheck {
  url: string;
  anchorText: string;
  status: LinkStatus;
  statusCode: number | null;
  detail: string;
  recommendation: string;
}

export interface BrokenLinksResult {
  sourceUrl: string;
  finalUrl: string;
  linksChecked: number;
  broken: LinkCheck[];
  okCount: number;
  totalFound: number;
  error: string | null;
}

const CHECK_TIMEOUT_MS = 8_000;
const CHECK_CONCURRENCY = 8;

function classifyStatus(statusCode: number | null, detail: string): { status: LinkStatus; recommendation: string } {
  if (statusCode === null) {
    const d = detail.toLowerCase();
    if (d.includes("timeout"))
      return { status: "timeout", recommendation: "Target server did not respond in time - retry later or link to a mirror." };
    if (d.includes("did not resolve") || d.includes("blocked"))
      return { status: "blocked", recommendation: "Target could not be resolved or is not publicly reachable - verify the domain." };
    return { status: "failed", recommendation: "Connection failed - verify the URL manually." };
  }
  if (statusCode >= 200 && statusCode < 300) return { status: "ok", recommendation: "" };
  if (statusCode < 400)
    return { status: "redirected", recommendation: "Link points through a redirect - update the link to the final destination." };
  if (statusCode === 404 || statusCode === 410)
    return { status: "broken", recommendation: "Page is gone (4xx). Update or remove the link, or add a redirect." };
  if (statusCode < 500)
    return { status: "broken", recommendation: "Client error returned. Fix the URL or access rules on the target." };
  return { status: "server_error", recommendation: "Target server error (5xx) - retry later; if persistent, find an alternative source." };
}

export async function checkBrokenLinks(input: BrokenLinksInput): Promise<BrokenLinksResult> {
  const source = input.url.trim();
  let page: Awaited<ReturnType<typeof safeFetch>>;
  try {
    page = await safeFetch(source, { timeoutMs: 15_000, maxBodyBytes: 2_000_000 });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    logger.warn("tool_broken_links_source_failed", { source, detail });
    return {
      sourceUrl: source,
      finalUrl: source,
      linksChecked: 0,
      broken: [],
      okCount: 0,
      totalFound: 0,
      error: detail,
    };
  }

  if (page.status >= 400) {
    return {
      sourceUrl: source,
      finalUrl: page.finalUrl,
      linksChecked: 0,
      broken: [],
      okCount: 0,
      totalFound: 0,
      error: `Source page returned HTTP ${page.status}`,
    };
  }

  const $ = cheerio.load(page.body);
  const seen = new Set<string>();
  const targets: { url: string; anchorText: string }[] = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    let absolute: URL;
    try {
      absolute = new URL(href, page.finalUrl);
    } catch {
      return;
    }
    if (!/^https?:$/.test(absolute.protocol)) return;
    if (!absolute.pathname && !absolute.search) return; // pure #fragment
    const key = absolute.toString();
    if (seen.has(key) || targets.length >= input.maxLinks) return;
    seen.add(key);
    targets.push({ url: key, anchorText: $(el).text().trim().slice(0, 120) });
  });

  const results: LinkCheck[] = [];
  let okCount = 0;

  const queue = [...targets];
  const workers = Array.from({ length: Math.max(1, Math.min(CHECK_CONCURRENCY, queue.length)) }, async () => {
    for (;;) {
      const item = queue.shift();
      if (!item) break;
      try {
        const res = await safeFetch(item.url, { timeoutMs: CHECK_TIMEOUT_MS, maxBodyBytes: 64 * 1024 });
        const cls = classifyStatus(res.status, "");
        if (cls.status === "ok") okCount++;
        results.push({
          url: item.url,
          anchorText: item.anchorText,
          statusCode: res.status,
          status: cls.status,
          detail: `HTTP ${res.status}`,
          recommendation: cls.recommendation,
        });
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        const cls = classifyStatus(null, detail);
        results.push({
          url: item.url,
          anchorText: item.anchorText,
          statusCode: null,
          status: cls.status,
          detail,
          recommendation: cls.recommendation,
        });
      }
    }
  });

  await Promise.all(workers);

  const severity: Record<string, number> = { broken: 0, server_error: 1, timeout: 2, blocked: 3, redirected: 4, failed: 5 };
  const broken = results
    .filter((r) => r.status !== "ok")
    .sort((a, b) => (severity[a.status] ?? 9) - (severity[b.status] ?? 9));

  logger.info("tool_broken_links_checked", { source, found: targets.length, broken: broken.length });

  return {
    sourceUrl: source,
    finalUrl: page.finalUrl,
    linksChecked: results.length,
    broken,
    okCount,
    totalFound: targets.length,
    error: null,
  };
}

export const toolsService = { traceRedirects, checkBrokenLinks };
