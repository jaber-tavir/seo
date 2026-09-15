import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import type { BacklinkListResult, BacklinkProvider, BacklinkSummary, ProviderBacklink } from "./types";
import type { LinkType } from "@/constants";

/**
 * DataForSEO backlink provider.
 * - POST /v3/backlinks/backlinks/live -> paginated live backlinks
 * - POST /v3/backlinks/summary/live   -> aggregate counts
 * Domain authority is NOT fabricated: DataForSEO exposes rank positions,
 * not DA scores, so domain_authority stays null.
 */

interface DFSItem {
  url_from?: string;
  url_to?: string;
  domain_from?: string;
  anchor?: string | null;
  dofollow?: boolean;
  attributes?: string[] | null;
  is_new?: boolean;
  is_lost?: boolean;
  first_seen?: string | null;
  last_seen?: string | null;
}

interface BacklinksLiveResponse {
  tasks?: Array<{
    status_code?: number;
    status_message?: string;
    result?: Array<{ items?: DFSItem[]; total_count?: number }>;
  }>;
}

interface SummaryLiveResponse {
  tasks?: Array<{
    status_code?: number;
    status_message?: string;
    result?: Array<{ backlinks?: number; referring_domains?: number; referring_main_domains?: number }>;
  }>;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d;
}

function mapLinkType(item: DFSItem): LinkType {
  const attrs = (item.attributes ?? []).map((a) => a.toLowerCase());
  if (attrs.includes("sponsored")) return "sponsored";
  if (attrs.includes("ugc")) return "ugc";
  return item.dofollow === false ? "nofollow" : "dofollow";
}

function mapItem(item: DFSItem): ProviderBacklink | null {
  if (!item.url_from || !item.url_to) return null;
  let domain = "";
  try {
    domain = new URL(item.url_from).hostname.toLowerCase();
  } catch {
    domain = (item.domain_from ?? "").toLowerCase();
  }
  return {
    source_url: item.url_from,
    target_url: item.url_to,
    anchor_text: item.anchor ?? null,
    domain,
    domain_authority: null,
    link_type: mapLinkType(item),
    is_new: item.is_new === true,
    is_lost: item.is_lost === true,
    first_seen: parseDate(item.first_seen),
    last_seen: parseDate(item.last_seen),
  };
}

export function isBacklinkDataForSEOConfigured(): boolean {
  return Boolean(env.DATAFORSEO_LOGIN && env.DATAFORSEO_PASSWORD);
}

async function backlinksPost<T>(path: string, payload: unknown[]): Promise<T> {
  const login = env.DATAFORSEO_LOGIN;
  const password = env.DATAFORSEO_PASSWORD;
  if (!login || !password) throw new Error("DataForSEO credentials are not configured");
  const auth = Buffer.from(`${login}:${password}`).toString("base64");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(`https://api.dataforseo.com${path}`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`DataForSEO request failed (HTTP ${res.status})`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export class DataForSEOBacklinkProvider implements BacklinkProvider {
  readonly name = "dataforseo";

  async getBacklinks(
    domain: string,
    options?: { limit?: number; offset?: number; status?: "all" | "new" | "lost"; linkType?: "all" | "dofollow" | "nofollow" }
  ): Promise<BacklinkListResult> {
    const limit = Math.min(Math.max(options?.limit ?? 50, 1), 1000);
    const offset = Math.max(options?.offset ?? 0, 0);
    const filters: string[][] = [];
    if (options?.linkType === "dofollow") filters.push(["dofollow", "=", "true"]);
    if (options?.linkType === "nofollow") filters.push(["dofollow", "=", "false"]);
    const status = options?.status ?? "all";
    const data = await backlinksPost<BacklinksLiveResponse>("/v3/backlinks/backlinks/live", [
      {
        target: domain,
        limit,
        offset,
        backlinks_status_type: status === "new" ? "new" : status === "lost" ? "lost" : "live",
        backlinks_filters: filters.length > 0 ? filters : undefined,
        include_subdomains: true,
      },
    ]);
    const task = data.tasks?.[0];
    if (task && task.status_code && task.status_code !== 20000) {
      logger.warn("dataforseo_backlinks_error", { status: task.status_code, message: task.status_message });
      throw new Error(`DataForSEO error: ${task.status_message ?? task.status_code}`);
    }
    const result = task?.result?.[0];
    const items = (result?.items ?? []).map(mapItem).filter((i): i is ProviderBacklink => i !== null);
    return { backlinks: items, total: result?.total_count ?? items.length, is_demo: false };
  }

  async getSummary(domain: string): Promise<BacklinkSummary> {
    const data = await backlinksPost<SummaryLiveResponse>("/v3/backlinks/summary/live", [
      { target: domain, include_subdomains: true, backlinks_status_type: "live" },
    ]);
    const task = data.tasks?.[0];
    if (task && task.status_code && task.status_code !== 20000) {
      logger.warn("dataforseo_backlinks_summary_error", { status: task.status_code, message: task.status_message });
      throw new Error(`DataForSEO error: ${task.status_message ?? task.status_code}`);
    }
    const row = task?.result?.[0];
    const [doRes, noRes] = await Promise.all([
      this.getBacklinks(domain, { limit: 1, linkType: "dofollow" }).catch(() => ({ total: 0 })),
      this.getBacklinks(domain, { limit: 1, linkType: "nofollow" }).catch(() => ({ total: 0 })),
    ]);
    return {
      total: row?.backlinks ?? 0,
      referring_domains: row?.referring_domains ?? row?.referring_main_domains ?? 0,
      dofollow: (doRes as { total: number }).total,
      nofollow: (noRes as { total: number }).total,
      is_demo: false,
    };
  }
}

