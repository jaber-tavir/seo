import type { CompetitorKeywordsResult, KeywordProvider } from "./types";

/**
 * MockKeywordProvider - ONLY for UI development and tests.
 * Returns clearly-marked demo data; the production system switches to real
 * providers (DataForSEO / Semrush / Ahrefs / SerpAPI) via the same interface.
 */
export class MockKeywordProvider implements KeywordProvider {
  readonly name = "mock";

  async getKeywordData(keyword: string, options?: { country?: string; language?: string }) {
    return {
      keyword,
      search_volume: 0, // 0 (not a random fake number) marks "no real data"
      difficulty: null,
      cpc: null,
      competition: null,
      intent: null,
      country: options?.country ?? "us",
      language: options?.language ?? "en",
      trend: [],
      serp_features: [],
    };
  }

  async getRelatedKeywords(keyword: string, options?: { limit?: number }) {
    const limit = options?.limit ?? 10;
    return Array.from({ length: Math.min(3, limit) }, (_, i) => ({
      keyword: `${keyword} ${i + 1}`,
      search_volume: 0,
      difficulty: null,
      cpc: null,
      competition: null,
      intent: null,
      country: "us",
      language: "en",
    }));
  }

  async getKeywordSuggestions(keyword: string, options?: { limit?: number }) {
    const limit = options?.limit ?? 10;
    return [{ keyword: `${keyword} best`, search_volume: 0 }].slice(0, limit);
  }

  /**
   * Deterministic domain derivation (mock, clearly fake-shaped).
   * Derives sibling topics from the project's own keywords the caller passes
   * via `keyword` seed — no fabricated volumes (always 0 / null).
   */
  async getDomainKeywords(domain: string, options?: { country?: string; language?: string; limit?: number }): Promise<CompetitorKeywordsResult> {
    const clean = domain.toLowerCase().replace(/^www\./, "");
    const topics = ["guide", "pricing", "review", "alternatives", "tutorial"];
    const limit = Math.min(Math.max(options?.limit ?? 10, 1), 50);
    const keywords = topics.slice(0, limit).map((t, i) => ({
      keyword: `${clean} ${t}`,
      search_volume: 0,
      difficulty: null as number | null,
      cpc: null as number | null,
      competition: null as "low" | "medium" | "high" | null,
      intent: null as "informational" | "commercial" | "transactional" | "navigational" | null,
      country: options?.country ?? "us",
      language: options?.language ?? "en",
      position: i + 1,
      url: `https://${clean}/${t}`,
    }));
    return { domain: clean, keywords, total: keywords.length };
  }
}

