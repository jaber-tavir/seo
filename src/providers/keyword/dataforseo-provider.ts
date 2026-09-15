import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import type {
  CompetitorKeywordsResult,
  KeywordData,
  KeywordProvider,
  KeywordSuggestion,
  RelatedKeyword,
} from "./types";

/**
 * DataForSEO keyword provider.
 *
 * Uses the DataForSEO Labs API (keyword ideas endpoint).
 * Credentials come from env (DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD).
 * All metrics returned are real provider values — unavailable fields stay null.
 * Responses are cached (Redis, 24h) by KeywordService.
 *
 * Docs: https://docs.dataforseo.com/v3/dataforseo_labs/
 */

interface LabsKeywordIdea {
  keyword?: string;
  keyword_info?: {
    search_volume?: number | null;
    cpc?: number | null;
    competition?: number | null;
    competition_level?: string | null;
    monthly_searches?: Array<{ year: number; month: number; search_volume: number }> | null;
  };
  keyword_properties?: {
    keyword_difficulty?: number | null;
  };
  search_intent_info?: {
    main_intent?: string | null;
  };
  serp_info?: {
    serp_item_types?: string[] | null;
  };
}

function mapIntent(mainIntent: string | null | undefined): KeywordData["intent"] {
  switch ((mainIntent ?? "").toLowerCase()) {
    case "informational":
      return "informational";
    case "commercial":
      return "commercial";
    case "transactional":
      return "transactional";
    case "navigational":
      return "navigational";
    default:
      return null;
  }
}

function mapCompetition(level: string | null | undefined, score: number | null | undefined): KeywordData["competition"] {
  const normalized = (level ?? "").toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high") return normalized;
  if (typeof score === "number") {
    if (score <= 0.33) return "low";
    if (score <= 0.66) return "medium";
    return "high";
  }
  return null;
}

function mapIdea(item: LabsKeywordIdea, country: string, language: string): RelatedKeyword {
  const info = item.keyword_info ?? {};
  const monthly = info.monthly_searches ?? [];
  return {
    keyword: item.keyword ?? "",
    search_volume: info.search_volume ?? null,
    difficulty: item.keyword_properties?.keyword_difficulty ?? null,
    cpc: info.cpc ?? null,
    competition: mapCompetition(info.competition_level, info.competition),
    intent: mapIntent(item.search_intent_info?.main_intent),
    country,
    language,
    trend: monthly.map((m) => ({
      month: `${m.year}-${String(m.month).padStart(2, "0")}`,
      volume: m.search_volume,
    })),
    serp_features: item.serp_info?.serp_item_types ?? [],
  };
}


async function labsPost<T>(path: string, payload: unknown[]): Promise<T> {
  const login = env.DATAFORSEO_LOGIN;
  const password = env.DATAFORSEO_PASSWORD;
  if (!login || !password) throw new Error("DataForSEO credentials are not configured");
  const auth = Buffer.from(`${login}:${password}`).toString("base64");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
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

interface LabsResponse {
  tasks?: Array<{
    status_code?: number;
    status_message?: string;
    result?: Array<{ items?: LabsKeywordIdea[]; rankedItems?: RankedKeywordItem[] }>;
  }>;
}

interface RankedKeywordItem {
  keyword_data?: {
    keyword?: string;
    keyword_info?: LabsKeywordIdea["keyword_info"];
    keyword_properties?: LabsKeywordIdea["keyword_properties"];
    search_intent_info?: LabsKeywordIdea["search_intent_info"];
  };
  ranked_serp_element?: { serp_item?: { rank_absolute?: number; url?: string } };
}

function rankedToCompetitorKeyword(item: RankedKeywordItem, country: string, language: string) {
  const base = mapIdea(
    {
      keyword: item.keyword_data?.keyword,
      keyword_info: item.keyword_data?.keyword_info,
      keyword_properties: item.keyword_data?.keyword_properties,
      search_intent_info: item.keyword_data?.search_intent_info,
    },
    country,
    language
  );
  return {
    ...base,
    position: item.ranked_serp_element?.serp_item?.rank_absolute ?? null,
    url: item.ranked_serp_element?.serp_item?.url ?? null,
  };
}

export function isDataForSEOConfigured(): boolean {
  return Boolean(env.DATAFORSEO_LOGIN && env.DATAFORSEO_PASSWORD);
}

/** Google location codes for common markets; default US (2840). */
const LOCATION_CODES: Record<string, number> = {
  us: 2840, gb: 2826, de: 2276, fr: 2250, es: 2724, it: 2380, tr: 2792, ca: 2124,
  au: 2036, br: 2076, in: 2356, nl: 2528, se: 2752, pl: 2616,
};

export class DataForSEOKeywordProvider implements KeywordProvider {
  readonly name = "dataforseo";

  /**
   * Real domain-level keywords via DataForSEO Labs "Ranked Keywords" endpoint.
   * Falls back to null-filled rows when a metric is unavailable — never fabricated.
   */
  async getDomainKeywords(domain: string, options?: { country?: string; language?: string; limit?: number }): Promise<CompetitorKeywordsResult> {
    const country = options?.country ?? "us";
    const language = options?.language ?? "en";
    const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);
    const data = await labsPost<LabsResponse>("/v3/dataforseo_labs/google/ranked_keywords/live", [
      {
        target: domain,
        location_code: LOCATION_CODES[country.toLowerCase()] ?? 2840,
        language_code: language,
        limit,
        ignore_synonyms: false,
      },
    ]);
    const task = data.tasks?.[0];
    if (task && task.status_code && task.status_code !== 20000) {
      logger.warn("dataforseo_ranked_keywords_error", { status: task.status_code, message: task.status_message });
      throw new Error(`DataForSEO error: ${task.status_message ?? task.status_code}`);
    }
    const items: RankedKeywordItem[] = task?.result?.[0]?.rankedItems ?? [];
    const keywords = items
      .filter((i) => i.keyword_data?.keyword)
      .map((i) => rankedToCompetitorKeyword(i, country, language))
      .slice(0, limit);
    return { domain, keywords, total: keywords.length };
  }

  private async fetchIdeas(keyword: string, country: string, language: string, limit: number): Promise<RelatedKeyword[]> {
    const data = await labsPost<LabsResponse>("/v3/dataforseo_labs/google/keyword_ideas/live", [
      {
        keyword,
        location_code: LOCATION_CODES[country.toLowerCase()] ?? 2840,
        language_code: language,
        limit: Math.min(Math.max(limit, 1), 100),
        include_serp_info: true,
        include_seed_keyword: true,
      },
    ]);
    const task = data.tasks?.[0];
    if (task && task.status_code && task.status_code !== 20000) {
      logger.warn("dataforseo_keyword_ideas_error", { status: task.status_code, message: task.status_message });
      throw new Error(`DataForSEO error: ${task.status_message ?? task.status_code}`);
    }
    const items = task?.result?.[0]?.items ?? [];
    return items.filter((i) => i.keyword).map((i) => mapIdea(i, country, language));
  }

  async getKeywordData(keyword: string, options?: { country?: string; language?: string }): Promise<KeywordData> {
    const country = options?.country ?? "us";
    const language = options?.language ?? "en";
    const ideas = await this.fetchIdeas(keyword, country, language, 10);
    const exact = ideas.find((i) => i.keyword.toLowerCase() === keyword.toLowerCase()) ?? ideas[0];
    if (!exact) {
      return {
        keyword, search_volume: null, difficulty: null, cpc: null,
        competition: null, intent: null, country, language, trend: [], serp_features: [],
      };
    }
    return exact;
  }

  async getRelatedKeywords(keyword: string, options?: { country?: string; language?: string; limit?: number }): Promise<RelatedKeyword[]> {
    const limit = options?.limit ?? 20;
    const ideas = await this.fetchIdeas(keyword, options?.country ?? "us", options?.language ?? "en", limit);
    return ideas.filter((i) => i.keyword.toLowerCase() !== keyword.toLowerCase()).slice(0, limit);
  }

  async getKeywordSuggestions(keyword: string, options?: { country?: string; language?: string; limit?: number }): Promise<KeywordSuggestion[]> {
    const ideas = await this.getRelatedKeywords(keyword, options);
    const seedWords = keyword.toLowerCase().split(/\s+/).length;
    const longTail = ideas.filter((i) => i.keyword.toLowerCase().split(/\s+/).length >= seedWords + 1);
    const pool = longTail.length > 0 ? longTail : ideas;
    return pool.slice(0, options?.limit ?? 10).map((i) => ({ keyword: i.keyword, search_volume: i.search_volume }));
  }
}
