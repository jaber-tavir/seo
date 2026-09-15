import * as http from "node:http";
import * as https from "node:https";
import { gunzipSync, inflateRawSync, inflateSync } from "node:zlib";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import { SsrfBlockedError, validateTargetUrl, type ValidatedUrl } from "./ssrf";

export interface CrawlFetchResult {
  status: number;
  headers: Record<string, string>;
  body: string;
  finalUrl: string;
  durationMs: number;
  redirectCount: number;
  truncated: boolean;
  remoteIp: string;
}

export interface CrawlFetchOptions {
  timeoutMs?: number;
  maxBodyBytes?: number;
  maxRedirects?: number;
  headers?: Record<string, string>;
}

const DEFAULT_MAX_REDIRECTS = 5;

function getDefaults(): Required<CrawlFetchOptions> {
  return {
    timeoutMs: env.CRAWLER_TIMEOUT_MS,
    maxBodyBytes: env.CRAWLER_MAX_BODY_BYTES,
    maxRedirects: DEFAULT_MAX_REDIRECTS,
    headers: {},
  };
}

function parseHeaders(raw: http.IncomingMessage): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw.headers)) {
    if (typeof value === "string") out[key.toLowerCase()] = value;
  }
  return out;
}

function stripEncoding(body: Buffer, encoding: string | undefined): Buffer {
  if (!encoding) return body;
  const enc = encoding.toLowerCase();
  try {
    if (enc.includes("gzip")) return gunzipSync(body);
    if (enc.includes("deflate")) {
      try {
        return inflateSync(body);
      } catch {
        return inflateRawSync(body);
      }
    }
  } catch (err) {
    logger.warn("crawler_decode_failed", { encoding: enc, error: err instanceof Error ? err.message : String(err) });
  }
  return body;
}

interface HopResult {
  response: http.IncomingMessage;
  body: Buffer;
  truncated: boolean;
  durationMs: number;
}

async function singleHop(target: ValidatedUrl, options: Required<CrawlFetchOptions>, deadlineMs: number): Promise<HopResult> {
  const started = Date.now();
  const remaining = Math.max(1, deadlineMs - Date.now());
  const urlHost = target.isIpv6 ? `[${target.ip}]` : target.ip;

  const requestOptions: https.RequestOptions = {
    host: urlHost,
    port: target.port,
    path: target.path,
    method: "GET",
    headers: {
      Host: target.hostname,
      "User-Agent": env.CRAWLER_USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.8",
      "Accept-Encoding": "gzip, deflate",
      Connection: "close",
      "Cache-Control": "no-cache",
      ...options.headers,
    },
    servername: target.servername,
  };

  const requester = target.protocol === "https" ? https : http;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => settleError(new Error("crawler_timeout")), remaining);
    let settled = false;

    const settle = (result: HopResult) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const settleError = (err: Error) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      reject(err);
    };

    const req = requester.request(requestOptions, (res: http.IncomingMessage) => {
      const sink: Buffer[] = [];
      let received = 0;
      let wasTruncated = false;
      const declared = Number(res.headers["content-length"] ?? 0);
      if (declared > options.maxBodyBytes) wasTruncated = true;

      res.on("data", (chunk: Buffer) => {
        received += chunk.length;
        if (received <= options.maxBodyBytes) {
          sink.push(chunk);
        } else {
          wasTruncated = true;
          try {
            res.destroy();
          } catch {
            req.destroy();
          }
        }
      });
      res.on("end", () => settle({ response: res, body: Buffer.concat(sink), truncated: wasTruncated, durationMs: Date.now() - started }));
      res.on("error", settleError);
    });

    req.on("error", settleError);
    req.setTimeout(remaining + 1000, () => settleError(new Error("crawler_timeout")));
    req.end();
  });
}


export async function safeFetch(url: string, options?: CrawlFetchOptions): Promise<CrawlFetchResult> {
  const defaults = getDefaults();
  const opts: Required<CrawlFetchOptions> = {
    timeoutMs: options?.timeoutMs ?? defaults.timeoutMs,
    maxBodyBytes: options?.maxBodyBytes ?? defaults.maxBodyBytes,
    maxRedirects: options?.maxRedirects ?? defaults.maxRedirects,
    headers: { ...defaults.headers, ...(options?.headers ?? {}) },
  };
  const deadlineMs = Date.now() + opts.timeoutMs;

  let current = await validateTargetUrl(url);
  let redirectCount = 0;
  let last: HopResult | null = null;
  let finalUrl = url;
  let totalDuration = 0;
  let truncated = false;

  for (;;) {
    const hop = await singleHop(current, opts, deadlineMs);
    last = hop;
    totalDuration += hop.durationMs;
    truncated = truncated || hop.truncated;
    finalUrl = current.raw;

    const status = hop.response.statusCode ?? 0;
    const headers = parseHeaders(hop.response);
    const location = headers["location"];
    const isRedirect = status >= 300 && status < 400;

    if (isRedirect && location) {
      if (redirectCount >= opts.maxRedirects) {
        throw new SsrfBlockedError("Too many redirects");
      }
      redirectCount += 1;
      let nextUrl: URL;
      try {
        nextUrl = new URL(location, current.raw);
      } catch {
        throw new SsrfBlockedError("Invalid redirect target");
      }
      current = await validateTargetUrl(nextUrl.toString());
      continue;
    }

    break;
  }

  const finalHeaders = last ? parseHeaders(last.response) : {};
  const decoded = stripEncoding(last!.body, finalHeaders["content-encoding"]);
  if (decoded.length > opts.maxBodyBytes) truncated = true;

  return {
    status: last!.response.statusCode ?? 0,
    headers: finalHeaders,
    body: decoded.toString("utf8", 0, Math.min(decoded.length, opts.maxBodyBytes)),
    finalUrl,
    durationMs: totalDuration,
    redirectCount,
    truncated,
    remoteIp: current.ip,
  };
}
