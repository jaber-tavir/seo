import type { LinkType } from "@/constants";

/** Single backlink row from a provider — real metrics only, nulls when unavailable. */
export interface ProviderBacklink {
  source_url: string;
  target_url: string;
  anchor_text: string | null;
  domain: string;
  domain_authority: number | null;
  link_type: LinkType;
  /** Provider flags (new/lost windows); the sync job maps these to status transitions. */
  is_new: boolean;
  is_lost: boolean;
  first_seen: Date | null;
  last_seen: Date | null;
}

export interface BacklinkSummary {
  total: number;
  referring_domains: number;
  dofollow: number;
  nofollow: number;
  is_demo: boolean;
}

export interface BacklinkListResult {
  backlinks: ProviderBacklink[];
  total: number;
  is_demo: boolean;
}

export interface BacklinkProvider {
  readonly name: string;

  /** Paginated live backlinks for a target domain. */
  getBacklinks(
    domain: string,
    options?: { limit?: number; offset?: number; status?: "all" | "new" | "lost"; linkType?: "all" | "dofollow" | "nofollow" }
  ): Promise<BacklinkListResult>;

  /** Aggregate counts (total backlinks, referring domains, do/nofollow split). */
  getSummary(domain: string): Promise<BacklinkSummary>;
}
