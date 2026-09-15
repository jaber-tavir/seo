import type { BacklinkListResult, BacklinkProvider, BacklinkSummary, ProviderBacklink } from "./types";

/**
 * MockBacklinkProvider - ONLY for UI development and tests.
 * Returns deterministic, clearly-marked demo rows (no fabricated authority scores).
 * The production system switches to DataForSEO via the same interface.
 */
export class MockBacklinkProvider implements BacklinkProvider {
  readonly name = "mock";

  private rows(domain: string): ProviderBacklink[] {
    const clean = domain.toLowerCase().replace(/^www\./, "");
    const sources: Array<{ host: string; path: string; anchor: string | null; link_type: "dofollow" | "nofollow"; is_new: boolean; is_lost: boolean }> = [
      { host: "example-blog.com", path: "/resources", anchor: "helpful guide", link_type: "dofollow", is_new: true, is_lost: false },
      { host: "news.example.org", path: "/roundup", anchor: clean, link_type: "dofollow", is_new: false, is_lost: false },
      { host: "forum.example.net", path: "/thread/123", anchor: "this tool", link_type: "nofollow", is_new: false, is_lost: false },
      { host: "old-directory.example.com", path: "/listings", anchor: "visit site", link_type: "dofollow", is_new: false, is_lost: true },
    ];
    const now = new Date();
    return sources.map((s, i) => ({
      source_url: `https://${s.host}${s.path}`,
      target_url: `https://${clean}/`,
      anchor_text: s.anchor,
      domain: s.host,
      domain_authority: null,
      link_type: s.link_type,
      is_new: s.is_new,
      is_lost: s.is_lost,
      first_seen: new Date(now.getTime() - (30 - i * 5) * 24 * 60 * 60 * 1000),
      last_seen: s.is_lost ? new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) : now,
    }));
  }

  async getBacklinks(
    domain: string,
    options?: { limit?: number; offset?: number; status?: "all" | "new" | "lost"; linkType?: "all" | "dofollow" | "nofollow" }
  ): Promise<BacklinkListResult> {
    let rows = this.rows(domain);
    const status = options?.status ?? "all";
    if (status === "new") rows = rows.filter((r) => r.is_new && !r.is_lost);
    if (status === "lost") rows = rows.filter((r) => r.is_lost);
    if (status === "all") rows = rows.filter((r) => !r.is_lost);
    const linkType = options?.linkType ?? "all";
    if (linkType !== "all") rows = rows.filter((r) => r.link_type === linkType);
    const offset = Math.max(options?.offset ?? 0, 0);
    const limit = Math.min(Math.max(options?.limit ?? 20, 1), 100);
    return { backlinks: rows.slice(offset, offset + limit), total: rows.length, is_demo: true };
  }

  async getSummary(domain: string): Promise<BacklinkSummary> {
    const rows = this.rows(domain);
    const active = rows.filter((r) => !r.is_lost);
    return {
      total: active.length,
      referring_domains: new Set(active.map((r) => r.domain)).size,
      dofollow: active.filter((r) => r.link_type === "dofollow").length,
      nofollow: active.filter((r) => r.link_type === "nofollow").length,
      is_demo: true,
    };
  }
}

