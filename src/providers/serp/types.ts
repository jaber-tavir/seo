/**
 * RankProvider interface — how rank positions are measured.
 *
 * RULE: the UI and services never call external SERP APIs directly — they go
 * through this interface. Swap providers without touching application code.
 */

export type RankSearchEngine = "google" | "bing" | "yahoo";
export type RankDevice = "desktop" | "mobile" | "tablet";

export interface RankCheckOptions {
  country?: string;
  city?: string;
  language?: string;
  searchEngine?: RankSearchEngine;
  device?: RankDevice;
}

export interface RankCheckResult {
  /** 1-based position, or null when not found in the fetched results */
  position: number | null;
  rankingUrl: string | null;
  totalResults: number | null;
  checkedAt: Date;
}

export interface RankProvider {
  readonly name: string;

  /** Measure the organic position of `domain` for `keyword` */
  checkPosition(domain: string, keyword: string, options?: RankCheckOptions): Promise<RankCheckResult>;
}
