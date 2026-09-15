/**
 * KeywordProvider interface (Phase 4 implements real providers).
 *
 * RULE: the UI and services never call external SEO APIs directly - they go
 * through this interface. Swap providers without touching application code.
 *
 * REAL METRICS RULE: providers must return real data from their source.
 * Mock providers live in /providers/mock and are ONLY for UI development.
 */

export interface KeywordData {
  keyword: string;
  /** Real values from the provider, or null when unavailable - never fabricated */
  search_volume: number | null;
  difficulty: number | null;
  cpc: number | null;
  competition: "low" | "medium" | "high" | null;
  intent: "informational" | "commercial" | "transactional" | "navigational" | null;
  country: string;
  language: string;
  trend?: Array<{ month: string; volume: number }>;
  serp_features?: string[];
}

export interface RelatedKeyword extends KeywordData {
  relevance?: number;
}

export interface KeywordSuggestion {
  keyword: string;
  search_volume: number | null;
}

export interface CompetitorKeyword extends KeywordData {
  /** Position of this domain for the keyword (null = unknown / not provided) */
  position?: number | null;
  /** URL of the ranking page on the competitor domain (when known) */
  url?: string | null;
}

export interface CompetitorKeywordsResult {
  domain: string;
  keywords: CompetitorKeyword[];
  total: number;
}

export interface KeywordProvider {
  readonly name: string;

  /** Metrics for a single keyword */
  getKeywordData(keyword: string, options?: { country?: string; language?: string }): Promise<KeywordData>;

  /** Related keywords (semantically similar) */
  getRelatedKeywords(keyword: string, options?: { country?: string; language?: string; limit?: number }): Promise<RelatedKeyword[]>;

  /** Suggestions (contains / long-tail style) */
  getKeywordSuggestions(keyword: string, options?: { country?: string; language?: string; limit?: number }): Promise<KeywordSuggestion[]>;

  /**
   * Organic keywords a DOMAIN ranks for.
   * Optional: providers that cannot answer domain-level queries leave it undefined
   * and callers fall back to deterministic derivation (never fabricated metrics).
   */
  getDomainKeywords?(domain: string, options?: { country?: string; language?: string; limit?: number }): Promise<CompetitorKeywordsResult>;
}

export type { KeywordData as KeywordDataResult };
